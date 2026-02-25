/**
 * Types barrel file — re-exports from uiTypes
 *
 * This maintains backward compatibility with existing component imports.
 * Components using `import type { ... } from '../../types'` will
 * automatically get the new UI view model types.
 */

export * from './uiTypes';

// Backward-compatible aliases for components that use old names
export type { UIGameState as GameState } from './uiTypes';
export type { UIPhase as GamePhase } from './uiTypes';
export type { UIPlayerState as PlayerState } from './uiTypes';
export type { UIShipState as ShipState } from './uiTypes';
export type { UIStockHolding as StockHolding } from './uiTypes';
export type { UIInvestment as Investment } from './uiTypes';
export type { UICrewMember as CrewMember } from './uiTypes';
export type { UIDiceResult as DiceResult } from './uiTypes';
export type { UIStockPrices as StockPrices } from './uiTypes';
export type { UIGameConfig as GameConfig } from './uiTypes';
export type { UIHarborMasterState as HarborMasterState } from './uiTypes';
export type { UIInvestmentRoundState as InvestmentRoundState } from './uiTypes';
export type { UIGameFlow as GameFlow } from './uiTypes';
export type { UIHistoryEntry as GameHistoryEntry } from './uiTypes';
export type { UIGameResult as GameResult } from './uiTypes';
export type { UIPlayerRanking as PlayerRanking } from './uiTypes';
export type { InvestmentType as InvestmentSlotType } from './uiTypes';

// Legacy types that components may reference (stubs for compatibility)
export type GameEvent = string;
export type NavigatorAction = 'MOVE_FORWARD' | 'MOVE_BACKWARD' | 'PASS';
export type NavigatorActionType = 'SMALL_NAVIGATOR' | 'BIG_NAVIGATOR';
export type PirateAction = 'BOARD' | 'KICK' | 'PASS';

// Legacy interfaces for type compatibility
export interface GameAction {
  type: string;
  playerId: string;
  data: any;
  timestamp: number;
}

export interface ActionResult {
  success: boolean;
  newState?: any;
  error?: string;
  validActions?: GameAction[];
}

export interface InvestmentSlot {
  id: string;
  type: string;
  cost: number;
  reward: number;
  isOccupied: boolean;
  occupiedBy?: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  autoPlay: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  theme: 'LIGHT' | 'DARK';
  language: 'EN' | 'ZH';
}
