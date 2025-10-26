// 导出所有类型定义
export * from './game';

// 重新导出常用类型
export type {
  CargoType,
  GamePhase,
  ActionType,
  PlayerState,
  GameState,
  GameConfig,
  GameAction,
  ActionResult,
  InvestmentSlot,
  AIStrategy
} from './game';
