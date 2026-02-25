/**
 * calcPirateImpact 单元测试
 *
 * 海盗核心机制:
 * - 劫持触发: 船到 position >= 13 (PIRATE_TRIGGER_POSITION)
 * - 收益: 海盗获得该船全部奖池 (totalReward)，船员不分
 * - EV 计算: SUM of (prob_reach_13 × reward) 对所有船求和
 * - 奖池: JADE=36, SILK=30, GINSENG=18, NUTMEG=24
 */
import { describe, it, expect } from 'vitest';
import {
    calcInvestmentImpact,
    arrivalProbability,
} from '../src/impact.js';
import type { GameState, ShipState, Investment, PlayerState } from '@manila/engine';
import { SHIPS, ROUND_STEPS_3P } from '@manila/engine';

// ==================== 辅助函数 ====================

/** 创建最小 GameState 用于测试 */
function makeState(overrides: {
    ships: ShipState[];
    investments?: Investment[];
    players?: PlayerState[];
    /** 剩余掷骰次数 (默认 1) — 控制 estimateRollsRemaining 返回值 */
    diceRemaining?: number;
}): GameState {
    const defaultPlayers: PlayerState[] = [
        { id: 'p0', name: 'P0', cash: 30, stocks: [], isAI: true },
        { id: 'p1', name: 'P1', cash: 30, stocks: [], isAI: true },
        { id: 'p2', name: 'P2', cash: 30, stocks: [], isAI: true },
    ];
    // ROUND_STEPS_3P 有 3 次 DICE
    // estimateRollsRemaining = diceSteps.length - diceHistory.length
    const diceRemaining = overrides.diceRemaining ?? 1;
    const diceAlreadyRolled = 3 - diceRemaining;
    const diceHistory = Array.from({ length: diceAlreadyRolled }, (_, i) => ({
        values: [3, 3, 3] as [number, number, number],
        round: 1,
        rollIndex: i,
    }));
    return {
        config: { playerCount: 3, rounds: 6 },
        round: 1,
        phase: 'INVEST',
        players: overrides.players ?? defaultPlayers,
        currentPlayerIndex: 0,
        ships: overrides.ships,
        stockPrices: { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 },
        investments: overrides.investments ?? [],
        roundSteps: [...ROUND_STEPS_3P],
        currentStepIndex: 5,
        investTurnIndex: 0,
        diceHistory,
        currentRollIndex: diceAlreadyRolled,
        pendingAction: null,
        log: [],
    };
}

function makeShip(cargo: ShipState['cargo'], position: number, crew: ShipState['crew'] = []): ShipState {
    return { cargo, position, crew };
}

// ==================== 海盗影响测试 ====================

describe('calcPirateImpact', () => {

    it('三船在 pos 7, 配对已成, 1 roll → EV ≈ (36+30+24)/6 - 5 = 10', () => {
        // 用户公式: 翡翠32/6 + 丝绸30/6 + 肉豆蔻24/6 = 15, 减去成本 5 = 10
        // pos 7 → 需到达 13 → 需 6 步 → 单骰 P(>=6) = 1/6 (精确)
        const ships: ShipState[] = [
            makeShip('JADE', 7, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('SILK', 7, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('NUTMEG', 7, [{ playerId: 'p2', seatIndex: 0, cost: 2 }]),
        ];

        const investments: Investment[] = [
            { type: 'PIRATE', slotId: 'pirate-crew', playerId: 'p2', cost: 5, reward: 0 },
        ];

        const state = makeState({ ships, investments, diceRemaining: 1 });
        const impact = calcInvestmentImpact(state, 'pirate-captain', 5, 'p0');

        // 精确计算: prob = 1/6, totalHijackEV = (36+30+24)/6 = 15
        // selfEV = 15 - 5 = 10
        expect(impact.selfEV).toBeCloseTo(10, 0);
    });

    it('三船全在 pos 13, 配对已成 → selfEV ≈ (36+30+24) - 5 = 85', () => {
        // 船已在 13 → prob = 1.0 → 全额抢
        const ships: ShipState[] = [
            makeShip('JADE', 13, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('SILK', 13, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('NUTMEG', 13, [{ playerId: 'p2', seatIndex: 0, cost: 2 }]),
        ];

        const investments: Investment[] = [
            { type: 'PIRATE', slotId: 'pirate-crew', playerId: 'p2', cost: 5, reward: 0 },
        ];

        const state = makeState({ ships, investments, diceRemaining: 1 });
        const impact = calcInvestmentImpact(state, 'pirate-captain', 5, 'p0');

        // totalHijackEV = 1.0*36 + 1.0*30 + 1.0*24 = 90
        // selfEV = 90 - 5 = 85
        expect(impact.selfEV).toBeGreaterThan(80);
        expect(impact.selfEV).toBeLessThan(90);
    });

    it('三船低位 (pos < 5), 3 rolls → 有一定 EV', () => {
        const ships: ShipState[] = [
            makeShip('JADE', 3, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('SILK', 2, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('NUTMEG', 1, [{ playerId: 'p2', seatIndex: 0, cost: 2 }]),
        ];

        const investments: Investment[] = [
            { type: 'PIRATE', slotId: 'pirate-crew', playerId: 'p2', cost: 5, reward: 0 },
        ];

        const state = makeState({ ships, investments, diceRemaining: 3 });
        const impact = calcInvestmentImpact(state, 'pirate-captain', 5, 'p0');

        // pos 3→13: need 10, 3 rolls mean=10.5 → prob ≈ 0.5+
        // pos 2→13: need 11 → prob ≈ 0.4
        // pos 1→13: need 12 → prob ≈ 0.3
        // totalHijackEV ≈ SUM → 30-40 range
        // selfEV ≈ 30-40 - 5
        expect(impact.selfEV).toBeGreaterThan(10);
        expect(impact.selfEV).toBeLessThan(50);
    });

    it('未配对 (单人海盗) → pairFactor=0.3 大幅降低 EV', () => {
        const ships: ShipState[] = [
            makeShip('JADE', 13, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('SILK', 10, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
            makeShip('NUTMEG', 8, [{ playerId: 'p2', seatIndex: 0, cost: 2 }]),
        ];

        // 无配对
        const state = makeState({ ships, investments: [], diceRemaining: 2 });
        const impact = calcInvestmentImpact(state, 'pirate-captain', 5, 'p0');

        // JADE at 13: prob=1.0, SILK at 10: prob_reach_13(11,1)≈P(die>=3)≈4/6, NUTMEG at 8: prob_reach_13(9,1)≈P(die>=5)≈2/6
        // totalHijackEV ≈ 36 + ?(30) + ?(24) (正态近似偏移较大)
        // pairFactor = 0.3
        // selfEV ≈ totalHijackEV * 0.3 - 5
        expect(impact.selfEV).toBeGreaterThan(3);
        expect(impact.selfEV).toBeLessThan(25);
    });

    it('有自己船员的船 → 劫持会扣除自己的船员分成', () => {
        const ships: ShipState[] = [
            // 只有自己 1 个船员 → 劫持收益减去 36/1 = 36 → 净收益 0
            makeShip('JADE', 13, [{ playerId: 'p0', seatIndex: 0, cost: 3 }]),
            // 对手船员
            makeShip('SILK', 13, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
        ];

        const investments: Investment[] = [
            { type: 'PIRATE', slotId: 'pirate-crew', playerId: 'p2', cost: 5, reward: 0 },
        ];

        const state = makeState({ ships, investments, diceRemaining: 2 });
        const impact = calcInvestmentImpact(state, 'pirate-captain', 5, 'p0');

        // JADE: reward=36, myCrew=1/1 → loss=36 → net=0
        // SILK: reward=30, myCrew=0 → net=30
        // totalHijackEV = 0 + 30 = 30
        // selfEV = 30 - 5 = 25
        expect(impact.selfEV).toBeGreaterThan(20);
        expect(impact.selfEV).toBeLessThan(30);
    });

    it('空船 (无船员) → 劫持仍获全额奖池', () => {
        const ships: ShipState[] = [
            makeShip('JADE', 13, []),   // 空船
            makeShip('SILK', 13, [{ playerId: 'p1', seatIndex: 0, cost: 3 }]),
        ];

        const investments: Investment[] = [
            { type: 'PIRATE', slotId: 'pirate-crew', playerId: 'p2', cost: 5, reward: 0 },
        ];

        const state = makeState({ ships, investments, diceRemaining: 2 });
        const impact = calcInvestmentImpact(state, 'pirate-captain', 5, 'p0');

        // JADE: reward=36, no crew loss → net=36
        // SILK: reward=30 → net=30
        // totalHijackEV = 66
        // selfEV = 66 - 5 = 61
        expect(impact.selfEV).toBeGreaterThan(55);
        expect(impact.selfEV).toBeLessThan(65);
    });
});

// ==================== 到港概率测试 ====================

describe('arrivalProbability — 精确骰子概率', () => {
    it('pos=14, any rolls → 概率 = 1.0', () => {
        expect(arrivalProbability(14, 3)).toBe(1);
        expect(arrivalProbability(14, 0)).toBe(1);
    });

    it('pos=0, 0 rolls → 概率 = 0', () => {
        expect(arrivalProbability(0, 0)).toBe(0);
    });

    it('pos=13, 1 roll → 概率 = 1.0 (只需 1, 必定到达)', () => {
        expect(arrivalProbability(13, 1)).toBe(1);
    });

    it('pos=8, 1 roll → P(die>=6) = 1/6', () => {
        expect(arrivalProbability(8, 1)).toBeCloseTo(1 / 6, 10);
    });

    it('pos=0, 1 roll → 概率 = 0 (需要 14, 单骰最大 6)', () => {
        expect(arrivalProbability(0, 1)).toBe(0);
    });

    it('pos=11, 1 roll → P(die>=3) = 4/6', () => {
        expect(arrivalProbability(11, 1)).toBeCloseTo(4 / 6, 10);
    });

    it('pos=12, 1 roll → P(die>=2) = 5/6', () => {
        expect(arrivalProbability(12, 1)).toBeCloseTo(5 / 6, 10);
    });

    it('pos=7, 2 rolls → P(2骰子之和>=7) = 21/36', () => {
        // 2骰子 sum>=7: 6+1,6+2,...,6+6, 5+2,...,5+6, 4+3,...,4+6, 3+4,...,3+6, 2+5,2+6, 1+6
        // = 6+5+4+3+2+1 = 21 种
        expect(arrivalProbability(7, 2)).toBeCloseTo(21 / 36, 10);
    });
});
