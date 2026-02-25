/**
 * 策略接口 — 每个策略只需实现 chooseAction
 */

import type { GameState, Action } from '@manila/engine';

export interface Strategy {
    name: string;
    description: string;
    /** 从合法动作中选择一个 */
    chooseAction(state: GameState, validActions: Action[]): Action;
}
