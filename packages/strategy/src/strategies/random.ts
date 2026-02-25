/**
 * 随机策略 — 基线，随机选择合法动作
 */

import type { GameState, Action, CargoType } from '@manila/engine';
import type { Strategy } from '../strategy.js';

/** 默认布置方案 */
const DEFAULT_CARGOS: CargoType[] = ['JADE', 'SILK', 'GINSENG'];
const DEFAULT_POSITIONS: Record<CargoType, number> = { JADE: 3, SILK: 3, GINSENG: 3, NUTMEG: 0 };

export const randomStrategy: Strategy = {
    name: 'random',
    description: '随机选择合法动作（基线）',

    chooseAction(_state: GameState, validActions: Action[]): Action {
        // PLACE_SHIPS needs data injection
        if (validActions[0]?.type === 'PLACE_SHIPS') {
            return {
                ...validActions[0],
                data: {
                    cargos: DEFAULT_CARGOS,
                    positions: DEFAULT_POSITIONS,
                },
            };
        }

        const idx = Math.floor(Math.random() * validActions.length);
        return validActions[idx];
    },
};
