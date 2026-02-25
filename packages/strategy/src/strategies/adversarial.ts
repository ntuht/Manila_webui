/**
 * 对抗性策略 — 在期望值基础上加入博弈论元素
 *
 * 核心思路：
 * 1. 领航员 — 不只推自己的船，还考虑拉对手的船后退
 * 2. 现金压制 — 限制下家资金，降低其港务长竞拍能力
 * 3. 位置意识 — 评估拍卖中"先手价值"，避免成为最后行动者
 * 4. 抢位封锁 — 占据对手需要的高价值槽位
 * 5. 海盗威胁 — 利用海盗破坏对手的船员投资
 */

import type { GameState, Action, CargoType, PlayerState, Investment } from '@manila/engine';
import { SHIPS, SHIP_DOCK_POSITION, INSURANCE_PENALTIES } from '@manila/engine';
import type { Strategy } from '../strategy.js';

export const adversarialStrategy: Strategy = {
    name: 'adversarial',
    description: '对抗性策略：期望值 + 领航员拉船 + 现金压制 + 位置封锁',

    chooseAction(state: GameState, validActions: Action[]): Action {
        if (validActions.length === 0) throw new Error('没有合法动作');

        const actionType = validActions[0].type;

        switch (actionType) {
            case 'BID':
                return handleBid(state, validActions);
            case 'SELECT_INVESTMENT':
                return handleInvestment(state, validActions);
            case 'PLACE_SHIPS':
                return handlePlacement(state, validActions);
            case 'BUY_STOCK':
            case 'SKIP_BUY_STOCK':
                return handleBuyStock(state, validActions);
            case 'USE_NAVIGATOR':
            case 'SKIP_NAVIGATOR':
                return handleNavigator(state, validActions);
            case 'ROLL_DICE':
                return validActions[0];
            default:
                return validActions[0];
        }
    },
};

// ==================== 概率工具 ====================

function arrivalProbability(position: number, rollsRemaining: number): number {
    if (position >= SHIP_DOCK_POSITION) return 1;
    if (rollsRemaining <= 0) return 0;

    const distNeeded = SHIP_DOCK_POSITION - position;
    const totalMean = rollsRemaining * 3.5;
    const totalStd = Math.sqrt(rollsRemaining * (35 / 12));

    if (totalStd === 0) return totalMean >= distNeeded ? 1 : 0;

    const z = (distNeeded - totalMean) / totalStd;
    return 1 - normalCDF(z);
}

function normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
}

function probAtLeastK(probs: number[], k: number): number {
    let sum = 0;
    for (let j = k; j <= probs.length; j++) sum += probExactlyK(probs, j);
    return sum;
}

function probExactlyK(probs: number[], k: number): number {
    const n = probs.length;
    if (k < 0 || k > n) return 0;
    let dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 0; i < n; i++) {
        const newDp = new Array(n + 1).fill(0);
        for (let j = 0; j <= i; j++) {
            newDp[j] += dp[j] * (1 - probs[i]);
            newDp[j + 1] += dp[j] * probs[i];
        }
        dp = newDp;
    }
    return dp[k];
}

function estimateRollsRemaining(state: GameState): number {
    const diceSteps = state.roundSteps.filter(s => s.type === 'DICE');
    return Math.max(0, diceSteps.length - state.diceHistory.length);
}

// ==================== 对手分析 ====================

/** 获取对手列表 */
function getOpponents(state: GameState, myId: string): PlayerState[] {
    return state.players.filter(p => p.id !== myId);
}

/** 计算下家 ID（拍卖顺序中的下一个玩家） */
function getNextPlayerId(state: GameState, myId: string): string {
    const myIdx = state.players.findIndex(p => p.id === myId);
    const nextIdx = (myIdx + 1) % state.players.length;
    return state.players[nextIdx].id;
}

/** 计算对手在某船的投资金额 */
function opponentCrewValue(state: GameState, cargo: CargoType, myId: string): number {
    return state.investments
        .filter(inv => inv.type === 'CREW' && inv.slotId.startsWith(`crew-${cargo}-`) && inv.playerId !== myId)
        .reduce((sum, inv) => sum + inv.cost, 0);
}

/** 计算对手可能从某船获得的奖励 */
function opponentExpectedReward(
    state: GameState, cargo: CargoType, myId: string, rollsLeft: number
): number {
    const ship = state.ships.find(s => s.cargo === cargo);
    if (!ship) return 0;

    const opponentCrew = ship.crew.filter(c => c.playerId !== myId);
    if (opponentCrew.length === 0) return 0;

    const prob = arrivalProbability(ship.position, rollsLeft);
    const totalCrew = ship.crew.length;
    const rewardPerSeat = SHIPS[cargo].totalReward / totalCrew;

    return prob * rewardPerSeat * opponentCrew.length;
}

// ==================== 决策处理 ====================

// ---- 拍卖 ----

function handleBid(state: GameState, actions: Action[]): Action {
    const bidAction = actions.find(a => a.type === 'BID');
    const passAction = actions.find(a => a.type === 'PASS_AUCTION');

    if (!bidAction) return passAction ?? actions[0];

    const minBid = bidAction.data.minBid as number;
    const player = state.players.find(p => p.id === bidAction.playerId)!;

    // === 对抗性拍卖估值 ===
    // 基础价值：先手投资 + 购股权 + 布置权
    let harborMasterValue = 8;

    // 加成 1：如果我现金充裕，港务长价值更高（更多投资选择）
    if (player.cash > 40) harborMasterValue += 3;

    // 加成 2：如果下家现金少，我更容易当港务长，不用出高价
    const nextPlayer = state.players.find(p => p.id === getNextPlayerId(state, player.id))!;
    if (nextPlayer.cash < 15) harborMasterValue += 2; // 下家穷，竞争小

    // 加成 3：后续轮次港务长价值递增（股价已累积）
    if (state.round >= 2) harborMasterValue += 2;

    // 现金压制：如果出价能让对手资金紧张，适当抬价
    const opponents = getOpponents(state, player.id);
    const poorestOpponent = Math.min(...opponents.map(o => o.cash));
    if (minBid > poorestOpponent * 0.6 && minBid <= harborMasterValue) {
        // 对手难以跟价，值得出价
        harborMasterValue += 2;
    }

    if (minBid > harborMasterValue || minBid > player.cash * 0.5) {
        return passAction ?? actions[0];
    }

    // 出价策略：不是出最低价，而是出到让对手难以跟进
    const strategicBid = Math.min(
        minBid + 1,                               // 略高于最低
        Math.floor(poorestOpponent * 0.5),         // 穷对手的困难线
        Math.floor(harborMasterValue),             // 不超过估值
        player.cash - 10                           // 保留投资资金
    );
    const finalBid = Math.max(minBid, strategicBid);

    return { ...bidAction, data: { ...bidAction.data, amount: finalBid } };
}

// ---- 投资 ----

function handleInvestment(state: GameState, actions: Action[]): Action {
    const rollsLeft = estimateRollsRemaining(state);
    const myId = actions[0].playerId;
    const myPlayer = state.players.find(p => p.id === myId)!;

    const scored = actions.map(action => {
        const slotId = action.data.slotId as string;
        const cost = action.data.cost as number;

        // 自身收益
        const selfEV = calculateSelfEV(state, slotId, cost, rollsLeft);

        // 对手损害值：占据这个槽位对对手的影响
        const opponentDamage = calculateOpponentDamage(state, slotId, myId, rollsLeft);

        // 封锁价值：如果对手特别需要这个位置
        const blockValue = calculateBlockValue(state, slotId, myId, rollsLeft);

        // 现金压制：花钱后下家是否更难竞争
        const cashPressure = calculateCashPressure(state, myId, cost);

        // 综合得分 = 自身净收益 + 0.5×对手损害 + 0.3×封锁价值 + 0.2×现金压制
        const totalScore = (selfEV - cost)
            + 0.5 * opponentDamage
            + 0.3 * blockValue
            + 0.2 * cashPressure;

        return { action, totalScore, selfEV, opponentDamage, blockValue };
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    return scored[0].action;
}

function calculateSelfEV(
    state: GameState, slotId: string, cost: number, rollsLeft: number
): number {
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1] as CargoType;
        const ship = state.ships.find(s => s.cargo === cargo);
        if (!ship) return 0;
        const prob = arrivalProbability(ship.position, rollsLeft);
        const totalCrew = ship.crew.length + 1;
        return prob * (SHIPS[cargo].totalReward / totalCrew);
    }

    if (slotId.startsWith('harbor-')) {
        const minShips: Record<string, number> = { 'harbor-A': 1, 'harbor-B': 2, 'harbor-C': 3 };
        const rewards: Record<string, number> = { 'harbor-A': 6, 'harbor-B': 8, 'harbor-C': 15 };
        const probs = state.ships.map(s => arrivalProbability(s.position, rollsLeft));
        return probAtLeastK(probs, minShips[slotId] ?? 1) * (rewards[slotId] ?? 6);
    }

    if (slotId.startsWith('shipyard-')) {
        const minShips: Record<string, number> = { 'shipyard-A': 1, 'shipyard-B': 2, 'shipyard-C': 3 };
        const rewards: Record<string, number> = { 'shipyard-A': 6, 'shipyard-B': 8, 'shipyard-C': 15 };
        const probs = state.ships.map(s => 1 - arrivalProbability(s.position, rollsLeft));
        return probAtLeastK(probs, minShips[slotId] ?? 1) * (rewards[slotId] ?? 6);
    }

    if (slotId === 'insurance') {
        const failProbs = state.ships.map(s => 1 - arrivalProbability(s.position, rollsLeft));
        let expectedPenalty = 0;
        for (let k = 0; k <= 3; k++) expectedPenalty += probExactlyK(failProbs, k) * INSURANCE_PENALTIES[k];
        return 10 - expectedPenalty;
    }

    if (slotId === 'navigator-big') return 4;  // 对抗性策略更看重领航员
    if (slotId === 'navigator-small') return 2.5;
    if (slotId.startsWith('pirate-')) return 3; // 海盗的威胁价值
    return 0;
}

/** 计算占据某槽位对对手造成的损害 */
function calculateOpponentDamage(
    state: GameState, slotId: string, myId: string, rollsLeft: number
): number {
    // 如果这是船员位：对手就少一个高价值位置
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1] as CargoType;
        const ship = state.ships.find(s => s.cargo === cargo);
        if (!ship) return 0;

        // 如果对手已经在这船上有船员，我加入会稀释他们的奖励
        const opponentCrew = ship.crew.filter(c => c.playerId !== myId);
        if (opponentCrew.length > 0) {
            const probArrival = arrivalProbability(ship.position, rollsLeft);
            const currentReward = SHIPS[cargo].totalReward / ship.crew.length;
            const newReward = SHIPS[cargo].totalReward / (ship.crew.length + 1);
            // 对手每人减少的收益
            const dilution = (currentReward - newReward) * opponentCrew.length * probArrival;
            return dilution;
        }
        return 0;
    }

    // 领航员：如果我拿了，对手就不能操控船位
    if (slotId === 'navigator-big') return 3;
    if (slotId === 'navigator-small') return 1.5;

    // 保险：免费位置，抢了对手就没有
    if (slotId === 'insurance') return 5;

    return 0;
}

/** 计算封锁价值 — 对手是否特别需要这个位置 */
function calculateBlockValue(
    state: GameState, slotId: string, myId: string, rollsLeft: number
): number {
    if (!slotId.startsWith('crew-')) return 0;

    const parts = slotId.split('-');
    const cargo = parts[1] as CargoType;
    const ship = state.ships.find(s => s.cargo === cargo);
    if (!ship) return 0;

    // 如果这船到港概率高（>60%），且对手还没上船，这个位置很有价值
    const prob = arrivalProbability(ship.position, rollsLeft);
    if (prob < 0.4) return 0;

    // 检查对手是否在这船上有投资
    const opponentCrew = ship.crew.filter(c => c.playerId !== myId);
    // 如果对手已经在船上，他可能想加更多人 → 封锁价值高
    if (opponentCrew.length > 0) {
        return prob * 3;
    }

    return 0;
}

/** 现金压制价值 — 花钱后对下家的竞争影响 */
function calculateCashPressure(state: GameState, myId: string, cost: number): number {
    // 这个策略考虑的不是"我花了钱"的影响，而是
    // "如果我不花这笔钱，是否会让下家更容易竞争"
    // 实际上反向思考：花小成本的投资不如花大成本的投资有"压制感"
    // 但花太多也不行（自己没钱了）

    // 简化：如果这笔投资让我剩余资金仍然 > 下家资金，有正向压制
    const myPlayer = state.players.find(p => p.id === myId)!;
    const nextId = getNextPlayerId(state, myId);
    const nextPlayer = state.players.find(p => p.id === nextId)!;

    const myRemainingCash = myPlayer.cash - cost;
    if (myRemainingCash > nextPlayer.cash) {
        return 1; // 小正向分
    }
    if (myRemainingCash < nextPlayer.cash * 0.5) {
        return -2; // 花太多会让自己处于劣势
    }
    return 0;
}

// ---- 领航员（核心对抗点） ----

function handleNavigator(state: GameState, actions: Action[]): Action {
    const rollsLeft = estimateRollsRemaining(state);
    const navActions = actions.filter(a => a.type === 'USE_NAVIGATOR');
    const skipAction = actions.find(a => a.type === 'SKIP_NAVIGATOR');

    if (navActions.length === 0) return skipAction ?? actions[0];

    const myId = navActions[0].playerId;

    // 评估每个操作的综合价值（自身收益 + 对手损害）
    const scored = navActions.map(action => {
        const cargo = action.data.cargo as CargoType;
        const delta = action.data.delta as number;
        const ship = state.ships.find(s => s.cargo === cargo);
        if (!ship) return { action, score: -100 };

        const myCrew = ship.crew.filter(c => c.playerId === myId);
        const opponentCrew = ship.crew.filter(c => c.playerId !== myId);

        const probBefore = arrivalProbability(ship.position, rollsLeft);
        const probAfter = arrivalProbability(ship.position + delta, rollsLeft);
        const probDelta = probAfter - probBefore;

        let score = 0;

        if (delta > 0) {
            // === 推船前进 ===
            // 我的船员收益增加
            if (myCrew.length > 0) {
                const myRewardDelta = probDelta * (SHIPS[cargo].totalReward / ship.crew.length) * myCrew.length;
                score += myRewardDelta;
            }
            // 但如果对手也在船上，他们也受益 → 减分
            if (opponentCrew.length > 0) {
                const oppRewardDelta = probDelta * (SHIPS[cargo].totalReward / ship.crew.length) * opponentCrew.length;
                score -= oppRewardDelta * 0.5; // 对手收益算半权重
            }
        } else {
            // === 拉船后退 ===
            // 如果对手在这船上而我不在 → 纯粹损害对手
            if (opponentCrew.length > 0 && myCrew.length === 0) {
                const oppLoss = -probDelta * (SHIPS[cargo].totalReward / ship.crew.length) * opponentCrew.length;
                score += oppLoss; // 对手损失 = 我的收益
            }
            // 如果我也在船上 → 损人不利己，通常不值得
            if (myCrew.length > 0) {
                const myLoss = -probDelta * (SHIPS[cargo].totalReward / ship.crew.length) * myCrew.length;
                score -= myLoss * 2; // 自己损失权重更高
            }

            // === 修船厂办事处联动 ===
            // 如果我投了修船厂，拉船后退让更多船进修船厂
            const myShipyardInvestments = state.investments.filter(
                inv => inv.playerId === myId && inv.type === 'SHIPYARD_OFFICE'
            );
            if (myShipyardInvestments.length > 0) {
                score += Math.abs(probDelta) * 5; // 修船厂收益加成
            }

            // === 港口办事处联动（对手的） ===
            // 如果对手投了港口办事处，拉船后退让他的办事处奖励变差
            const oppHarborInvestments = state.investments.filter(
                inv => inv.playerId !== myId && inv.type === 'HARBOR_OFFICE'
            );
            if (oppHarborInvestments.length > 0) {
                score += Math.abs(probDelta) * 3; // 破坏对手港口办事处
            }
        }

        return { action, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // 如果最佳操作得分 <= 0，跳过
    if (scored[0].score <= 0) return skipAction ?? actions[0];

    return scored[0].action;
}

// ---- 布置 ----

function handlePlacement(state: GameState, actions: Action[]): Action {
    const action = actions[0];
    // 策略性布置：高价值船给高位置，提高自己的先手投资优势
    return {
        ...action,
        data: {
            cargos: ['JADE', 'SILK', 'NUTMEG'] as CargoType[],
            positions: { JADE: 4, SILK: 3, NUTMEG: 2, GINSENG: 0 },
        },
    };
}

// ---- 购股 ----

function handleBuyStock(state: GameState, actions: Action[]): Action {
    const buyActions = actions.filter(a => a.type === 'BUY_STOCK');
    const skipAction = actions.find(a => a.type === 'SKIP_BUY_STOCK');

    if (buyActions.length === 0) return skipAction ?? actions[0];

    const myId = buyActions[0].playerId;

    // 优先买我布置的船对应的货物（因为我控制位置，更可能到港）
    const myShipCargos = state.ships.map(s => s.cargo);
    const preferred = buyActions.filter(a => myShipCargos.includes(a.data.cargo as CargoType));

    if (preferred.length > 0) {
        // 买股价最低的偏好股票
        preferred.sort((a, b) => (a.data.price as number) - (b.data.price as number));
        return preferred[0];
    }

    // 否则买最便宜的
    buyActions.sort((a, b) => (a.data.price as number) - (b.data.price as number));

    // 如果价格太高，跳过
    if ((buyActions[0].data.price as number) > 8) {
        return skipAction ?? actions[0];
    }

    return buyActions[0];
}
