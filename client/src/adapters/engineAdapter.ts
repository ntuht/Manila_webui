/**
 * Engine Adapter Layer
 *
 * Converts @manila/engine's GameState into UIGameState for consumption by
 * React components. This is the single translation point between the
 * functional engine and the UI layer.
 */

import type { GameState, Investment, CargoType } from '@manila/engine';
import { SHIP_DOCK_POSITION, ALL_CARGO } from '@manila/engine';
import type {
    UIGameState, UIPlayerState, UIShipState, UIStockHolding,
    UIInvestment, UICrewMember, UIPhase, UIDiceResult,
    UIHarborMasterState, UIInvestmentRoundState, UIGameFlow,
    UIStockPrices, HarborMasterPhase, UIGameConfig, PlayerColor,
} from '../types/uiTypes';

// ==================== Main Adapter ====================

/**
 * Convert raw engine GameState → UIGameState for components
 */
export function deriveUIState(
    engine: GameState,
    gameConfig: UIGameConfig,
    gameId: string = 'local',
    playerColors: Record<string, PlayerColor> = {},
): UIGameState {
    const uiPhase = mapPhase(engine);
    const players = engine.players.map(p =>
        derivePlayer(p, engine, uiPhase, playerColors[p.id] ?? 'red')
    );
    const ships = engine.ships.map(s => deriveShip(s, engine));
    const diceResults = deriveDiceResults(engine);
    const harborMaster = deriveHarborMasterState(engine);
    const investmentRound = deriveInvestmentRound(engine);
    const selectedCargos = engine.ships.length > 0
        ? engine.ships.map(s => s.cargo)
        : undefined;
    const gameFlow = deriveGameFlow(engine);

    return {
        gameId,
        phase: uiPhase,
        round: engine.round,
        players,
        ships,
        stockPrices: engine.stockPrices as UIStockPrices,
        gameConfig,
        currentPlayerIndex: engine.currentPlayerIndex,
        auctionWinner: engine.harborMasterId,
        diceResults: diceResults.length > 0 ? diceResults : undefined,
        harborMaster,
        investmentRound,
        selectedCargos,
        sailingPhase: engine.currentRollIndex + 1,
        gameFlow,
        history: engine.log.map((entry, idx) => ({
            id: `log-${idx}`,
            timestamp: entry.timestamp,
            round: entry.round,
            phase: mapEnginePhaseToUI(entry.phase),
            playerId: entry.playerId,
            action: entry.action,
            detail: entry.detail,
        })),
    };
}

// ==================== Phase Mapping ====================

function mapPhase(engine: GameState): UIPhase {
    const pa = engine.pendingAction;

    switch (engine.phase) {
        case 'AUCTION':
            return 'AUCTION';
        case 'PLACEMENT':
            // PLACEMENT covers: buy stock → select cargos → set positions
            if (pa) {
                if (pa.actionType === 'BUY_STOCK') return 'HARBOR_MASTER';
                if (pa.actionType === 'PLACE_SHIPS') return 'HARBOR_MASTER';
            }
            return 'HARBOR_MASTER';
        case 'INVEST':
            return 'INVESTMENT';
        case 'SAIL':
            // Check if we're in navigator use sub-phase
            if (pa && (pa.actionType === 'USE_NAVIGATOR' || pa.actionType === 'SKIP_NAVIGATOR')) {
                return 'SAILING'; // keep as SAILING, but could differentiate
            }
            return 'SAILING';
        case 'SETTLE':
            return 'SETTLEMENT';
        case 'GAME_OVER':
            return 'GAME_END';
        default:
            return 'LOBBY';
    }
}

function mapEnginePhaseToUI(phase: string): UIPhase {
    const map: Record<string, UIPhase> = {
        'AUCTION': 'AUCTION',
        'PLACEMENT': 'HARBOR_MASTER',
        'INVEST': 'INVESTMENT',
        'SAIL': 'SAILING',
        'SETTLE': 'SETTLEMENT',
        'GAME_OVER': 'GAME_END',
    };
    return map[phase] ?? 'LOBBY';
}

// ==================== Player Mapping ====================

function derivePlayer(
    player: { id: string; name: string; cash: number; stocks: { cargo: CargoType; quantity: number; mortgaged: number }[]; isAI: boolean },
    engine: GameState,
    uiPhase: UIPhase,
    color: PlayerColor = 'red',
): UIPlayerState {
    // Extract per-player investments from the global list
    const playerInvestments: UIInvestment[] = engine.investments
        .filter(inv => inv.playerId === player.id)
        .map((inv, idx) => ({
            id: `inv-${player.id}-${idx}`,
            slotId: inv.slotId,
            type: inv.type,
            cost: inv.cost,
            expectedReward: inv.reward,
            round: engine.round,
            phase: uiPhase,
        }));

    // Map stocks
    const stocks: UIStockHolding[] = ALL_CARGO.map(cargo => {
        const stock = player.stocks.find(s => s.cargo === cargo);
        return {
            cargoType: cargo,
            quantity: stock?.quantity ?? 0,
            isMortgaged: (stock?.mortgaged ?? 0) > 0,
            mortgagedCount: stock?.mortgaged ?? 0,
        };
    }).filter(s => s.quantity > 0);

    const isCurrentPlayer = engine.pendingAction?.playerId === player.id;

    return {
        id: player.id,
        name: player.name,
        cash: player.cash,
        color,
        stocks,
        investments: playerInvestments,
        isActive: true,
        isAI: player.isAI,
        isCurrentPlayer,
    };
}

// ==================== Ship Mapping ====================

function deriveShip(
    ship: { cargo: CargoType; position: number; crew: { playerId: string; seatIndex: number; cost: number }[] },
    engine: GameState,
): UIShipState {
    const isSettled = engine.phase === 'SETTLE' || engine.phase === 'GAME_OVER';
    return {
        id: `ship-${ship.cargo}`,
        cargoType: ship.cargo,
        position: ship.position,
        crew: ship.crew.map(c => ({
            playerId: c.playerId,
            playerName: engine.players.find(p => p.id === c.playerId)?.name ?? c.playerId,
            seatNumber: c.seatIndex + 1, // UI uses 1-based
            cost: c.cost,
        })),
        isDocked: ship.position >= SHIP_DOCK_POSITION,
        isInShipyard: isSettled && ship.position < SHIP_DOCK_POSITION,  // only show after settlement
        isHijacked: false, // engine doesn't have hijack in current version
    };
}

// ==================== Dice Results Mapping ====================

function deriveDiceResults(engine: GameState): UIDiceResult[] {
    // Filter dice results for current round
    const currentRoundDice = engine.diceHistory.filter(d => d.round === engine.round);

    return currentRoundDice.map(d => ({
        dice1: d.values[0],
        dice2: d.values[1],
        dice3: d.values[2],
        total: d.values[0] + d.values[1] + d.values[2],
        phase: d.rollIndex + 1,  // 1-based for UI
    }));
}

// ==================== Harbor Master State ====================

function deriveHarborMasterState(engine: GameState): UIHarborMasterState | undefined {
    if (engine.phase !== 'PLACEMENT') return undefined;

    const masterId = engine.harborMasterId;
    if (!masterId) return undefined;

    const pa = engine.pendingAction;
    let currentStep: HarborMasterPhase = 'BUY_STOCK';
    let hasCompletedStockPurchase = false;

    if (pa) {
        if (pa.actionType === 'BUY_STOCK') {
            currentStep = 'BUY_STOCK';
        } else if (pa.actionType === 'PLACE_SHIPS') {
            // In the engine, PLACE_SHIPS is a single action that selects cargos AND positions.
            // For UI purposes, we'll show the combined step as SET_POSITIONS
            currentStep = 'SET_POSITIONS';
            hasCompletedStockPurchase = true;
        }
    }

    const selectedCargos = engine.ships.map(s => s.cargo);

    return {
        playerId: masterId,
        currentStep,
        selectedCargos,
        shipPositions: {} as Record<CargoType, number>,
        hasCompletedStockPurchase,
    };
}

// ==================== Investment Round State ====================

function deriveInvestmentRound(engine: GameState): UIInvestmentRoundState | undefined {
    if (engine.phase !== 'INVEST') return undefined;

    const pa = engine.pendingAction;
    if (!pa) return undefined;

    // Count invest steps completed
    const totalInvestSteps = engine.roundSteps.filter(s => s.type === 'INVEST').length;
    const currentInvestStep = engine.roundSteps
        .slice(0, engine.currentStepIndex + 1)
        .filter(s => s.type === 'INVEST').length;

    // Build investment order (starting from harbor master)
    const masterIdx = engine.players.findIndex(p => p.id === engine.harborMasterId);
    const order: string[] = [];
    for (let i = 0; i < engine.players.length; i++) {
        order.push(engine.players[(masterIdx + i) % engine.players.length].id);
    }

    return {
        currentRound: currentInvestStep,
        totalRounds: totalInvestSteps,
        currentPlayerIndex: engine.investTurnIndex,
        investmentOrder: order,
    };
}

// ==================== Game Flow ====================

function deriveGameFlow(engine: GameState): UIGameFlow | undefined {
    if (engine.roundSteps.length === 0) return undefined;

    // Map roundSteps to event sequence
    const events: string[] = ['AUCTION', 'HARBOR_MASTER'];

    for (const step of engine.roundSteps) {
        if (step.type === 'INVEST') {
            events.push('INVESTMENT');
        } else {
            events.push('DICE_ROLL');
        }
    }
    events.push('SETTLEMENT');

    // Determine current event index
    let currentEventIndex = 0;
    if (engine.phase === 'AUCTION') {
        currentEventIndex = 0;
    } else if (engine.phase === 'PLACEMENT') {
        currentEventIndex = 1;
    } else {
        // Offset by 2 (auction + harbor_master) + currentStepIndex
        currentEventIndex = 2 + engine.currentStepIndex;
    }

    return {
        eventSequence: events,
        currentEventIndex: Math.min(currentEventIndex, events.length - 1),
    };
}
