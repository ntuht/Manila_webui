/**
 * action-map 和 encoder 单元测试
 */

import { describe, it, expect } from 'vitest';
import {
    createGame, applyAction, getValidActions, isGameOver,
    createSeededRNG,
    type GameState, type Action,
} from '@manila/engine';
import {
    actionToId, idToAction, buildActionMask,
    ACTION_DIM, PLACEMENT_COMBOS, ALL_INVESTMENT_SLOTS, ACTION_RANGES,
} from '../src/action-map.js';
import { encodeState, OBS_DIM } from '../src/encoder.js';

// ==================== action-map 测试 ====================

describe('action-map', () => {
    describe('PLACEMENT_COMBOS', () => {
        it('should generate valid combos (each sums to 9, each 0-5)', () => {
            for (const combo of PLACEMENT_COMBOS) {
                const sum = combo.cargos.reduce(
                    (s, c) => s + (combo.positions[c] ?? 0), 0
                );
                expect(sum).toBe(9);
                for (const c of combo.cargos) {
                    const pos = combo.positions[c] ?? -1;
                    expect(pos).toBeGreaterThanOrEqual(0);
                    expect(pos).toBeLessThanOrEqual(5);
                }
                expect(combo.cargos).toHaveLength(3);
                expect(combo.cargos).not.toContain(combo.excludedCargo);
            }
        });

        it('should have 100 combos (4 excluded × 25 each)', () => {
            expect(PLACEMENT_COMBOS.length).toBe(100);
        });
    });

    describe('ALL_INVESTMENT_SLOTS', () => {
        it('should have 24 slots', () => {
            expect(ALL_INVESTMENT_SLOTS).toHaveLength(24);
        });

        it('should include all expected types', () => {
            expect(ALL_INVESTMENT_SLOTS.filter(s => s.startsWith('crew-'))).toHaveLength(13);
            expect(ALL_INVESTMENT_SLOTS.filter(s => s.startsWith('harbor-'))).toHaveLength(3);
            expect(ALL_INVESTMENT_SLOTS.filter(s => s.startsWith('shipyard-'))).toHaveLength(3);
            expect(ALL_INVESTMENT_SLOTS.filter(s => s.startsWith('pirate-'))).toHaveLength(2);
            expect(ALL_INVESTMENT_SLOTS.filter(s => s.startsWith('navigator-'))).toHaveLength(2);
            expect(ALL_INVESTMENT_SLOTS).toContain('insurance');
        });
    });

    describe('ACTION_RANGES', () => {
        it('should not overlap and fit within ACTION_DIM', () => {
            const allIds = new Set<number>();

            // 单值 ID
            for (const [key, val] of Object.entries(ACTION_RANGES)) {
                if (typeof val === 'number') {
                    expect(val).toBeLessThan(ACTION_DIM);
                    expect(allIds.has(val)).toBe(false);
                    allIds.add(val);
                } else {
                    const [start, end] = val as readonly [number, number];
                    expect(start).toBeGreaterThanOrEqual(0);
                    expect(end).toBeLessThan(ACTION_DIM);
                    expect(start).toBeLessThanOrEqual(end);
                    for (let i = start; i <= end; i++) {
                        expect(allIds.has(i)).toBe(false);
                        allIds.add(i);
                    }
                }
            }
        });
    });

    describe('BID round-trip', () => {
        it('should encode and decode BID actions correctly', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);

            // 创建一个 BID Action
            const bidAction: Action = {
                type: 'BID',
                playerId: 'p0',
                data: { amount: 15, minBid: 1, maxBid: 30 },
            };

            const id = actionToId(bidAction, state);
            expect(id).toBe(15); // 1-based: amount 15 → id 15

            // 反向解码
            const validActions: Action[] = [
                { type: 'BID', playerId: 'p0', data: { minBid: 1, maxBid: 30 } },
                { type: 'PASS_AUCTION', playerId: 'p0', data: {} },
            ];
            const decoded = idToAction(id, state, validActions);
            expect(decoded.type).toBe('BID');
            expect(decoded.data.amount).toBe(15);
        });
    });

    describe('buildActionMask', () => {
        it('should create mask with correct dimensions', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);
            const validActions = getValidActions(state);

            const mask = buildActionMask(validActions, state);
            expect(mask.length).toBe(ACTION_DIM);

            // 至少有一个合法动作
            const totalValid = Array.from(mask).reduce((s, v) => s + v, 0);
            expect(totalValid).toBeGreaterThan(0);
        });
    });
});

// ==================== encoder 测试 ====================

describe('encoder', () => {
    describe('encodeState', () => {
        it('should produce OBS_DIM-length float array', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);

            const obs = encodeState(state, 'p0');
            expect(obs.length).toBe(OBS_DIM);
            expect(obs).toBeInstanceOf(Float32Array);
        });

        it('should have values in [0, 1]', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);

            const obs = encodeState(state, 'p0');
            for (let i = 0; i < obs.length; i++) {
                expect(obs[i]).toBeGreaterThanOrEqual(0);
                expect(obs[i]).toBeLessThanOrEqual(1);
            }
        });

        it('should work for all player IDs', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);

            for (let i = 0; i < 3; i++) {
                const obs = encodeState(state, `p${i}`);
                expect(obs.length).toBe(OBS_DIM);
            }
        });

        it('should work for 4-player games', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 4, rounds: 20 }, rng);

            const obs = encodeState(state, 'p0');
            expect(obs.length).toBe(OBS_DIM);
        });

        it('should encode cash correctly', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);

            const obs = encodeState(state, 'p0');
            // 初始现金 30, 编码为 30/200 = 0.15
            expect(obs[0]).toBeCloseTo(0.15, 2);
        });

        it('should show AUCTION phase one-hot', () => {
            const rng = createSeededRNG(42);
            const state = createGame({ playerCount: 3, rounds: 20 }, rng);

            const obs = encodeState(state, 'p0');
            // phase one-hot 从 offset 49 开始, AUCTION = index 0
            expect(obs[49]).toBe(1.0); // AUCTION
            expect(obs[50]).toBe(0.0); // PLACEMENT
            expect(obs[51]).toBe(0.0); // INVEST
        });
    });
});

// ==================== 集成测试：全游戏 round-trip ====================

describe('integration', () => {
    it('should run a full random game with action encoding', () => {
        const rng = createSeededRNG(123);
        let state = createGame({ playerCount: 3, rounds: 20 }, rng);
        let steps = 0;
        const maxSteps = 500;

        while (!isGameOver(state) && steps < maxSteps) {
            const pending = state.pendingAction;
            if (!pending) break;

            const validActions = getValidActions(state);
            if (validActions.length === 0) break;

            // 编码当前状态
            const obs = encodeState(state, pending.playerId);
            expect(obs.length).toBe(OBS_DIM);

            // 构建 mask
            const mask = buildActionMask(validActions, state);
            expect(mask.length).toBe(ACTION_DIM);

            // 选择一个合法动作（随机选择）
            const legalIds: number[] = [];
            for (let i = 0; i < mask.length; i++) {
                if (mask[i] === 1) legalIds.push(i);
            }
            expect(legalIds.length).toBeGreaterThan(0);

            // 随机选一个合法 ID
            const chosenId = legalIds[rng.nextInt(0, legalIds.length - 1)];

            // 解码回 Action
            const action = idToAction(chosenId, state, validActions);
            expect(action.type).toBeTruthy();

            // BID 需要特殊处理 — 确保 amount 在范围内
            if (action.type === 'BID' && action.data.amount === undefined) {
                const minBid = (action.data.minBid as number) ?? 1;
                action.data.amount = minBid;
            }

            // 执行动作
            try {
                state = applyAction(state, action, rng);
            } catch (e) {
                throw new Error(
                    `Step ${steps} failed: phase=${state.phase} ` +
                    `actionType=${action.type} id=${chosenId} ` +
                    `data=${JSON.stringify(action.data)} ` +
                    `validTypes=${validActions.map(a => a.type).join(',')} ` +
                    `original: ${(e as Error).message}`
                );
            }
            steps++;
        }

        // 游戏应该正常结束或达到步数上限
        expect(steps).toBeGreaterThan(0);
    });
});
