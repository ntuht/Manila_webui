/**
 * 参数化策略 v4 — 博弈论最优竞拍 + 股票复利链
 *
 * 核心改进:
 * 1. 港务长竞拍 — 博弈论价值模型: 股票复利(5-12) + 布置权(3-5) + 先手(2-3) = 10-20/轮
 *    bidAggression [0.5, 2.0] 缩放因子: 1.0=出EV价, >1.0=超出以拒敌
 * 2. 买股票 — 考虑持股复利效应 + 港务长布局优势
 * 3. 现金约束从 50% → 70%, 匹配真实对局 (bid 20+)
 */

import type { GameState, Action, CargoType } from '@manila/engine';
import { SHIPS, SHIP_DOCK_POSITION, STOCK_PRICE_INCREASE, STOCK_MIN_BUY_PRICE, STOCK_END_PRICE, STOCK_PRICE_LEVELS, ALL_CARGO, getStockPriceIncrease, getNextStockPrice } from '@manila/engine';
import type { Strategy } from '../strategy.js';
import {
    calcInvestmentImpact, calcNavigatorMoveImpact,
    arrivalProbability, estimateRollsRemaining,
    type ImpactVector,
} from '../impact.js';

// ==================== 权重定义 ====================

export interface StrategyWeights {
    selfEV: number;          // 自身期望收益
    crewDilution: number;    // 船员稀释
    shipyardBoost: number;   // 修船厂收益
    navDenial: number;       // 领航员剥夺
    slotBlock: number;       // 槽位封锁
    cashPressure: number;    // 现金压迫
    bidAggression: number;   // 竞拍激进度 (0.3=保守, 1.0=EV水平, 2.0=超出拒敌)
    navAttackBias: number;   // 领航员攻击偏好 (0-1)
    riskTolerance: number;   // 风险偏好 (0-1)
}

/** 默认权重（初始猜测，接近 EV 行为） */
export const DEFAULT_WEIGHTS: StrategyWeights = {
    selfEV: 1.5,
    crewDilution: 0.5,
    shipyardBoost: 0.3,
    navDenial: 0.3,
    slotBlock: 0.5,
    cashPressure: 0.3,
    bidAggression: 1.0,
    navAttackBias: 0.3,
    riskTolerance: 0.5,
};

/** 权重上下限 */
export const WEIGHT_BOUNDS: Record<keyof StrategyWeights, [number, number]> = {
    selfEV: [0.5, 3.0],
    crewDilution: [0, 2.0],
    shipyardBoost: [0, 1.0],
    navDenial: [0, 1.5],
    slotBlock: [0, 1.5],
    cashPressure: [0, 1.5],
    bidAggression: [0.3, 2.0],
    navAttackBias: [0, 0.5],
    riskTolerance: [0, 1.0],
};

/** 权重键列表 */
export const WEIGHT_KEYS: (keyof StrategyWeights)[] = [
    'selfEV', 'crewDilution',
    'shipyardBoost', 'navDenial', 'slotBlock', 'cashPressure',
    'bidAggression', 'navAttackBias', 'riskTolerance',
];

/** 权重 → 数组 */
export function weightsToArray(w: StrategyWeights): number[] {
    return WEIGHT_KEYS.map(k => w[k]);
}

/** 数组 → 权重（带边界 clamp） */
export function arrayToWeights(arr: number[]): StrategyWeights {
    const w = { ...DEFAULT_WEIGHTS };
    WEIGHT_KEYS.forEach((k, i) => {
        const [lo, hi] = WEIGHT_BOUNDS[k];
        (w as any)[k] = Math.max(lo, Math.min(hi, arr[i]));
    });
    return w;
}

/** 影响向量 ⋅ 权重 = 总得分 */
function scoreImpact(impact: ImpactVector, weights: StrategyWeights): number {
    return (
        impact.selfEV * weights.selfEV +
        impact.crewDilution * weights.crewDilution +
        impact.shipyardBoost * weights.shipyardBoost +
        impact.navDenial * weights.navDenial +
        impact.slotBlock * weights.slotBlock +
        impact.cashPressure * weights.cashPressure
    );
}

// ==================== 策略工厂 ====================

export function createTunedStrategy(weights: StrategyWeights, name?: string): Strategy {
    return {
        name: name ?? 'tuned',
        description: `参数化策略 v2`,

        chooseAction(state: GameState, validActions: Action[]): Action {
            if (validActions.length === 0) throw new Error('没有合法动作');

            // 不能对单一动作短路返回 — PLACE_SHIPS 只有 1 个模板动作但需要填充数据
            const actionType = validActions[0].type;

            switch (actionType) {
                case 'BID':
                case 'PASS_AUCTION':
                    return handleBid(state, validActions, weights);
                case 'SELECT_INVESTMENT':
                    return handleInvestment(state, validActions, weights);
                case 'PLACE_SHIPS':
                    return handlePlacement(state, validActions, weights);
                case 'BUY_STOCK':
                case 'SKIP_BUY_STOCK':
                    return handleBuyStock(state, validActions, weights);
                case 'USE_NAVIGATOR':
                case 'SKIP_NAVIGATOR':
                    return handleNavigator(state, validActions, weights);
                case 'ROLL_DICE':
                    return validActions[0];
                default:
                    return validActions[0];
            }
        },
    };
}

// ==================== 决策处理 ====================

/**
 * 竞拍决策 — 港务长价值模型
 *
 * 港务长三大价值来源:
 * 1. 股票购买权 — 唯一买股途径，剩余轮次越多价值越高
 * 2. 布置权 — 控制船位，可为自己持股的货物选有利位置
 * 3. 先手投资权 — 抢占最优座位
 *
 * 关键改进: 布置权的真正价值 = 让已持股的货物到港概率提高
 * 港务长可以把持股货物放在高位 (pos 5-6)
 * 每次到港，所有持股增值 +5
 */
function handleBid(state: GameState, actions: Action[], w: StrategyWeights): Action {
    const bidAction = actions.find(a => a.type === 'BID');
    const passAction = actions.find(a => a.type === 'PASS_AUCTION');
    if (!bidAction) return passAction ?? actions[0];

    const minBid = bidAction.data.minBid as number;
    const player = state.players.find(p => p.id === bidAction.playerId)!;

    // 估算剩余轮数: 离 STOCK_END_PRICE (30) 还差几次到港?
    // 最高股价距离30越近，游戏越快结束
    const maxStockPrice = Math.max(...ALL_CARGO.map(c => state.stockPrices[c]));
    const levelsToEnd = STOCK_PRICE_LEVELS.filter(l => l > maxStockPrice).length;
    const estimatedRemainingRounds = Math.max(1, Math.ceil(levelsToEnd / 0.65)); // 平均65%到港率

    // === 1. 股票购买权价值 — 等级制增值模型 ===
    // 股价等级表: 0→5→10→20→30
    // 买入后，每次该货物到港，股价升一级（增量不固定）
    const stockBuyEV = ALL_CARGO.map(cargo => {
        const buyPrice = Math.max(STOCK_MIN_BUY_PRICE, state.stockPrices[cargo]);
        const currentPrice = state.stockPrices[cargo];

        // 模拟未来几轮该货物到港后的股价预期终值
        // 港务长本轮: ~70% 到港, 未来轮: ~60%
        let expectedFinalPrice = currentPrice;
        let simPrice = currentPrice;
        for (let r = 0; r < estimatedRemainingRounds; r++) {
            if (simPrice >= STOCK_END_PRICE) break;
            const arrProb = r === 0 ? 0.70 : 0.60; // 本轮港务长优势
            const increment = getStockPriceIncrease(simPrice);
            expectedFinalPrice += arrProb * increment;
            simPrice = getNextStockPrice(simPrice); // 乐观路径
        }

        // 股票终值 - 买入价 = 净收益
        return expectedFinalPrice - buyPrice;
    });
    const bestStockEV = Math.max(0, ...stockBuyEV);

    // === 2. 布置权 — 已持股的战略增值 ===
    // 港务长把持股货物放高位 → 到港概率从 ~40% → ~75% (probBoost ≈ 0.30)
    // 每次到港，股价升一级（增量看当前价位）
    let portfolioBonus = 0;
    for (const cargo of ALL_CARGO) {
        const held = player.stocks
            .filter(s => s.cargo === cargo)
            .reduce((sum, s) => sum + s.quantity, 0);
        if (held > 0) {
            const probBoost = 0.30;
            // 下一次到港的增量（等级制: 10→20时+10, vs 0→5时+5）
            const nextIncrement = getStockPriceIncrease(state.stockPrices[cargo]);
            // 港务长本轮的布局增值
            const thisRoundValue = probBoost * nextIncrement * held;
            // 未来轮次的布局优势（如果再当港务长概率低, 但持股本身有到港增值）
            const futureRoundsValue = Math.max(0, estimatedRemainingRounds - 1)
                * probBoost * 0.5 * nextIncrement * held; // 打5折: 未来不一定当港务长
            portfolioBonus += thisRoundValue + futureRoundsValue;
        }
    }

    // === 3. 先手投资权 ===
    const firstMoveValue = state.config.playerCount === 3 ? 3 : 2;

    // === 4. 基础布置权 ===
    const basePlacementValue = 2 + (estimatedRemainingRounds >= 3 ? 2 : estimatedRemainingRounds >= 2 ? 1 : 0);

    // === 总价值 × bidAggression ===
    const rawValue = bestStockEV + portfolioBonus + basePlacementValue + firstMoveValue;
    const harborValue = rawValue * w.bidAggression;

    // 现金约束: 早期股票少、投资目标少 → 少预留; 后期多预留
    const reserveForInvest = state.round <= 1 ? 5 : state.round <= 2 ? 6 : 8;
    const reserveForStock = 5;
    const maxAfford = Math.max(0, player.cash - reserveForInvest - reserveForStock);
    const maxBid = Math.min(Math.floor(harborValue), maxAfford);

    if (minBid > maxBid) {
        return passAction ?? actions[0];
    }

    // 最低加价策略 — 不需要超出最低, 等对手放弃
    return { ...bidAction, data: { ...bidAction.data, amount: minBid } };
}

/**
 * 投资决策 — 用 impact 向量 × 权重评分
 * selfEV 已包含 -cost，天然偏好便宜座位
 */
function handleInvestment(state: GameState, actions: Action[], w: StrategyWeights): Action {
    const myId = actions[0].playerId;

    const scored = actions.map(action => {
        const slotId = action.data.slotId as string;
        const cost = action.data.cost as number;
        const impact = calcInvestmentImpact(state, slotId, cost, myId);
        const score = scoreImpact(impact, w);
        return { action, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].action;
}

/**
 * 领航员决策 — 评估推/拉船影响
 */
function handleNavigator(state: GameState, actions: Action[], w: StrategyWeights): Action {
    const navActions = actions.filter(a => a.type === 'USE_NAVIGATOR');
    const skipAction = actions.find(a => a.type === 'SKIP_NAVIGATOR');

    if (navActions.length === 0) return skipAction ?? actions[0];
    const myId = navActions[0].playerId;

    const scored = navActions.map(action => {
        const cargo = action.data.cargo as CargoType;
        const delta = action.data.delta as number;
        const impact = calcNavigatorMoveImpact(state, cargo, delta, myId);

        let score = scoreImpact(impact, w);
        if (delta < 0) {
            score *= (1 + w.navAttackBias * 0.5);
        }
        return { action, score };
    });

    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score <= 0) return skipAction ?? actions[0];
    return scored[0].action;
}

/**
 * 船只布置 — 根据股票优势动态分配起始位置
 *
 * 核心思路: 最大化"相对股票收益"
 * - 我持股多的货物 → 高位（容易到港 → 股价涨 → 我赚）
 * - 对手持股多的货物 → 低位甚至 0（不到港 → 对手不赚）
 * - 排除对手优势最大的第4种货物（不参与本轮）
 *
 * 约束: 3艘船, 位置 0-5, 总和必须=9
 *
 * 信息假设: 知道自己持股; 知道对手合计持股（从剩余股票推算）;
 *           不知道对手个人持股分布
 */
function handlePlacement(state: GameState, actions: Action[], w: StrategyWeights): Action {
    const action = actions[0];
    const player = state.players.find(p => p.id === action.playerId)!;

    // 1. 统计自己持股
    const myStocks: Record<string, number> = {};
    const oppStocks: Record<string, number> = {};
    for (const cargo of ALL_CARGO) {
        myStocks[cargo] = 0;
        oppStocks[cargo] = 0;
    }
    for (const s of player.stocks) {
        myStocks[s.cargo] += s.quantity;
    }

    // 2. 统计对手合计持股（所有对手加起来）
    for (const p of state.players) {
        if (p.id === player.id) continue;
        for (const s of p.stocks) {
            oppStocks[s.cargo] += s.quantity;
        }
    }

    // 3. 对每种货物评分:
    //    主分 = (我的持股 - 对手总持股) × 增量 → 相对优势
    //    偏置 = 我的持股 × 增量 × 0.1 → 打破平局时偏向自己有股的货物
    //    正分 = 到港对我有利; 负分 = 到港对对手有利
    const cargoScores = ALL_CARGO.map(cargo => {
        const increment = getStockPriceIncrease(state.stockPrices[cargo]);
        const advantage = (myStocks[cargo] - oppStocks[cargo]) * increment;
        const bias = myStocks[cargo] * increment * 0.5; // 强正偏置: 有持股就给高位
        return {
            cargo,
            score: advantage + bias,
            myQty: myStocks[cargo],
        };
    });

    // 按分数降序, 持股数降序, 增量降序
    cargoScores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.myQty !== a.myQty) return b.myQty - a.myQty;
        return getStockPriceIncrease(state.stockPrices[b.cargo])
            - getStockPriceIncrease(state.stockPrices[a.cargo]);
    });

    // 4. 选前 3 名(排除对手优势最大的货物)
    const selected = cargoScores.slice(0, 3);
    const scores = selected.map(s => s.score);

    // 5. 穷举所有合法位置分配, 找使 Σ arrivalProb(pos) × score 最大的方案
    //    约束: pos[0]+pos[1]+pos[2]=9, 每个 0-5
    //    共 ~21 个位置元组 × 6 种分配 = 126 次计算
    const ROLLS = 3; // 每轮 3 次掷骰
    let bestEV = -Infinity;
    let bestAssign = [4, 3, 2]; // 默认

    for (let a = 0; a <= 5; a++) {
        for (let b = 0; b <= 5; b++) {
            const c = 9 - a - b;
            if (c < 0 || c > 5) continue;

            // 尝试 3 个货物的所有排列
            const perms = [
                [a, b, c], [a, c, b], [b, a, c],
                [b, c, a], [c, a, b], [c, b, a],
            ];
            for (const perm of perms) {
                let ev = 0;
                for (let i = 0; i < 3; i++) {
                    ev += arrivalProbability(perm[i], ROLLS) * scores[i];
                }
                if (ev > bestEV) {
                    bestEV = ev;
                    bestAssign = perm;
                }
            }
        }
    }

    // 6. 构建结果
    const positions: Record<string, number> = {};
    for (const cargo of ALL_CARGO) positions[cargo] = 0;
    selected.forEach((s, i) => { positions[s.cargo] = bestAssign[i]; });

    return {
        ...action,
        data: {
            ...action.data,
            cargos: selected.map(s => s.cargo) as CargoType[],
            positions,
        },
    };
}

/**
 * 买股票 — 港务长的核心价值来源！
 *
 * 买入价值 = 已持股协同 + 本轮到港概率 + 未来轮次累积
 * 注意: 买股票发生在 PLACE_SHIPS 之前，ships[] 为空
 * 所以本轮到港概率用默认 60% (harbor master 可以布局有利位置)
 */
function handleBuyStock(state: GameState, actions: Action[], w: StrategyWeights): Action {
    const buyActions = actions.filter(a => a.type === 'BUY_STOCK');
    const skipAction = actions.find(a => a.type === 'SKIP_BUY_STOCK');

    if (buyActions.length === 0) return skipAction ?? actions[0];

    const player = state.players.find(p => p.id === actions[0].playerId)!;

    // 注意: 买股票通常发生在船只布置前, ships 可能为空
    const hasShips = state.ships.length > 0;
    const rollsLeft = hasShips ? estimateRollsRemaining(state) : 3;

    const scored = buyActions.map(a => {
        const cargo = a.data.cargo as CargoType;
        const price = a.data.price as number;

        // 已有此货物股数 → 协同效应
        const heldQty = player.stocks
            .filter(s => s.cargo === cargo)
            .reduce((sum, s) => sum + s.quantity, 0);

        // 本轮到港概率 — 综合自推 + 搭便车 + 历史信号
        let probThisRound: number;
        if (hasShips) {
            const ship = state.ships.find(s => s.cargo === cargo);
            probThisRound = ship ? arrivalProbability(ship.position, rollsLeft) : 0.65;
        } else {
            // === 自推力: 我持股 → 我当港务长时放高位 → 概率更高 ===
            const selfBonus = heldQty > 0 ? 0.10 : 0;

            // === 搭便车: 对手持股 → 他们当港务长时也推该货物高位 ===
            const opponents = state.players.filter(p => p.id !== player.id);
            const oppHolding = opponents.reduce((sum, opp) => {
                return sum + opp.stocks
                    .filter(s => s.cargo === cargo)
                    .reduce((s, h) => s + h.quantity, 0);
            }, 0);
            // 每张对手股票 +3% (上限 +15%)
            const freeRideBonus = Math.min(0.15, oppHolding * 0.03);

            // === 股价信号: 已到港次数越多的货物越可靠 ===
            const priceLevel = STOCK_PRICE_LEVELS.indexOf(state.stockPrices[cargo]);
            const historyBonus = Math.max(0, priceLevel) * 0.03;

            probThisRound = Math.min(0.85, 0.60 + selfBonus + freeRideBonus + historyBonus);
        }

        // 新股本身的增值 EV — 等级制: 0→5→10→20→30
        // 模拟未来到港的升值
        const maxStockPrice = Math.max(...ALL_CARGO.map(c => state.stockPrices[c]));
        const levelsToEnd = STOCK_PRICE_LEVELS.filter(l => l > maxStockPrice).length;
        const estRounds = Math.max(1, Math.ceil(levelsToEnd / 0.65));

        let expectedGain = 0;
        let simPrice = state.stockPrices[cargo];
        for (let r = 0; r < estRounds; r++) {
            if (simPrice >= STOCK_END_PRICE) break;
            const prob = r === 0 ? probThisRound : 0.60;
            expectedGain += prob * getStockPriceIncrease(simPrice);
            simPrice = getNextStockPrice(simPrice);
        }

        // 协同效应: 已持股→到港时每股升值
        const nextIncrement = getStockPriceIncrease(state.stockPrices[cargo]);
        const synergyBonus = heldQty * nextIncrement * 0.15;

        // 抵押惩罚: 已抵押的同类股票增加未来罚款风险
        const mortgagedCount = player.stocks
            .filter(s => s.cargo === cargo && s.mortgaged > 0)
            .reduce((sum, s) => sum + s.mortgaged, 0);
        const mortgagePenalty = mortgagedCount * 3;

        const totalEV = expectedGain + synergyBonus - price - mortgagePenalty;
        return { action: a, ev: totalEV, cargo };
    });

    scored.sort((a, b) => b.ev - a.ev);

    // 积极买入: EV > -2 且有足够现金留给投资 (至少保留 3 给最便宜的船员座)
    if (scored[0].ev < -2 || player.cash < 8) {
        return skipAction ?? actions[0];
    }
    return scored[0].action;
}
