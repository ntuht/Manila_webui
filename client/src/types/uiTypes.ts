/**
 * UI View Model Types
 *
 * These types are derived from @manila/engine's GameState via the adapter layer.
 * Components should import from here for UI-specific types, and from
 * @manila/engine for shared engine types (CargoType, InvestmentType, etc.)
 */

// Re-export common engine types that UI components use directly
export type { CargoType, InvestmentType, ActionType, Phase } from '@manila/engine';
export type { Action, PendingAction } from '@manila/engine';

// ==================== UI Game Phases ====================

/** UI-level phases — superset of engine phases, includes LOBBY */
export type UIPhase =
    | 'LOBBY'
    | 'AUCTION'
    | 'HARBOR_MASTER'   // maps from engine PLACEMENT when in buy-stock / cargo-select / position-set
    | 'INVESTMENT'       // maps from engine INVEST
    | 'SAILING'          // maps from engine SAIL
    | 'NAVIGATOR_USE'    // sub-phase during SAIL
    | 'SETTLEMENT'       // maps from engine SETTLE
    | 'GAME_END';        // maps from engine GAME_OVER

// Harbor Master sub-steps
export type HarborMasterPhase =
    | 'BUY_STOCK'
    | 'SELECT_CARGO'     // derived: PLACE_SHIPS pending → selecting cargos
    | 'SET_POSITIONS';   // derived: PLACE_SHIPS pending → setting positions

// ==================== UI Player State ====================

export interface UIPlayerState {
    id: string;
    name: string;
    cash: number;
    stocks: UIStockHolding[];
    investments: UIInvestment[];   // per-player view (extracted from engine global investments)
    isActive: boolean;
    isAI: boolean;
    aiStrategy?: string;
    isCurrentPlayer?: boolean;
}

export interface UIStockHolding {
    cargoType: CargoType;
    quantity: number;
    isMortgaged?: boolean;
    mortgagedCount: number;       // how many are mortgaged
}

export interface UIInvestment {
    id: string;
    slotId: string;
    type: InvestmentType;
    cost: number;
    expectedReward: number;
    round: number;
    phase: UIPhase;
}

// ==================== UI Ship State ====================

export interface UIShipState {
    id: string;
    cargoType: CargoType;
    position: number;
    crew: UICrewMember[];
    isDocked: boolean;
    isInShipyard: boolean;
    isHijacked: boolean;
}

export interface UICrewMember {
    playerId: string;
    playerName: string;
    seatNumber: number;
    cost: number;
}

// ==================== UI Sub-states ====================

export interface UIHarborMasterState {
    playerId: string;
    currentStep: HarborMasterPhase;
    selectedCargos: CargoType[];
    shipPositions: Record<CargoType, number>;
    hasCompletedStockPurchase: boolean;
}

export interface UIInvestmentRoundState {
    currentRound: number;
    totalRounds: number;
    currentPlayerIndex: number;
    investmentOrder: string[];
}

export interface UIGameFlow {
    eventSequence: string[];
    currentEventIndex: number;
}

export interface UIDiceResult {
    dice1: number;
    dice2: number;
    dice3: number;
    total: number;
    phase: number;   // which roll (1-3)
}

export interface UIStockPrices {
    JADE: number;
    SILK: number;
    GINSENG: number;
    NUTMEG: number;
}

// ==================== UI Game State ====================

export interface UIGameState {
    gameId: string;
    phase: UIPhase;
    round: number;
    players: UIPlayerState[];
    ships: UIShipState[];
    stockPrices: UIStockPrices;
    gameConfig: UIGameConfig;
    currentPlayerIndex: number;
    auctionWinner?: string;
    diceResults?: UIDiceResult[];
    harborMaster?: UIHarborMasterState;
    investmentRound?: UIInvestmentRoundState;
    selectedCargos?: CargoType[];
    sailingPhase?: number;
    gameFlow?: UIGameFlow;
    history: UIHistoryEntry[];
}

export interface UIGameConfig {
    players: number;
    rounds: number;
    aiPlayers: UIAIPlayerConfig[];
}

export interface UIAIPlayerConfig {
    name: string;
    strategy: string;   // 'greedy' | 'risk_aware' | 'conservative' | 'onnx'
}

export interface UIHistoryEntry {
    id: string;
    timestamp: number;
    round: number;
    phase: UIPhase;
    playerId: string;
    action: string;
    detail: string;
}

// ==================== Game Result ====================

export interface UIGameResult {
    rankings: UIPlayerRanking[];
    totalRounds: number;
}

export interface UIPlayerRanking {
    playerId: string;
    name: string;
    cash: number;
    stockValue: number;
    mortgagePenalty: number;
    totalScore: number;
    rank: number;
}
