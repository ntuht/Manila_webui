/**
 * @manila/rl — 强化学习训练桥接包
 *
 * 提供 GameState 编码器和动作空间映射，
 * 用于连接 TS 引擎与 Python PPO 训练器。
 */

export { encodeState, OBS_DIM } from './encoder.js';
export {
    actionToId, idToAction, buildActionMask,
    ACTION_DIM, PLACEMENT_COMBOS, ALL_INVESTMENT_SLOTS,
    ACTION_RANGES,
    type PlacementCombo,
} from './action-map.js';
