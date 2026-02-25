/**
 * 统计脚本: 跑 1000 局随机游戏, 收集每个价格水平的剩余轮次数据
 */
import { createGame, applyAction, getValidActions, ALL_CARGO, STOCK_PRICE_LEVELS } from '@manila/engine';
import type { GameState, Action, CargoType } from '@manila/engine';
import { PLACEMENT_COMBOS } from './action-map.js';

function randomAction(state: GameState): Action {
    const actions = getValidActions(state);
    if (actions.length === 0) throw new Error('No actions');

    // PLACE_SHIPS needs a valid combo
    if (state.pendingAction?.actionType === 'PLACE_SHIPS') {
        const combo = PLACEMENT_COMBOS[Math.floor(Math.random() * PLACEMENT_COMBOS.length)];
        return {
            type: 'PLACE_SHIPS',
            playerId: state.pendingAction.playerId,
            data: { cargos: [...combo.cargos], positions: { ...combo.positions } },
        };
    }

    return actions[Math.floor(Math.random() * actions.length)];
}

const NUM_GAMES = 1000;
const MAX_STEPS = 800;

// 记录: 每个价格水平首次出现时, 距离游戏结束还有多少轮
const remainingWhenPrice: Record<number, number[]> = {};
for (const p of STOCK_PRICE_LEVELS) remainingWhenPrice[p] = [];

const totalRounds: number[] = [];

for (let g = 0; g < NUM_GAMES; g++) {
    let state = createGame({ playerCount: 3, rounds: 20 });

    // 每轮结束时记录的最高股价
    const priceFirstSeen: Record<number, number> = {}; // price -> round first seen
    let prevRound = 0;
    let steps = 0;

    while (state.phase !== 'GAME_OVER' && steps < MAX_STEPS) {
        const action = randomAction(state);
        state = applyAction(state, action);
        steps++;

        // 每当轮次变化, 记录股价
        if (state.round !== prevRound) {
            prevRound = state.round;
            const maxPrice = Math.max(...ALL_CARGO.map(c => state.stockPrices[c] ?? 0));
            for (const p of STOCK_PRICE_LEVELS) {
                if (maxPrice >= p && !(p in priceFirstSeen)) {
                    priceFirstSeen[p] = state.round - 1;
                }
            }
        }
    }

    const finalRound = state.round;
    totalRounds.push(finalRound);

    // 对每个已记录的价格, 计算剩余轮次
    const maxPrice = Math.max(...ALL_CARGO.map(c => state.stockPrices[c] ?? 0));
    for (const p of STOCK_PRICE_LEVELS) {
        if (maxPrice >= p && p in priceFirstSeen) {
            remainingWhenPrice[p].push(finalRound - priceFirstSeen[p]);
        }
    }
}

// 输出统计
const lines: string[] = [];
const log = (s: string) => { console.log(s); lines.push(s); };

const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const median = (arr: number[]) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };

// 总轮次分布
const roundDist: Record<number, number> = {};
for (const r of totalRounds) roundDist[r] = (roundDist[r] || 0) + 1;
log(`Total rounds: avg=${avg(totalRounds).toFixed(1)}, median=${median(totalRounds)}`);
log(`Distribution: ${JSON.stringify(roundDist)}`);
log('');

// 每个价格水平的剩余轮次
log(`Remaining rounds when max price first reaches each level:`);
log(`${'Price'.padStart(6)} | ${'Count'.padStart(6)} | ${'Avg'.padStart(6)} | ${'Median'.padStart(6)} | ${'P25'.padStart(6)} | ${'P75'.padStart(6)}`);
log('-'.repeat(55));
for (const p of STOCK_PRICE_LEVELS) {
    const data = remainingWhenPrice[p];
    if (data.length === 0) { log(`${String(p).padStart(6)} | ${String(0).padStart(6)} | N/A`); continue; }
    const sorted = [...data].sort((a, b) => a - b);
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    log(`${String(p).padStart(6)} | ${String(data.length).padStart(6)} | ${avg(data).toFixed(1).padStart(6)} | ${String(median(data)).padStart(6)} | ${String(p25).padStart(6)} | ${String(p75).padStart(6)}`);
}

import { writeFileSync } from 'fs';
writeFileSync('game-stats-output.txt', lines.join('\n'));
log('\nWritten to game-stats-output.txt');
