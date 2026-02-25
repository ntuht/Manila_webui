/**
 * 状态编码器 — GameState → 固定长度浮点张量
 *
 * 设计原则:
 *   - 每个玩家看到的是局部可观测视角（不包含对手暗牌）
 *   - 支持 3~5 人游戏，用固定维度（按最大 5 人分配，不足时零填充）
 *   - 所有数值归一化到 [0, 1] 或 [-1, 1] 区间
 *
 * 观测空间布局 (固定 128 维):
 *   [0]       自己现金 / 200
 *   [1-4]     自己 4 种股票持有量 / 10
 *   [5-8]     自己 4 种股票抵押量 / 10
 *   [9-28]    4 种货物股价 one-hot (5 级 × 4 = 20)
 *   [29-31]   3 艘船位置 / 14  (无船时 = 0)
 *
 * 新增特征 (v2):
 *   [126-129] 4 种货物期望终局增值 (myQty × (E[finalPrice] - curPrice) / 50)
 *   [164-179] 对手分货物持股 (4对手 × 4货物, qty/5)
 *   [180]     自己净资产领先度 (myNW - avgOppNW) / 200
 *   [181]     购股机会标记 (phase=PLACEMENT && isHM ? 1 : 0)
 *   [32-43]   3 艘船 × 4 座位占位 (binary, 1=有人)
 *   [44-46]   3 艘船上自己是否有船员 (binary)
 *   [47]      当前轮次 / 20
 *   [48]      当前掷骰次数 / 3
 *   [49-54]   当前阶段 one-hot (6 phases)
 *   [55]      自己是否是港务长 (binary)
 *   [56-79]   24 个投资槽位占用状态 (binary)
 *   [80-83]   拍卖: 当前最高出价 / 100, 已pass人数 / 5, 自己是否已pass, 是否轮到自己
 *   [84-99]   对手信息: 最多 4 对手 × (cash/200, 股票总数/20, 已抵押数/20, 是否港务长) = 4×4=16
 *   [100-103] 自己的座位投资总成本 / 50 (已花多少钱在各类投资上)
 *   [104-106] 3 艘船上的总船员数 / 4 (归一化)
 *   [107-111] 自己的玩家索引 one-hot (最多 5 人)
 *   [112-127] 保留 (零填充)
 */

import type { GameState, CargoType, PlayerState } from '@manila/engine';
import { ALL_CARGO, SHIPS, STOCK_PRICE_LEVELS, PIRATE_TRIGGER_POSITION } from '@manila/engine';
import { arrivalProbability, estimateRollsRemaining } from '@manila/strategy';
import { ALL_INVESTMENT_SLOTS } from './action-map.js';

export const OBS_DIM = 184;

const PHASE_INDEX: Record<string, number> = {
    AUCTION: 0,
    PLACEMENT: 1,
    INVEST: 2,
    SAIL: 3,
    SETTLE: 4,
    GAME_OVER: 5,
};

const CARGO_INDEX: Record<CargoType, number> = {
    JADE: 0,
    SILK: 1,
    GINSENG: 2,
    NUTMEG: 3,
};

/**
 * 将 GameState 编码为固定长度浮点数组（特定玩家视角）
 *
 * @param state  当前游戏状态
 * @param playerId  观测者的 ID (如 "p0")
 * @returns  OBS_DIM 维浮点数组
 */
export function encodeState(state: GameState, playerId: string): Float32Array {
    const obs = new Float32Array(OBS_DIM); // 自动填 0
    let offset = 0;

    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const playerIndex = state.players.findIndex(p => p.id === playerId);

    // [0] 自己现金
    obs[offset++] = clamp(player.cash / 200);

    // [1-4] 自己 4 种股票持有
    for (const cargo of ALL_CARGO) {
        const stock = player.stocks.find(s => s.cargo === cargo);
        obs[offset++] = clamp((stock?.quantity ?? 0) / 10);
    }

    // [5-8] 自己 4 种股票抵押
    for (const cargo of ALL_CARGO) {
        const stock = player.stocks.find(s => s.cargo === cargo);
        obs[offset++] = clamp((stock?.mortgaged ?? 0) / 10);
    }

    // [9-28] 股价 one-hot (5 级 × 4 货物 = 20)
    for (const cargo of ALL_CARGO) {
        const price = state.stockPrices[cargo] ?? 0;
        const levelIdx = STOCK_PRICE_LEVELS.indexOf(price);
        for (let l = 0; l < 5; l++) {
            obs[offset++] = levelIdx === l ? 1.0 : 0.0;
        }
    }

    // [29-31] 3 艘船位置
    for (let i = 0; i < 3; i++) {
        const ship = state.ships[i];
        obs[offset++] = ship ? clamp(ship.position / 14) : 0.0;
    }

    // [32-43] 3 艘船 × 4 座位占位
    for (let i = 0; i < 3; i++) {
        const ship = state.ships[i];
        for (let seat = 0; seat < 4; seat++) {
            if (ship && ship.crew.some(c => c.seatIndex === seat)) {
                obs[offset++] = 1.0;
            } else {
                obs[offset++] = 0.0;
            }
        }
    }

    // [44-46] 3 艘船上自己是否有船员
    for (let i = 0; i < 3; i++) {
        const ship = state.ships[i];
        obs[offset++] = (ship && ship.crew.some(c => c.playerId === playerId)) ? 1.0 : 0.0;
    }

    // [47] 当前轮次
    obs[offset++] = clamp(state.round / 20);

    // [48] 当前掷骰次数
    obs[offset++] = clamp(state.currentRollIndex / 3);

    // [49-54] 阶段 one-hot
    const phaseIdx = PHASE_INDEX[state.phase] ?? 0;
    for (let i = 0; i < 6; i++) {
        obs[offset++] = phaseIdx === i ? 1.0 : 0.0;
    }

    // [55] 自己是否港务长
    obs[offset++] = state.harborMasterId === playerId ? 1.0 : 0.0;

    // [56-79] 24 个投资槽位占用状态
    for (const slotId of ALL_INVESTMENT_SLOTS) {
        const inv = state.investments.find(i => i.slotId === slotId);
        obs[offset++] = inv ? 1.0 : 0.0;
    }

    // [80-83] 拍卖状态
    if (state.auctionState) {
        const auction = state.auctionState;
        obs[offset++] = clamp(auction.highestBid / 100);
        obs[offset++] = clamp(auction.passedPlayerIds.length / 5);
        obs[offset++] = auction.passedPlayerIds.includes(playerId) ? 1.0 : 0.0;
        obs[offset++] = auction.currentBidderId === playerId ? 1.0 : 0.0;
    } else {
        offset += 4; // 零填充
    }

    // [84-99] 对手信息 (最多 4 个对手, 按座位顺序, 不足零填充)
    const opponents = getOpponentsInOrder(state.players, playerIndex);
    for (let i = 0; i < 4; i++) {
        if (i < opponents.length) {
            const opp = opponents[i];
            obs[offset++] = clamp(opp.cash / 200);
            obs[offset++] = clamp(totalStocks(opp) / 20);
            obs[offset++] = clamp(totalMortgaged(opp) / 20);
            obs[offset++] = state.harborMasterId === opp.id ? 1.0 : 0.0;
        } else {
            offset += 4; // 零填充
        }
    }

    // [100-103] 自己各类投资成本汇总
    let crewCost = 0, officeCost = 0, pirateCost = 0, navCost = 0;
    for (const inv of state.investments) {
        if (inv.playerId !== playerId) continue;
        if (inv.type === 'CREW') crewCost += inv.cost;
        else if (inv.type === 'HARBOR_OFFICE' || inv.type === 'SHIPYARD_OFFICE') officeCost += inv.cost;
        else if (inv.type === 'PIRATE') pirateCost += inv.cost;
        else if (inv.type === 'NAVIGATOR') navCost += inv.cost;
    }
    obs[offset++] = clamp(crewCost / 20);
    obs[offset++] = clamp(officeCost / 20);
    obs[offset++] = clamp(pirateCost / 10);
    obs[offset++] = clamp(navCost / 10);

    // [104-106] 3 艘船总船员数
    for (let i = 0; i < 3; i++) {
        const ship = state.ships[i];
        obs[offset++] = ship ? clamp(ship.crew.length / 4) : 0.0;
    }

    // [107-111] 自己的玩家索引 one-hot (最多 5 人)
    for (let i = 0; i < 5; i++) {
        obs[offset++] = playerIndex === i ? 1.0 : 0.0;
    }

    // [112-115] 海盗状态
    const pirateCaptainInv = state.investments.find(i => i.slotId === 'pirate-captain');
    const pirateCrewInv = state.investments.find(i => i.slotId === 'pirate-crew');
    obs[offset++] = pirateCaptainInv ? 1.0 : 0.0;  // [112] captain occupied
    obs[offset++] = pirateCrewInv ? 1.0 : 0.0;      // [113] crew occupied
    obs[offset++] = pirateCaptainInv?.playerId === playerId ? 1.0 : 0.0;  // [114] self is captain
    obs[offset++] = pirateCrewInv?.playerId === playerId ? 1.0 : 0.0;      // [115] self is crew

    // [116-118] 3 艘船是否在海盗触发位置 (=13)
    for (let i = 0; i < 3; i++) {
        const ship = state.ships[i];
        obs[offset++] = (ship && ship.position === PIRATE_TRIGGER_POSITION) ? 1.0 : 0.0;
    }

    // [119-121] 3 艘船到港概率
    const rollsLeft = estimateRollsRemaining(state);
    for (let i = 0; i < 3; i++) {
        const ship = state.ships[i];
        obs[offset++] = ship ? clamp(arrivalProbability(ship.position, rollsLeft)) : 0.0;
    }

    // [122-125] 4 种货物自己持股比例 (持有量/(持有量+其他人持有量))
    for (const cargo of ALL_CARGO) {
        const myStock = player.stocks.find(s => s.cargo === cargo);
        const myQty = myStock ? myStock.quantity : 0;
        const othersQty = state.players
            .filter(p => p.id !== playerId)
            .reduce((sum, p) => {
                const st = p.stocks.find(s => s.cargo === cargo);
                return sum + (st ? st.quantity : 0);
            }, 0);
        const total = myQty + othersQty;
        obs[offset++] = total > 0 ? clamp(myQty / total) : 0.0;
    }

    // [126-129] 各货物期望终局增值 (持股量 × 预期涨幅 / 50)
    {
        const maxPrice = Math.max(...ALL_CARGO.map(c => state.stockPrices[c] ?? 0));
        const REMAINING_ROUNDS: Record<number, number> = { 0: 6, 5: 5, 10: 3, 20: 1, 30: 0 };
        const futureRounds = REMAINING_ROUNDS[maxPrice] ?? 3;
        const PRICE_LEVELS = [0, 5, 10, 20, 30];
        const P_ADV = 0.45;

        for (const cargo of ALL_CARGO) {
            const myStock = player.stocks.find(s => s.cargo === cargo);
            const myQty = myStock ? myStock.quantity : 0;
            const curPrice = state.stockPrices[cargo] ?? 0;

            if (myQty <= 0) { obs[offset++] = 0; continue; }

            // DP 推算期望终局价
            let startIdx = 0;
            for (let i = PRICE_LEVELS.length - 1; i >= 0; i--) {
                if (curPrice >= PRICE_LEVELS[i]) { startIdx = i; break; }
            }
            let dp = new Array(PRICE_LEVELS.length).fill(0);
            dp[startIdx] = 1.0;
            for (let r = 0; r < futureRounds; r++) {
                const newDp = new Array(PRICE_LEVELS.length).fill(0);
                for (let i = 0; i < PRICE_LEVELS.length; i++) {
                    if (dp[i] === 0) continue;
                    if (i < PRICE_LEVELS.length - 1) {
                        newDp[i] += dp[i] * (1 - P_ADV);
                        newDp[i + 1] += dp[i] * P_ADV;
                    } else {
                        newDp[i] += dp[i];
                    }
                }
                dp = newDp;
            }
            let expectedFinal = 0;
            for (let i = 0; i < PRICE_LEVELS.length; i++) expectedFinal += dp[i] * PRICE_LEVELS[i];

            const expectedGain = myQty * (expectedFinal - curPrice);
            obs[offset++] = clamp(expectedGain / 50);
        }
    }

    // offset is now 130 (after [126-129])

    // [130-133] 各货物剩余股票数 = STOCK_MAX(5) - 已发行总数
    for (const cargo of ALL_CARGO) {
        const totalIssued = state.players.reduce((sum, p) => {
            const st = p.stocks.find(s => s.cargo === cargo);
            return sum + (st ? st.quantity : 0);
        }, 0);
        obs[offset++] = clamp((5 - totalIssued) / 5);
    }

    // [134-149] 对手公开购股记录 (4对手 × 4货物)
    for (let i = 0; i < 4; i++) {
        if (i < opponents.length) {
            const opp = opponents[i];
            const purchases = state.stockPurchaseHistory?.[opp.id];
            for (const cargo of ALL_CARGO) {
                obs[offset++] = purchases ? clamp(purchases[cargo] / 5) : 0.0;
            }
        } else {
            offset += 4;
        }
    }

    // [150-165] 对手排船画像 (4对手 × 4货物, 每个值是该对手最近当港务长时排的位置/5)
    for (let i = 0; i < 4; i++) {
        if (i < opponents.length) {
            const opp = opponents[i];
            const placements = state.playerShipPlacements?.[opp.id];
            for (const cargo of ALL_CARGO) {
                obs[offset++] = placements ? clamp(placements[cargo] / 5) : 0.0;
            }
        } else {
            offset += 4;
        }
    }

    // [166-181] 对手分货物持股 (4对手 × 4货物)
    for (let i = 0; i < 4; i++) {
        if (i < opponents.length) {
            const opp = opponents[i];
            for (const cargo of ALL_CARGO) {
                const st = opp.stocks.find(s => s.cargo === cargo);
                obs[offset++] = clamp((st?.quantity ?? 0) / 5);
            }
        } else {
            offset += 4;
        }
    }

    // [182] 自己净资产领先度
    {
        const myNW = player.cash + player.stocks.reduce((s, st) => s + st.quantity * (state.stockPrices[st.cargo] ?? 0), 0);
        const oppNWs = opponents.map(opp =>
            opp.cash + opp.stocks.reduce((s, st) => s + st.quantity * (state.stockPrices[st.cargo] ?? 0), 0)
        );
        const avgOppNW = oppNWs.length > 0 ? oppNWs.reduce((a, b) => a + b, 0) / oppNWs.length : 0;
        obs[offset++] = clamp((myNW - avgOppNW) / 200, -1, 1);
    }

    // [183] 购股机会标记 (当前是否可以买股票)
    obs[offset++] = (state.phase === 'PLACEMENT' && state.harborMasterId === playerId) ? 1.0 : 0.0;

    return obs;
}

// ==================== 辅助函数 ====================

function clamp(v: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, v));
}

function getOpponentsInOrder(players: PlayerState[], myIndex: number): PlayerState[] {
    const result: PlayerState[] = [];
    for (let i = 1; i < players.length; i++) {
        result.push(players[(myIndex + i) % players.length]);
    }
    return result;
}

function totalStocks(player: PlayerState): number {
    return player.stocks.reduce((sum, s) => sum + s.quantity, 0);
}

function totalMortgaged(player: PlayerState): number {
    return player.stocks.reduce((sum, s) => sum + s.mortgaged, 0);
}
