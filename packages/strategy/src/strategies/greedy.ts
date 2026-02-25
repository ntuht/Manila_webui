/**
 * 贪婪策略 — 每步选择成本最低的投资
 * 拍卖时低价竞标，投资时优先选成本低的船员位
 */

import type { GameState, Action, CargoType } from '@manila/engine';
import { SHIPS, SHIP_DOCK_POSITION } from '@manila/engine';
import type { Strategy } from '../strategy.js';

export const greedyStrategy: Strategy = {
    name: 'greedy',
    description: '低成本贪婪策略：低价拍卖、优先投资低成本高回报',

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

function handleBid(state: GameState, actions: Action[]): Action {
    const bidAction = actions.find(a => a.type === 'BID');
    const passAction = actions.find(a => a.type === 'PASS_AUCTION');

    if (!bidAction) return passAction ?? actions[0];

    const minBid = bidAction.data.minBid as number;
    const player = state.players.find(p => p.id === bidAction.playerId)!;

    // 如果最低出价 > 现金的 1/3，放弃
    if (minBid > player.cash / 3 && passAction) {
        return passAction;
    }

    // 否则出最低价
    return { ...bidAction, data: { ...bidAction.data, amount: minBid } };
}

function handleInvestment(state: GameState, actions: Action[]): Action {
    // 计算每个投资的性价比（期望收益 / 成本）
    const scored = actions.map(action => {
        const slotId = action.data.slotId as string;
        const cost = action.data.cost as number;
        const score = scoreInvestment(state, slotId, cost);
        return { action, score };
    });

    // 选择得分最高的
    scored.sort((a, b) => b.score - a.score);
    return scored[0].action;
}

function scoreInvestment(state: GameState, slotId: string, cost: number): number {
    // 船员位：根据船只到港概率评估
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1] as CargoType;
        const ship = state.ships.find(s => s.cargo === cargo);
        if (!ship) return 0;

        const config = SHIPS[cargo];
        const distanceLeft = SHIP_DOCK_POSITION - ship.position;
        const avgDicePerRoll = 3.5;
        const rollsRemaining = estimateRollsRemaining(state);
        const expectedMove = rollsRemaining * avgDicePerRoll;

        // 到港概率简单估算
        const arrivalProb = Math.min(1, expectedMove / Math.max(1, distanceLeft));
        const rewardPerSeat = config.totalReward / (ship.crew.length + 1);
        const expectedReward = arrivalProb * rewardPerSeat;

        return cost === 0 ? expectedReward : expectedReward / cost;
    }

    // 港口办事处
    if (slotId.startsWith('harbor-')) {
        const dockedCount = state.ships.filter(s => s.position >= SHIP_DOCK_POSITION).length;
        const rollsLeft = estimateRollsRemaining(state);
        // 如果已经有很多船靠近港口，港口办事处收益高
        const nearPort = state.ships.filter(s => s.position >= 8).length;
        const prob = Math.min(1, (dockedCount + nearPort * 0.5) / 3);
        const rewards: Record<string, number> = { 'harbor-A': 6, 'harbor-B': 8, 'harbor-C': 15 };
        return (prob * (rewards[slotId] ?? 6)) / Math.max(1, cost);
    }

    // 修船厂办事处
    if (slotId.startsWith('shipyard-')) {
        const shipyardCount = state.ships.filter(s => s.position < SHIP_DOCK_POSITION && s.position < 8).length;
        const prob = Math.min(1, shipyardCount / 3);
        const rewards: Record<string, number> = { 'shipyard-A': 6, 'shipyard-B': 8, 'shipyard-C': 15 };
        return (prob * (rewards[slotId] ?? 6)) / Math.max(1, cost);
    }

    // 保险：免费拿 10 块，性价比无穷
    if (slotId === 'insurance') return 100;

    // 领航员：中等价值
    if (slotId.startsWith('navigator-')) return 1.5;

    // 海盗：低优先级
    if (slotId.startsWith('pirate-')) return 0.5;

    return 1;
}

function estimateRollsRemaining(state: GameState): number {
    const diceSteps = state.roundSteps.filter(s => s.type === 'DICE');
    const diceCompleted = state.diceHistory.length;
    return Math.max(0, diceSteps.length - diceCompleted);
}

function handlePlacement(_state: GameState, actions: Action[]): Action {
    const action = actions[0];
    // 默认：高价值货物给高位置
    return {
        ...action,
        data: {
            ...action.data,
            cargos: ['JADE', 'SILK', 'GINSENG'] as CargoType[],
            positions: { JADE: 5, SILK: 3, GINSENG: 1, NUTMEG: 0 },
        },
    };
}

function handleBuyStock(state: GameState, actions: Action[]): Action {
    // 优先买股价最低的股票
    const buyActions = actions.filter(a => a.type === 'BUY_STOCK');
    if (buyActions.length === 0) return actions.find(a => a.type === 'SKIP_BUY_STOCK') ?? actions[0];

    // 按价格排序
    buyActions.sort((a, b) => (a.data.price as number) - (b.data.price as number));
    return buyActions[0];
}

function handleNavigator(state: GameState, actions: Action[]): Action {
    // 看看哪艘船最接近港口但还没到
    const navActions = actions.filter(a => a.type === 'USE_NAVIGATOR');
    if (navActions.length === 0) return actions.find(a => a.type === 'SKIP_NAVIGATOR') ?? actions[0];

    // 选择能让船到港的操作
    for (const action of navActions) {
        const cargo = action.data.cargo as CargoType;
        const delta = action.data.delta as number;
        const ship = state.ships.find(s => s.cargo === cargo);
        if (ship && ship.position + delta >= SHIP_DOCK_POSITION) {
            return action;
        }
    }

    // 否则推进最接近港口的船
    const bestPush = navActions
        .filter(a => (a.data.delta as number) > 0)
        .sort((a, b) => {
            const shipA = state.ships.find(s => s.cargo === (a.data.cargo as CargoType))!;
            const shipB = state.ships.find(s => s.cargo === (b.data.cargo as CargoType))!;
            return shipB.position - shipA.position; // 优先推近港的船
        });

    return bestPush[0] ?? actions.find(a => a.type === 'SKIP_NAVIGATOR') ?? actions[0];
}
