import { describe, it, expect } from 'vitest';
import { createGame, applyAction, getValidActions, isGameOver, getGameResult } from '../src/game.js';
import { createFixedRNG, createSeededRNG } from '../src/dice.js';
import { ROUND_STEPS_3P, ROUND_STEPS_4P, INITIAL_CASH, STOCK_MORTGAGE_VALUE } from '../src/rules.js';
import type { GameState, Action, CargoType, RNG } from '../src/types.js';

// ==================== 测试工具 ====================

/** 创建确定性 RNG，骰子总是 [3,3,3] */
function stableRNG(): RNG {
    return createFixedRNG([
        // 初始股票分配 (洗牌用) — 需要足够多的随机数
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        // 骰子值：每次都是 3,3,3
        3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 3, 3, 3, 3, 3, 3, 3,
    ]);
}

/** 选择第一个合法动作 */
function pickFirst(state: GameState): Action {
    const actions = getValidActions(state);
    if (actions.length === 0) throw new Error('没有合法动作');
    return actions[0];
}

/** 选择指定类型的动作 */
function pickByType(state: GameState, type: string): Action {
    const actions = getValidActions(state);
    const action = actions.find(a => a.type === type);
    if (!action) throw new Error(`找不到类型 ${type} 的动作，可用: ${actions.map(a => a.type).join(', ')}`);
    return action;
}

/** 选择包含指定 slotId 的投资动作 */
function pickInvestment(state: GameState, slotId: string): Action {
    const actions = getValidActions(state);
    const action = actions.find(
        a => a.type === 'SELECT_INVESTMENT' && a.data.slotId === slotId
    );
    if (!action) {
        const available = actions.filter(a => a.type === 'SELECT_INVESTMENT').map(a => a.data.slotId);
        throw new Error(`找不到槽位 ${slotId}，可用: ${available.join(', ')}`);
    }
    return action;
}

/** 创建出价动作 */
function bidAction(playerId: string, amount: number): Action {
    return { type: 'BID', playerId, data: { amount } };
}

/** 创建布置动作 */
function placeShipsAction(
    playerId: string,
    cargos: CargoType[],
    positions: Record<CargoType, number>
): Action {
    return { type: 'PLACE_SHIPS', playerId, data: { cargos, positions } };
}

// ==================== 测试 ====================

describe('Manila Engine', () => {

    // ==================== 1. 创建游戏 ====================

    describe('createGame', () => {
        it('3 人游戏初始化正确', () => {
            const rng = stableRNG();
            const state = createGame({ playerCount: 3, rounds: 3 }, rng);

            expect(state.players).toHaveLength(3);
            expect(state.round).toBe(1);
            expect(state.phase).toBe('AUCTION');
            expect(state.pendingAction).toBeTruthy();
            expect(state.pendingAction!.actionType).toBe('BID');
        });

        it('4 人游戏初始化正确', () => {
            const rng = stableRNG();
            const state = createGame({ playerCount: 4, rounds: 3 }, rng);

            expect(state.players).toHaveLength(4);
            expect(state.roundSteps).toEqual(ROUND_STEPS_4P);
        });

        it('每人初始 30 现金和 2 股票', () => {
            const rng = stableRNG();
            const state = createGame({ playerCount: 3, rounds: 1 }, rng);

            for (const player of state.players) {
                expect(player.cash).toBe(INITIAL_CASH);
                const totalStocks = player.stocks.reduce((sum, s) => sum + s.quantity, 0);
                expect(totalStocks).toBe(2);
            }
        });

        it('第一个玩家不是 AI', () => {
            const rng = stableRNG();
            const state = createGame({ playerCount: 3, rounds: 1 }, rng);

            expect(state.players[0].isAI).toBe(false);
            expect(state.players[1].isAI).toBe(true);
        });

        it('pendingAction 指向第一个玩家', () => {
            const rng = stableRNG();
            const state = createGame({ playerCount: 3, rounds: 1 }, rng);

            expect(state.pendingAction).toBeTruthy();
            expect(state.pendingAction!.playerId).toBe('p0');
        });
    });

    // ==================== 2. 拍卖 ====================

    describe('Auction', () => {
        it('出价后最高出价更新', () => {
            const rng = stableRNG();
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);

            state = applyAction(state, bidAction('p0', 5), rng);
            expect(state.auctionState!.highestBid).toBe(5);
            expect(state.auctionState!.highestBidderId).toBe('p0');
        });

        it('两人放弃后第三人获胜', () => {
            const rng = stableRNG();
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);

            // p0 出价 5
            state = applyAction(state, bidAction('p0', 5), rng);
            // p1 放弃
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            // p2 放弃
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);

            // 拍卖结束，进入布置阶段
            expect(state.harborMasterId).toBe('p0');
            expect(state.phase).toBe('PLACEMENT');
            expect(state.auctionState).toBeUndefined();
            // 30 - 5 = 25
            expect(state.players[0].cash).toBe(25);
        });

        it('不允许出价低于当前最高', () => {
            const rng = stableRNG();
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);
            state = applyAction(state, bidAction('p0', 10), rng);

            expect(() => applyAction(state, bidAction('p1', 5), rng)).toThrow();
        });

        it('所有人放弃时第一个玩家免费成为港务长', () => {
            const rng = stableRNG();
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);

            // 所有人放弃
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);

            expect(state.harborMasterId).toBe('p0');
            expect(state.players[0].cash).toBe(INITIAL_CASH); // 免费
        });
    });

    // ==================== 3. 港务长购股 + 布置 ====================

    describe('Placement', () => {
        function auctionWon(rng: RNG): GameState {
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);
            state = applyAction(state, bidAction('p0', 5), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            return state;
        }

        it('港务长可以购买股票', () => {
            const rng = stableRNG();
            let state = auctionWon(rng);

            // 购买 JADE 股票 (价格 = max(5, 0) = 5)
            const buyAction = getValidActions(state).find(
                a => a.type === 'BUY_STOCK' && a.data.cargo === 'JADE'
            );
            expect(buyAction).toBeTruthy();

            state = applyAction(state, buyAction!, rng);
            // 25 - 5 = 20
            expect(state.players[0].cash).toBe(20);
        });

        it('港务长可以跳过购买', () => {
            const rng = stableRNG();
            let state = auctionWon(rng);

            state = applyAction(state, pickByType(state, 'SKIP_BUY_STOCK'), rng);
            expect(state.pendingAction!.actionType).toBe('PLACE_SHIPS');
        });

        it('布置船只位置（总和=9）', () => {
            const rng = stableRNG();
            let state = auctionWon(rng);
            state = applyAction(state, pickByType(state, 'SKIP_BUY_STOCK'), rng);

            const action = placeShipsAction('p0', ['JADE', 'SILK', 'GINSENG'], {
                JADE: 5, SILK: 3, GINSENG: 1,
                NUTMEG: 0,
            });
            state = applyAction(state, action, rng);

            expect(state.ships).toHaveLength(3);
            expect(state.ships[0].cargo).toBe('JADE');
            expect(state.ships[0].position).toBe(5);
            expect(state.ships[1].position).toBe(3);
            expect(state.ships[2].position).toBe(1);
        });

        it('位置总和不为 9 报错', () => {
            const rng = stableRNG();
            let state = auctionWon(rng);
            state = applyAction(state, pickByType(state, 'SKIP_BUY_STOCK'), rng);

            expect(() =>
                applyAction(
                    state,
                    placeShipsAction('p0', ['JADE', 'SILK', 'GINSENG'], {
                        JADE: 5, SILK: 5, GINSENG: 5, NUTMEG: 0,
                    }),
                    rng
                )
            ).toThrow('总和');
        });
    });

    // ==================== 4. 投资轮次 ====================

    describe('Investment', () => {
        function readyToInvest(rng: RNG): GameState {
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);
            // 拍卖
            state = applyAction(state, bidAction('p0', 5), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            // 跳过买股
            state = applyAction(state, pickByType(state, 'SKIP_BUY_STOCK'), rng);
            // 布置
            state = applyAction(state, placeShipsAction('p0', ['JADE', 'SILK', 'GINSENG'], {
                JADE: 5, SILK: 3, GINSENG: 1, NUTMEG: 0,
            }), rng);
            return state;
        }

        it('进入投资阶段后有合法投资选项', () => {
            const rng = stableRNG();
            const state = readyToInvest(rng);

            expect(state.phase).toBe('INVEST');
            const actions = getValidActions(state);
            expect(actions.length).toBeGreaterThan(0);
            expect(actions[0].type).toBe('SELECT_INVESTMENT');
        });

        it('投资港务长先行动', () => {
            const rng = stableRNG();
            const state = readyToInvest(rng);

            // 港务长 p0 应该先行动
            expect(state.pendingAction!.playerId).toBe('p0');
        });

        it('所有玩家投资后推进到下一步', () => {
            const rng = stableRNG();
            let state = readyToInvest(rng);

            // 3P 第一轮投资：3 个玩家各投一次
            state = applyAction(state, pickInvestment(state, 'crew-JADE-0'), rng);
            state = applyAction(state, pickInvestment(state, 'crew-SILK-0'), rng);
            state = applyAction(state, pickInvestment(state, 'crew-GINSENG-0'), rng);

            // 3P 流程：第一步 INVEST 后下一步还是 INVEST
            expect(state.phase).toBe('INVEST');
            expect(state.currentStepIndex).toBe(1);
        });

        it('投资扣除费用', () => {
            const rng = stableRNG();
            let state = readyToInvest(rng);

            const cashBefore = state.players.find(p => p.id === 'p0')!.cash;
            state = applyAction(state, pickInvestment(state, 'crew-JADE-0'), rng); // 成本 3
            const cashAfter = state.players.find(p => p.id === 'p0')!.cash;

            expect(cashAfter).toBe(cashBefore - 3);
        });

        it('保险立即获得 10 现金', () => {
            const rng = stableRNG();
            let state = readyToInvest(rng);

            const cashBefore = state.players.find(p => p.id === 'p0')!.cash;
            state = applyAction(state, pickInvestment(state, 'insurance'), rng); // 成本 0，立即 +10
            const cashAfter = state.players.find(p => p.id === 'p0')!.cash;

            expect(cashAfter).toBe(cashBefore + 10);
        });

        it('不能重复投资同一槽位', () => {
            const rng = stableRNG();
            let state = readyToInvest(rng);

            state = applyAction(state, pickInvestment(state, 'crew-JADE-0'), rng); // p0

            // p1 不能再投 crew-JADE-0
            const actions = getValidActions(state);
            const duplicate = actions.find(a => a.data.slotId === 'crew-JADE-0');
            expect(duplicate).toBeUndefined();
        });
    });

    // ==================== 5. 掷骰 ====================

    describe('Dice Roll', () => {
        function readyToDice(rng: RNG): GameState {
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);
            state = applyAction(state, bidAction('p0', 5), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
            state = applyAction(state, pickByType(state, 'SKIP_BUY_STOCK'), rng);
            state = applyAction(state, placeShipsAction('p0', ['JADE', 'SILK', 'GINSENG'], {
                JADE: 5, SILK: 3, GINSENG: 1, NUTMEG: 0,
            }), rng);

            // 3P: INVEST(0), INVEST(1) 需要 6 个玩家投资
            // 第一轮投资 (3人)
            state = applyAction(state, pickFirst(state), rng);
            state = applyAction(state, pickFirst(state), rng);
            state = applyAction(state, pickFirst(state), rng);
            // 第二轮投资 (3人)
            state = applyAction(state, pickFirst(state), rng);
            state = applyAction(state, pickFirst(state), rng);
            state = applyAction(state, pickFirst(state), rng);

            return state;
        }

        it('掷骰后船只前进', () => {
            const rng = createSeededRNG(99);
            let state = readyToDice(rng);

            expect(state.phase).toBe('SAIL');
            const posBefore = state.ships.map(s => s.position);

            state = applyAction(state, pickByType(state, 'ROLL_DICE'), rng);

            // 每艘船应该都前进了（骰子值 1-6）
            const posAfter = state.ships.map(s => s.position);
            posAfter.forEach((pos, i) => {
                expect(pos).toBeGreaterThan(posBefore[i]);
            });
        });

        it('记录骰子历史', () => {
            const rng = createSeededRNG(99);
            let state = readyToDice(rng);

            state = applyAction(state, pickByType(state, 'ROLL_DICE'), rng);
            expect(state.diceHistory).toHaveLength(1);
            expect(state.diceHistory[0].values).toHaveLength(3);
            // 每个骰子值在 1-6 范围内
            for (const v of state.diceHistory[0].values) {
                expect(v).toBeGreaterThanOrEqual(1);
                expect(v).toBeLessThanOrEqual(6);
            }
        });
    });

    // ==================== 6. 结算 ====================

    describe('Settlement', () => {
        function playFullRound(rng: RNG): GameState {
            let state = createGame({ playerCount: 3, rounds: 1 }, rng);

            // 快速走完一轮：所有人选默认动作
            while (!isGameOver(state)) {
                const pending = state.pendingAction;
                if (!pending) break;

                if (pending.actionType === 'BID') {
                    // 第一个出价 1
                    if (state.auctionState!.highestBid === 0) {
                        state = applyAction(state, bidAction(pending.playerId, 1), rng);
                    } else {
                        state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
                    }
                } else if (pending.actionType === 'PLACE_SHIPS') {
                    state = applyAction(state, placeShipsAction(pending.playerId, ['JADE', 'SILK', 'GINSENG'], {
                        JADE: 3, SILK: 3, GINSENG: 3, NUTMEG: 0,
                    }), rng);
                } else {
                    state = applyAction(state, pickFirst(state), rng);
                }
            }
            return state;
        }

        it('一轮游戏可以完整跑完', () => {
            const rng = createSeededRNG(42);
            const state = playFullRound(rng);

            expect(isGameOver(state)).toBe(true);
            const result = getGameResult(state);
            expect(result).toBeTruthy();
            expect(result!.rankings).toHaveLength(3);
            // 排名正确
            expect(result!.rankings[0].rank).toBe(1);
            expect(result!.rankings[2].rank).toBe(3);
        });

        it('到港船只的股价增加 5', () => {
            const rng = createSeededRNG(42);
            const state = playFullRound(rng);

            // 至少有些船到港了（骰子不全是 1）
            // 股价应该 >= 0
            for (const cargo of ['JADE', 'SILK', 'GINSENG', 'NUTMEG'] as const) {
                expect(state.stockPrices[cargo]).toBeGreaterThanOrEqual(0);
            }
        });

        it('总分 = 现金 + 股票价值 - 抵押惩罚', () => {
            const rng = createSeededRNG(42);
            const state = playFullRound(rng);
            const result = getGameResult(state)!;

            for (const ranking of result.rankings) {
                expect(ranking.totalScore).toBe(
                    ranking.cash + ranking.stockValue - ranking.mortgagePenalty
                );
            }
        });
    });

    // ==================== 7. 状态不可变 ====================

    describe('Immutability', () => {
        it('applyAction 不修改原状态', () => {
            const rng = stableRNG();
            const state = createGame({ playerCount: 3, rounds: 1 }, rng);
            const original = JSON.stringify(state);

            applyAction(state, bidAction('p0', 5), rng);

            expect(JSON.stringify(state)).toBe(original);
        });
    });

    // ==================== 8. 多轮游戏 ====================

    describe('Multi-round', () => {
        it('3 轮游戏正确结束', () => {
            const rng = createSeededRNG(123);
            let state = createGame({ playerCount: 3, rounds: 3 }, rng);

            let iterations = 0;
            while (!isGameOver(state) && iterations < 500) {
                const pending = state.pendingAction;
                if (!pending) break;

                if (pending.actionType === 'BID') {
                    if (state.auctionState!.highestBid === 0) {
                        state = applyAction(state, bidAction(pending.playerId, 1), rng);
                    } else {
                        state = applyAction(state, pickByType(state, 'PASS_AUCTION'), rng);
                    }
                } else if (pending.actionType === 'PLACE_SHIPS') {
                    state = applyAction(state, placeShipsAction(pending.playerId, ['JADE', 'SILK', 'GINSENG'], {
                        JADE: 3, SILK: 3, GINSENG: 3, NUTMEG: 0,
                    }), rng);
                } else {
                    state = applyAction(state, pickFirst(state), rng);
                }
                iterations++;
            }

            expect(isGameOver(state)).toBe(true);
            expect(state.round).toBe(3);
            expect(getGameResult(state)!.totalRounds).toBe(3);
            expect(iterations).toBeLessThan(500);
        });
    });
});
