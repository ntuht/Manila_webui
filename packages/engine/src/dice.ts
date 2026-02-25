/**
 * 骰子模块 — 可注入 RNG，支持确定性测试
 */

import type { RNG, DiceResult } from './types.js';

/**
 * 默认 RNG：使用 Math.random
 */
export const defaultRNG: RNG = {
    nextInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
};

/**
 * 创建固定序列 RNG（用于测试）
 */
export function createFixedRNG(values: number[]): RNG {
    let index = 0;
    return {
        nextInt(_min: number, _max: number): number {
            const value = values[index % values.length];
            index++;
            return value;
        },
    };
}

/**
 * 创建种子 RNG（用于可复现的模拟）
 * 使用简单的线性同余生成器 (LCG)
 */
export function createSeededRNG(seed: number): RNG {
    let state = seed;
    return {
        nextInt(min: number, max: number): number {
            // LCG: state = (a * state + c) mod m
            state = (state * 1664525 + 1013904223) & 0xffffffff;
            const normalized = (state >>> 0) / 0x100000000;
            return Math.floor(normalized * (max - min + 1)) + min;
        },
    };
}

/**
 * 投掷 3 个骰子
 */
export function rollDice(rng: RNG, round: number, rollIndex: number): DiceResult {
    return {
        values: [
            rng.nextInt(1, 6),
            rng.nextInt(1, 6),
            rng.nextInt(1, 6),
        ],
        round,
        rollIndex,
    };
}
