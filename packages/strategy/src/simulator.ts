/**
 * 蒙特卡洛模拟器 — 批量运行游戏对比策略
 */

import {
    createGame, applyAction, getValidActions, isGameOver, getGameResult,
    createSeededRNG,
    type GameState, type GameConfig, type RNG, type GameResult, type CargoType,
} from '@manila/engine';
import type { Strategy } from './strategy.js';

export interface SimulationConfig {
    games: number;            // 模拟总局数
    rounds: number;           // 每局轮数
    playerCount: 3 | 4;
    strategies: Strategy[];   // 每个玩家的策略
    baseSeed?: number;        // 基础种子（可复现）
    maxIterations?: number;   // 单局最大步数（防死循环）
}

export interface SimulationResult {
    config: SimulationConfig;
    totalGames: number;
    completedGames: number;
    failedGames: number;
    strategyStats: StrategyStats[];
    duration: number;         // ms
}

export interface StrategyStats {
    name: string;
    wins: number;
    winRate: number;
    avgScore: number;
    avgCash: number;
    avgStockValue: number;
    minScore: number;
    maxScore: number;
    scores: number[];         // 所有局的分数
}

/**
 * 运行模拟
 */
export function simulate(config: SimulationConfig): SimulationResult {
    const startTime = Date.now();

    if (config.strategies.length !== config.playerCount) {
        throw new Error(`策略数量 ${config.strategies.length} != 玩家数 ${config.playerCount}`);
    }

    const maxIter = config.maxIterations ?? 500;
    const stats: StrategyStats[] = config.strategies.map(s => ({
        name: s.name,
        wins: 0,
        winRate: 0,
        avgScore: 0,
        avgCash: 0,
        avgStockValue: 0,
        minScore: Infinity,
        maxScore: -Infinity,
        scores: [],
    }));

    let completedGames = 0;
    let failedGames = 0;

    for (let g = 0; g < config.games; g++) {
        const seed = (config.baseSeed ?? 0) + g;
        const rng = createSeededRNG(seed);

        try {
            const result = playOneGame(config, rng, maxIter);
            if (!result) {
                failedGames++;
                continue;
            }

            completedGames++;
            const rankings = result.rankings;

            for (let i = 0; i < config.playerCount; i++) {
                const ranking = rankings.find(r => r.playerId === `p${i}`);
                if (!ranking) continue;

                stats[i].scores.push(ranking.totalScore);
                if (ranking.rank === 1) stats[i].wins++;
                if (ranking.totalScore < stats[i].minScore) stats[i].minScore = ranking.totalScore;
                if (ranking.totalScore > stats[i].maxScore) stats[i].maxScore = ranking.totalScore;
            }
        } catch (e) {
            failedGames++;
        }
    }

    // 计算统计
    for (const s of stats) {
        s.winRate = completedGames > 0 ? s.wins / completedGames : 0;
        s.avgScore = s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
        if (s.minScore === Infinity) s.minScore = 0;
        if (s.maxScore === -Infinity) s.maxScore = 0;
    }

    return {
        config,
        totalGames: config.games,
        completedGames,
        failedGames,
        strategyStats: stats,
        duration: Date.now() - startTime,
    };
}

function playOneGame(
    config: SimulationConfig,
    rng: RNG,
    maxIterations: number
): GameResult | null {
    const gameConfig: GameConfig = {
        playerCount: config.playerCount,
        rounds: config.rounds,
        playerNames: config.strategies.map(s => s.name),
    };

    let state = createGame(gameConfig, rng);
    let iterations = 0;

    while (!isGameOver(state) && iterations < maxIterations) {
        const pending = state.pendingAction;
        if (!pending) break;

        const playerIndex = parseInt(pending.playerId.slice(1));
        const strategy = config.strategies[playerIndex];
        const validActions = getValidActions(state);

        if (validActions.length === 0) break;

        let action = strategy.chooseAction(state, validActions);

        // 特殊处理 BID — 策略可能返回带 amount 的 BID
        if (action.type === 'BID' && action.data.amount === undefined) {
            action = { ...action, data: { ...action.data, amount: (action.data.minBid as number) ?? 1 } };
        }

        state = applyAction(state, action, rng);
        iterations++;
    }

    return getGameResult(state);
}
