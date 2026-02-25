/**
 * 期望值策略 — 基于概率计算的投资决策
 * 拍卖时评估港务长价值，投资时计算期望收益
 */

import type { GameState, Action, CargoType } from '@manila/engine';
import { SHIPS, SHIP_DOCK_POSITION, INSURANCE_PENALTIES } from '@manila/engine';
import type { Strategy } from '../strategy.js';

export const expectedValueStrategy: Strategy = {
    name: 'expected-value',
    description: '期望值策略：基于概率计算投资回报',

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

// ==================== 概率计算 ====================

/**
 * 计算船只到港概率
 * 基于剩余骰子次数和当前位置，用正态近似
 */
function arrivalProbability(position: number, rollsRemaining: number): number {
    if (position >= SHIP_DOCK_POSITION) return 1;
    if (rollsRemaining <= 0) return 0;

    const distNeeded = SHIP_DOCK_POSITION - position;
    // 每次骰子 1-6, 均值 3.5, 方差 35/12 ≈ 2.917
    const totalMean = rollsRemaining * 3.5;
    const totalVariance = rollsRemaining * (35 / 12);
    const totalStd = Math.sqrt(totalVariance);

    if (totalStd === 0) return totalMean >= distNeeded ? 1 : 0;

    // P(X >= distNeeded) 用正态 CDF 近似
    const z = (distNeeded - totalMean) / totalStd;
    return 1 - normalCDF(z);
}

function normalCDF(z: number): number {
    // 近似正态分布 CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
}

function estimateRollsRemaining(state: GameState): number {
    const diceSteps = state.roundSteps.filter(s => s.type === 'DICE');
    const diceCompleted = state.diceHistory.length;
    return Math.max(0, diceSteps.length - diceCompleted);
}

// ==================== 决策处理 ====================

function handleBid(state: GameState, actions: Action[]): Action {
    const bidAction = actions.find(a => a.type === 'BID');
    const passAction = actions.find(a => a.type === 'PASS_AUCTION');

    if (!bidAction) return passAction ?? actions[0];

    const minBid = bidAction.data.minBid as number;
    const player = state.players.find(p => p.id === bidAction.playerId)!;

    // 估算港务长价值：先手投资(3) + 购股权(6-8) + 布置权(3-5)
    // 真实对局 bid 常达 20+, 港务长价值远超简单估算
    const harborMasterValue = 14;

    if (minBid > harborMasterValue || minBid > player.cash * 0.6) {
        return passAction ?? actions[0];
    }

    return { ...bidAction, data: { ...bidAction.data, amount: minBid } };
}

function handleInvestment(state: GameState, actions: Action[]): Action {
    const rollsLeft = estimateRollsRemaining(state);

    const scored = actions.map(action => {
        // SKIP_INVEST 和其他非投资动作: EV = 0, cost = 0
        if (action.type !== 'SELECT_INVESTMENT') {
            return { action, ev: 0, net: 0 };
        }
        const slotId = action.data.slotId as string;
        const cost = action.data.cost as number;
        const ev = calculateExpectedValue(state, slotId, cost, rollsLeft);
        return { action, ev, net: ev - cost };
    });

    // 选择净期望值最高的
    scored.sort((a, b) => b.net - a.net);

    // 如果最高净期望值 < 0，选最不差的
    return scored[0].action;
}

function calculateExpectedValue(
    state: GameState, slotId: string, cost: number, rollsLeft: number
): number {
    // 船员位
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1] as CargoType;
        const ship = state.ships.find(s => s.cargo === cargo);
        if (!ship) return 0;

        const config = SHIPS[cargo];
        const prob = arrivalProbability(ship.position, rollsLeft);
        const totalCrew = ship.crew.length + 1; // 包含自己
        const rewardPerSeat = config.totalReward / totalCrew;

        return prob * rewardPerSeat;
    }

    // 港口办事处
    if (slotId.startsWith('harbor-')) {
        const minShips: Record<string, number> = { 'harbor-A': 1, 'harbor-B': 2, 'harbor-C': 3 };
        const rewards: Record<string, number> = { 'harbor-A': 6, 'harbor-B': 8, 'harbor-C': 15 };
        const min = minShips[slotId] ?? 1;
        const reward = rewards[slotId] ?? 6;

        // 计算 >= min 艘船到港的概率
        const probs = state.ships.map(s => arrivalProbability(s.position, rollsLeft));
        const probAtLeastN = probAtLeastK(probs, min);

        return probAtLeastN * reward;
    }

    // 修船厂办事处
    if (slotId.startsWith('shipyard-')) {
        const minShips: Record<string, number> = { 'shipyard-A': 1, 'shipyard-B': 2, 'shipyard-C': 3 };
        const rewards: Record<string, number> = { 'shipyard-A': 6, 'shipyard-B': 8, 'shipyard-C': 15 };
        const min = minShips[slotId] ?? 1;
        const reward = rewards[slotId] ?? 6;

        // 未到港概率
        const probs = state.ships.map(s => 1 - arrivalProbability(s.position, rollsLeft));
        const probAtLeastN = probAtLeastK(probs, min);

        return probAtLeastN * reward;
    }

    // 保险
    if (slotId === 'insurance') {
        const failProbs = state.ships.map(s => 1 - arrivalProbability(s.position, rollsLeft));
        // E[penalty] = Σ P(k ships fail) * penalty[k]
        let expectedPenalty = 0;
        for (let k = 0; k <= 3; k++) {
            const probK = probExactlyK(failProbs, k);
            expectedPenalty += probK * INSURANCE_PENALTIES[k];
        }

        return 10 - expectedPenalty; // 保险收益 10 - 预期赔付
    }

    // 领航员
    if (slotId === 'navigator-big') return 3;
    if (slotId === 'navigator-small') return 1.5;

    // 海盗
    if (slotId.startsWith('pirate-')) return 2;

    return 0;
}

/**
 * 计算至少 k 个事件发生的概率（各事件概率不同）
 */
function probAtLeastK(probs: number[], k: number): number {
    if (k <= 0) return 1;
    if (k > probs.length) return 0;

    let sum = 0;
    for (let j = k; j <= probs.length; j++) {
        sum += probExactlyK(probs, j);
    }
    return sum;
}

/**
 * 计算恰好 k 个事件发生的概率（Poisson binomial）
 * 使用动态规划
 */
function probExactlyK(probs: number[], k: number): number {
    const n = probs.length;
    if (k < 0 || k > n) return 0;

    // dp[j] = probability of exactly j successes from first i items
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

function handlePlacement(state: GameState, actions: Action[]): Action {
    const action = actions[0];
    // 优先高价值船给高位置
    return {
        ...action,
        data: {
            ...action.data,
            cargos: ['JADE', 'SILK', 'NUTMEG'] as CargoType[],
            positions: { JADE: 4, SILK: 3, NUTMEG: 2, GINSENG: 0 },
        },
    };
}

function handleBuyStock(state: GameState, actions: Action[]): Action {
    // 计算哪种股票增值潜力最大
    const buyActions = actions.filter(a => a.type === 'BUY_STOCK');
    if (buyActions.length === 0) return actions.find(a => a.type === 'SKIP_BUY_STOCK') ?? actions[0];

    const rollsLeft = estimateRollsRemaining(state);
    const scored = buyActions.map(action => {
        const cargo = action.data.cargo as CargoType;
        const price = action.data.price as number;
        // 如果这轮这种货到港，股价 +5
        // 但只有这种货被选为本轮 3 种之一时才有用
        // 简化：假设每种货到港概率相同
        const valueGain = 5 * 0.6; // 60% 到港假设
        return { action, net: valueGain - price };
    });

    scored.sort((a, b) => b.net - a.net);

    // 如果所有都不划算，跳过
    if (scored[0].net < -2) {
        return actions.find(a => a.type === 'SKIP_BUY_STOCK') ?? actions[0];
    }

    return scored[0].action;
}

function handleNavigator(state: GameState, actions: Action[]): Action {
    const rollsLeft = estimateRollsRemaining(state);
    const navActions = actions.filter(a => a.type === 'USE_NAVIGATOR');

    if (navActions.length === 0) return actions.find(a => a.type === 'SKIP_NAVIGATOR') ?? actions[0];

    // 选择能最大提升我方投资收益的操作
    const player = state.players.find(p => p.id === navActions[0].playerId)!;

    let bestAction: Action | null = null;
    let bestDelta = -Infinity;

    for (const action of navActions) {
        const moves = action.data.moves as Array<{ cargo: CargoType, delta: number }> | undefined;
        let totalImprovement = 0;

        if (moves && moves.length > 0) {
            // 新格式: moves 数组 (单船或双船)
            for (const move of moves) {
                const ship = state.ships.find(s => s.cargo === move.cargo);
                if (!ship) continue;
                const myCrew = ship.crew.filter(c => c.playerId === player.id);
                if (myCrew.length > 0 && move.delta > 0) {
                    const probBefore = arrivalProbability(ship.position, rollsLeft);
                    const probAfter = arrivalProbability(ship.position + move.delta, rollsLeft);
                    totalImprovement += probAfter - probBefore;
                }
            }
        } else {
            // 旧格式: cargo + delta
            const cargo = action.data.cargo as CargoType;
            const delta = action.data.delta as number;
            const ship = state.ships.find(s => s.cargo === cargo);
            if (!ship) continue;
            const myCrew = ship.crew.filter(c => c.playerId === player.id);
            if (myCrew.length > 0 && delta > 0) {
                const probBefore = arrivalProbability(ship.position, rollsLeft);
                const probAfter = arrivalProbability(ship.position + delta, rollsLeft);
                totalImprovement = probAfter - probBefore;
            }
        }

        if (totalImprovement > bestDelta) {
            bestDelta = totalImprovement;
            bestAction = action;
        }
    }

    return bestAction ?? actions.find(a => a.type === 'SKIP_NAVIGATOR') ?? actions[0];
}
