/**
 * CLI — 策略对比模拟器
 *
 * 用法: npx tsx src/cli.ts [--games 1000] [--rounds 3] [--seed 42]
 */

import { simulate, type SimulationConfig } from './simulator.js';
import { randomStrategy } from './strategies/random.js';
import { greedyStrategy } from './strategies/greedy.js';
import { expectedValueStrategy } from './strategies/ev.js';
import { adversarialStrategy } from './strategies/adversarial.js';

// 解析命令行参数
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: number): number {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? parseInt(args[idx + 1]) : defaultVal;
}

const games = getArg('games', 1000);
const rounds = getArg('rounds', 3);
const seed = getArg('seed', 42);

console.log('╔══════════════════════════════════════════════════╗');
console.log('║           Manila 策略模拟器                       ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log();

// ==================== 配置比赛 ====================

const matchups: { name: string; config: SimulationConfig }[] = [
    {
        name: '随机 vs 贪婪 vs 期望值',
        config: {
            games,
            rounds,
            playerCount: 3,
            strategies: [randomStrategy, greedyStrategy, expectedValueStrategy],
            baseSeed: seed,
        },
    },
    {
        name: '期望值 vs 对抗性 vs 贪婪',
        config: {
            games,
            rounds,
            playerCount: 3,
            strategies: [expectedValueStrategy, adversarialStrategy, greedyStrategy],
            baseSeed: seed + 10000,
        },
    },
    {
        name: '对抗性 vs 2 × 期望值',
        config: {
            games,
            rounds,
            playerCount: 3,
            strategies: [adversarialStrategy, expectedValueStrategy, expectedValueStrategy],
            baseSeed: seed + 20000,
        },
    },
    {
        name: '3 × 对抗性（自我对弈）',
        config: {
            games,
            rounds,
            playerCount: 3,
            strategies: [adversarialStrategy, adversarialStrategy, adversarialStrategy],
            baseSeed: seed + 30000,
        },
    },
];

// ==================== 运行比赛 ====================

for (const matchup of matchups) {
    console.log(`\n▶ ${matchup.name}`);
    console.log(`  ${matchup.config.games} 局, ${matchup.config.rounds} 轮/局, seed=${matchup.config.baseSeed}`);
    console.log('  模拟中...');

    const result = simulate(matchup.config);

    console.log(`  完成: ${result.completedGames}/${result.totalGames} 局 (${result.duration}ms)`);

    if (result.failedGames > 0) {
        console.log(`  ⚠ 失败: ${result.failedGames} 局`);
    }

    console.log();
    console.log('  ┌─────────────────┬──────┬────────┬────────┬────────┬────────┐');
    console.log('  │ 策略            │ 胜场 │ 胜率   │ 平均分 │ 最低分 │ 最高分 │');
    console.log('  ├─────────────────┼──────┼────────┼────────┼────────┼────────┤');

    for (const s of result.strategyStats) {
        const name = s.name.padEnd(15);
        const wins = String(s.wins).padStart(4);
        const winRate = `${(s.winRate * 100).toFixed(1)}%`.padStart(6);
        const avg = s.avgScore.toFixed(1).padStart(6);
        const min = String(s.minScore).padStart(6);
        const max = String(s.maxScore).padStart(6);

        console.log(`  │ ${name} │ ${wins} │ ${winRate} │ ${avg} │ ${min} │ ${max} │`);
    }

    console.log('  └─────────────────┴──────┴────────┴────────┴────────┴────────┘');
}

console.log('\n✅ 模拟完成');
