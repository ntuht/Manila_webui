/**
 * 训练 CLI — 运行进化策略训练并输出最佳权重
 *
 * 用法: npx tsx src/train-cli.ts [--generations 50] [--population 20] [--games 200]
 *
 * 输出:
 *   trained_weights.json    — 最佳权重
 *   training_record.json    — 完整训练记录 (配置 + 历史 + 验证)
 *   training_report.md      — 可读 Markdown 复盘报告
 */

import { train, DEFAULT_TRAINING_CONFIG, type TrainingConfig, type TrainingResult } from './trainer.js';
import { simulate, type SimulationConfig, type SimulationResult } from './simulator.js';
import { createTunedStrategy, WEIGHT_KEYS, WEIGHT_BOUNDS, type StrategyWeights } from './strategies/tuned.js';
import { expectedValueStrategy } from './strategies/ev.js';
import { adversarialStrategy } from './strategies/adversarial.js';
import { greedyStrategy } from './strategies/greedy.js';
import { randomStrategy } from './strategies/random.js';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 参数解析 ====================

const args = process.argv.slice(2);
function getArg(name: string, defaultVal: number): number {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? parseInt(args[idx + 1]) : defaultVal;
}
function hasFlag(name: string): boolean {
    return args.includes(`--${name}`);
}

const config: TrainingConfig = {
    ...DEFAULT_TRAINING_CONFIG,
    generations: getArg('generations', 30),
    population: getArg('population', 16),
    gamesPerEval: getArg('games', 100),
    rounds: getArg('rounds', 20),
    baseSeed: getArg('seed', 12345),
    noiseStd: getArg('noise', 30) / 100,
    selfPlayOnly: hasFlag('self-play-only'),
};

// ==================== 训练 ====================

console.log('╔══════════════════════════════════════════════════╗');
console.log('║        Manila RL 策略训练器                       ║');
console.log('╚══════════════════════════════════════════════════╝');

const result = train(config);

console.log(`\n⏱  训练完成: ${(result.duration / 1000).toFixed(1)}s`);
console.log(`📊 最佳适应度: ${result.bestFitness.toFixed(2)}`);
console.log(`\n🏆 最佳权重:`);

for (const key of WEIGHT_KEYS) {
    const val = result.bestWeights[key];
    const bar = '█'.repeat(Math.min(20, Math.round(val * 10))).padEnd(20, '░');
    console.log(`  ${key.padEnd(16)} ${bar} ${val.toFixed(3)}`);
}

// 保存权重
const outputPath = path.resolve('trained_weights.json');
fs.writeFileSync(outputPath, JSON.stringify(result.bestWeights, null, 2));
console.log(`\n💾 权重已保存: ${outputPath}`);

// ==================== 验证 ====================

console.log('\n============ 训练后验证 ============\n');

const trainedStrategy = createTunedStrategy(result.bestWeights, 'trained');
const evalGames = 500;

interface MatchupResult {
    name: string;
    config: SimulationConfig;
    result: SimulationResult;
}

const matchups: { name: string; config: SimulationConfig }[] = [
    {
        name: '训练策略 vs 2 × 期望值',
        config: {
            games: evalGames, rounds: 20, playerCount: 3,
            strategies: [trainedStrategy, expectedValueStrategy, expectedValueStrategy],
            baseSeed: 77777,
        },
    },
    {
        name: '训练策略 vs 对抗性 vs 贪婪',
        config: {
            games: evalGames, rounds: 20, playerCount: 3,
            strategies: [trainedStrategy, adversarialStrategy, greedyStrategy],
            baseSeed: 88888,
        },
    },
    {
        name: '训练策略 vs 对抗性 vs 期望值',
        config: {
            games: evalGames, rounds: 20, playerCount: 3,
            strategies: [trainedStrategy, adversarialStrategy, expectedValueStrategy],
            baseSeed: 99999,
        },
    },
];

const matchupResults: MatchupResult[] = [];

for (const matchup of matchups) {
    console.log(`▶ ${matchup.name}`);
    const r = simulate(matchup.config);
    matchupResults.push({ name: matchup.name, config: matchup.config, result: r });

    console.log(`  完成: ${r.completedGames}/${r.totalGames} 局`);
    if (r.failedGames > 0) console.log(`  ⚠ 失败: ${r.failedGames} 局`);

    console.log('  ┌─────────────────┬──────┬────────┬────────┐');
    console.log('  │ 策略            │ 胜率 │ 平均分 │ 胜场   │');
    console.log('  ├─────────────────┼──────┼────────┼────────┤');

    for (const s of r.strategyStats) {
        const name = s.name.padEnd(15);
        const winRate = `${(s.winRate * 100).toFixed(1)}%`.padStart(5);
        const avg = s.avgScore.toFixed(1).padStart(6);
        const wins = String(s.wins).padStart(6);
        console.log(`  │ ${name} │ ${winRate} │ ${avg} │ ${wins} │`);
    }
    console.log('  └─────────────────┴──────┴────────┴────────┘\n');
}

console.log('✅ 训练和验证完成');

// ==================== 保存训练记录 & 生成报告 ====================

saveTrainingRecord(config, result, matchupResults);
generateReport(config, result, matchupResults);

// ==================== 训练记录 JSON ====================

function saveTrainingRecord(
    config: TrainingConfig,
    result: TrainingResult,
    matchups: MatchupResult[],
) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const record = {
        version: 'v4',
        timestamp: new Date().toISOString(),
        config: {
            generations: config.generations,
            population: config.population,
            eliteFraction: config.eliteFraction,
            noiseStd: config.noiseStd,
            gamesPerEval: config.gamesPerEval,
            rounds: config.rounds,
            baseSeed: config.baseSeed,
        },
        training: {
            duration_ms: result.duration,
            bestFitness: result.bestFitness,
            bestWeights: result.bestWeights,
            history: result.history.map(h => ({
                gen: h.generation + 1,
                best: +h.bestFitness.toFixed(2),
                avg: +h.avgFitness.toFixed(2),
            })),
        },
        validation: matchups.map(m => ({
            name: m.name,
            completed: m.result.completedGames,
            failed: m.result.failedGames,
            total: m.result.totalGames,
            strategies: m.result.strategyStats.map(s => ({
                name: s.name,
                winRate: +(s.winRate * 100).toFixed(1),
                avgScore: +s.avgScore.toFixed(1),
                wins: s.wins,
            })),
        })),
    };

    const recordDir = path.resolve('training_records');
    if (!fs.existsSync(recordDir)) fs.mkdirSync(recordDir, { recursive: true });

    const recordPath = path.join(recordDir, `record_${timestamp}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf-8');

    // 也保存一份 latest
    const latestPath = path.join(recordDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(record, null, 2), 'utf-8');

    console.log(`\n📁 训练记录已保存: ${recordPath}`);
}

// ==================== Markdown 复盘报告 ====================

function generateReport(
    config: TrainingConfig,
    result: TrainingResult,
    matchups: MatchupResult[],
) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const date = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });

    const lines: string[] = [];
    const L = (s: string) => lines.push(s);

    L(`# Manila RL 训练报告`);
    L(``);
    L(`> 生成时间: ${date}  `);
    L(`> 训练耗时: ${(result.duration / 1000).toFixed(1)}s`);
    L(``);

    // --- 训练配置 ---
    L(`## 训练配置`);
    L(``);
    L(`| 参数 | 值 |`);
    L(`|------|-----|`);
    L(`| 代数 | ${config.generations} |`);
    L(`| 种群大小 | ${config.population} |`);
    L(`| 精英比例 | ${(config.eliteFraction * 100).toFixed(0)}% |`);
    L(`| 噪声 σ | ${config.noiseStd} |`);
    L(`| 每轮评估局数 | ${config.gamesPerEval} |`);
    L(`| 游戏轮数 | ${config.rounds} |`);
    L(`| 随机种子 | ${config.baseSeed} |`);
    L(``);

    // --- 最佳权重 ---
    L(`## 最终权重`);
    L(``);
    L(`| 权重名称 | 值 | 范围 | 可视化 |`);
    L(`|---------|-----|------|--------|`);
    for (const key of WEIGHT_KEYS) {
        const val = result.bestWeights[key];
        const [lo, hi] = WEIGHT_BOUNDS[key];
        const pct = Math.min(100, Math.max(0, ((val - lo) / (hi - lo)) * 100));
        const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
        L(`| ${key} | ${val.toFixed(3)} | [${lo}, ${hi}] | \`${bar}\` |`);
    }
    L(``);

    // --- 训练曲线 ---
    L(`## 训练曲线`);
    L(``);
    L(`| 代 | 最佳适应度 | 平均适应度 |`);
    L(`|----|----------|----------|`);
    for (const h of result.history) {
        const gen = (h.generation + 1).toString().padStart(3);
        const marker = h.generation === result.history.length - 1 ? ' ⭐' : '';
        L(`| ${gen} | ${h.bestFitness.toFixed(1)} | ${h.avgFitness.toFixed(1)}${marker} |`);
    }
    L(``);

    // --- 汇总指标 ---
    const firstAvg = result.history[0]?.avgFitness ?? 0;
    const lastAvg = result.history[result.history.length - 1]?.avgFitness ?? 0;
    const peakBest = Math.max(...result.history.map(h => h.bestFitness));
    L(`**训练统计**: 平均适应度 ${firstAvg.toFixed(1)} → ${lastAvg.toFixed(1)} (Δ${(lastAvg - firstAvg) >= 0 ? '+' : ''}${(lastAvg - firstAvg).toFixed(1)}) | 峰值 ${peakBest.toFixed(1)}`);
    L(``);

    // --- 验证结果 ---
    L(`## 验证结果`);
    L(``);
    for (const m of matchups) {
        L(`### ${m.name}`);
        L(``);
        L(`> 完成 ${m.result.completedGames}/${m.result.totalGames} 局${m.result.failedGames > 0 ? ` (${m.result.failedGames} 局失败)` : ''}`);
        L(``);
        L(`| 策略 | 胜率 | 平均分 | 胜场 |`);
        L(`|------|------|--------|------|`);

        // 找到胜率最高的
        const maxWinRate = Math.max(...m.result.strategyStats.map(s => s.winRate));
        for (const s of m.result.strategyStats) {
            const crown = s.winRate === maxWinRate ? ' 🏆' : '';
            L(`| ${s.name}${crown} | ${(s.winRate * 100).toFixed(1)}% | ${s.avgScore.toFixed(1)} | ${s.wins} |`);
        }
        L(``);
    }

    // --- 权重分析 ---
    L(`## 权重分析`);
    L(``);

    // 找出最重要的和最不重要的权重
    const sorted = WEIGHT_KEYS
        .map(k => ({ key: k, val: result.bestWeights[k], bound: WEIGHT_BOUNDS[k] }))
        .sort((a, b) => {
            const pctA = (a.val - a.bound[0]) / (a.bound[1] - a.bound[0]);
            const pctB = (b.val - b.bound[0]) / (b.bound[1] - b.bound[0]);
            return pctB - pctA;
        });

    L(`**最高权重** (模型最重视):`);
    for (const w of sorted.slice(0, 4)) {
        const pct = ((w.val - w.bound[0]) / (w.bound[1] - w.bound[0]) * 100).toFixed(0);
        L(`- \`${w.key}\` = ${w.val.toFixed(3)} (${pct}% of range)`);
    }
    L(``);

    L(`**最低权重** (模型不重视):`);
    for (const w of sorted.slice(-4).reverse()) {
        const pct = ((w.val - w.bound[0]) / (w.bound[1] - w.bound[0]) * 100).toFixed(0);
        L(`- \`${w.key}\` = ${w.val.toFixed(3)} (${pct}% of range)`);
    }
    L(``);

    // --- 写入文件 ---
    const recordDir = path.resolve('training_records');
    if (!fs.existsSync(recordDir)) fs.mkdirSync(recordDir, { recursive: true });

    const reportPath = path.join(recordDir, `report_${timestamp}.md`);
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');

    const latestReportPath = path.join(recordDir, 'latest_report.md');
    fs.writeFileSync(latestReportPath, lines.join('\n'), 'utf-8');

    console.log(`📝 训练报告已保存: ${reportPath}`);
}
