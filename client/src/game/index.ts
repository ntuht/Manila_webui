// 导出引擎相关（从 @manila/engine 重新导出）
export { createGame, applyAction, getValidActions, isGameOver, getGameResult } from '@manila/engine';

// 导出类型
export type { GameState, GameConfig, Action, PlayerState, ShipState } from '@manila/engine';
