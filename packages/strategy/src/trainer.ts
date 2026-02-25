/**
 * 进化策略训练器 — 通过自我对弈优化权重
 *
 * 算法：(μ, λ)-ES（进化策略）
 * 1. 生成 λ 个扰动候选
 * 2. 每个候选 vs EV 策略评估
 * 3. 选取 top-μ 的精英融合为下一代
 * 4. 重复
 */

import { simulate, type SimulationConfig } from './simulator.js';
import { expectedValueStrategy } from './strategies/ev.js';
import {
    createTunedStrategy,
    DEFAULT_WEIGHTS,
    WEIGHT_KEYS,
    weightsToArray,
    arrayToWeights,
    type StrategyWeights,
} from './strategies/tuned.js';

// ==================== 训练配置 ====================

export interface TrainingConfig {
    generations: number;
    population: number;
    eliteFraction: number;
    noiseStd: number;
    gamesPerEval: number;
    rounds: number;
    baseSeed: number;
    selfPlayOnly: boolean;
}

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
    generations: 50,
    population: 20,
    eliteFraction: 0.2,
    noiseStd: 0.15,
    gamesPerEval: 200,
    rounds: 20,
    baseSeed: 12345,
    selfPlayOnly: false,
};

// ==================== 训练结果 ====================

export interface TrainingResult {
    bestWeights: StrategyWeights;
    bestFitness: number;
    history: GenerationResult[];
    duration: number;
}

export interface GenerationResult {
    generation: number;
    bestFitness: number;
    avgFitness: number;
    bestWeights: number[];
    eliteCount: number;
}

// ==================== 高斯噪声 ====================

function gaussianNoise(std: number, seed: number): number {
    // Box-Muller with inline LCG
    let s = seed;
    function lcg(): number {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        return s / 0x7fffffff;
    }
    const u1 = Math.max(lcg(), 1e-10);
    const u2 = lcg();
    return std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ==================== 适应度评估 ====================

function evaluateFitness(
    weights: StrategyWeights,
    config: TrainingConfig,
    evalSeed: number,
): number {
    const strategy = createTunedStrategy(weights, 'candidate');

    // vs EV 策略（1 vs 2）
    const vsEV: SimulationConfig = {
        games: config.gamesPerEval,
        rounds: config.rounds,
        playerCount: 3,
        strategies: [strategy, expectedValueStrategy, expectedValueStrategy],
        baseSeed: evalSeed,
    };
    const result = simulate(vsEV);

    if (result.completedGames === 0) return -999;

    const winRate = result.strategyStats[0].winRate;
    const myAvg = result.strategyStats[0].avgScore;
    const oppAvg = (result.strategyStats[1].avgScore + result.strategyStats[2].avgScore) / 2;

    // 适应度 = 胜率 × 50 + 绝对分 × 0.5 + 分差 × 0.3
    // 同时重视胜负和绝对分数，防止破坏性策略
    let fitness = winRate * 50 + myAvg * 0.5 + (myAvg - oppAvg) * 0.3;

    // 惩罚低绝对分数 — 防止自残式策略
    if (myAvg < 30) fitness -= 20;

    return fitness;
}

// ==================== 训练主循环 ====================

export function train(config: TrainingConfig): TrainingResult {
    const startTime = Date.now();
    const history: GenerationResult[] = [];
    const eliteCount = Math.max(1, Math.floor(config.population * config.eliteFraction));

    let currentWeights = weightsToArray(DEFAULT_WEIGHTS);

    console.log(`\n🧬 进化策略训练`);
    console.log(`   代数: ${config.generations} | 种群: ${config.population} | 精英: ${eliteCount}`);
    console.log(`   噪声: σ=${config.noiseStd} | 每轮评估: ${config.gamesPerEval} 局\n`);

    for (let gen = 0; gen < config.generations; gen++) {
        const genSeed = config.baseSeed + gen * 10000;

        const candidates: { weights: number[]; fitness: number }[] = [];

        for (let i = 0; i < config.population; i++) {
            const perturbedWeights = currentWeights.map((w, j) => {
                const noise = gaussianNoise(config.noiseStd, genSeed + i * 100 + j);
                return w + noise;
            });

            const weights = arrayToWeights(perturbedWeights);
            const fitness = evaluateFitness(weights, config, genSeed + i * 1000);
            candidates.push({ weights: perturbedWeights, fitness });
        }

        // 评估当前权重
        {
            const fitness = evaluateFitness(arrayToWeights(currentWeights), config, genSeed + 99999);
            candidates.push({ weights: [...currentWeights], fitness });
        }

        candidates.sort((a, b) => b.fitness - a.fitness);
        const elites = candidates.slice(0, eliteCount);

        // 精英平均
        const newWeights = new Array(currentWeights.length).fill(0);
        for (const elite of elites) {
            for (let j = 0; j < newWeights.length; j++) {
                newWeights[j] += elite.weights[j] / eliteCount;
            }
        }
        currentWeights = newWeights;

        const bestFitness = candidates[0].fitness;
        const avgFitness = candidates.reduce((s, c) => s + c.fitness, 0) / candidates.length;

        history.push({
            generation: gen,
            bestFitness,
            avgFitness,
            bestWeights: [...candidates[0].weights],
            eliteCount,
        });

        const bar = '█'.repeat(Math.floor((gen + 1) / config.generations * 20)).padEnd(20, '░');
        console.log(
            `  [${bar}] 第 ${(gen + 1).toString().padStart(3)} 代` +
            ` | 最佳: ${bestFitness.toFixed(1)}` +
            ` | 均值: ${avgFitness.toFixed(1)}`
        );

        if ((gen + 1) % 10 === 0 || gen === config.generations - 1) {
            const clamped = arrayToWeights(currentWeights);
            const weightsStr = WEIGHT_KEYS.map(k => `${k}=${clamped[k].toFixed(2)}`).join(' ');
            console.log(`    权重: ${weightsStr}`);
        }
    }

    const bestWeights = arrayToWeights(currentWeights);
    const bestFitness = history[history.length - 1].bestFitness;

    return { bestWeights, bestFitness, history, duration: Date.now() - startTime };
}
