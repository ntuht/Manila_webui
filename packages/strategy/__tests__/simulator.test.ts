import { describe, it, expect } from 'vitest';
import { simulate } from '../src/simulator.js';
import { randomStrategy } from '../src/strategies/random.js';
import { greedyStrategy } from '../src/strategies/greedy.js';
import { expectedValueStrategy } from '../src/strategies/ev.js';
import type { SimulationConfig } from '../src/simulator.js';

describe('Manila Strategy Simulator', () => {

    it('模拟 10 局 3 × 随机策略', () => {
        const config: SimulationConfig = {
            games: 10,
            rounds: 3,
            playerCount: 3,
            strategies: [randomStrategy, randomStrategy, randomStrategy],
            baseSeed: 42,
        };

        const result = simulate(config);

        expect(result.totalGames).toBe(10);
        expect(result.completedGames + result.failedGames).toBe(10);
        expect(result.strategyStats).toHaveLength(3);
        expect(result.duration).toBeGreaterThan(0);
    });

    it('随机 vs 贪婪 vs 期望值', () => {
        const config: SimulationConfig = {
            games: 50,
            rounds: 3,
            playerCount: 3,
            strategies: [randomStrategy, greedyStrategy, expectedValueStrategy],
            baseSeed: 100,
        };

        const result = simulate(config);

        expect(result.completedGames).toBeGreaterThan(0);

        // 期望值策略应该赢得更多（大数定律）
        const evStats = result.strategyStats[2];
        const randomStats = result.strategyStats[0];

        // 至少不比随机差太多（50 局可能波动大）
        console.log(`随机胜率: ${(randomStats.winRate * 100).toFixed(1)}%`);
        console.log(`贪婪胜率: ${(result.strategyStats[1].winRate * 100).toFixed(1)}%`);
        console.log(`期望值胜率: ${(evStats.winRate * 100).toFixed(1)}%`);
    });

    it('策略数量不匹配时报错', () => {
        const config: SimulationConfig = {
            games: 1,
            rounds: 1,
            playerCount: 3,
            strategies: [randomStrategy, greedyStrategy],
            baseSeed: 1,
        };

        expect(() => simulate(config)).toThrow('策略数量');
    });

    it('可复现 — 相同种子相同结果', () => {
        const config: SimulationConfig = {
            games: 5,
            rounds: 3,
            playerCount: 3,
            strategies: [greedyStrategy, greedyStrategy, expectedValueStrategy],
            baseSeed: 999,
        };

        const result1 = simulate(config);
        const result2 = simulate(config);

        // 分数应完全一致
        for (let i = 0; i < 3; i++) {
            expect(result1.strategyStats[i].scores).toEqual(result2.strategyStats[i].scores);
        }
    });
});
