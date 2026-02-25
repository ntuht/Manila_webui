import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState as EngineState, Action, GameConfig as EngineConfig } from '@manila/engine';
import { createGame, applyAction, getValidActions } from '@manila/engine';
import { deriveUIState } from '../adapters/engineAdapter';
import { getStrategy } from '../ai/strategies';
import type { UIGameState, UIPhase, UIPlayerState, UIGameConfig, UIAIPlayerConfig } from '../types/uiTypes';

// ==================== Store Interface ====================

interface GameStore {
  // State
  engineState: EngineState | null;
  gameState: UIGameState | null;
  currentPhase: UIPhase;
  players: UIPlayerState[];
  isLoading: boolean;
  error: string | null;
  gameConfig: UIGameConfig | null;
  aiConfigs: Map<string, UIAIPlayerConfig>;

  // Game control
  startGame: (config: UIGameConfig) => void;
  endGame: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;

  // Core action dispatch
  dispatchAction: (action: Action) => { success: boolean; error?: string };

  // Player actions (convenience wrappers around dispatchAction)
  makeBid: (playerId: string, amount: number) => { success: boolean; error?: string };
  buyStock: (playerId: string, cargoType: string, quantity: number) => { success: boolean; error?: string };
  mortgageStock: (playerId: string, cargoType: string, quantity: number) => { success: boolean; error?: string };
  selectInvestment: (playerId: string, slotId: string) => { success: boolean; error?: string };
  useNavigator: (playerId: string, action: string) => { success: boolean; error?: string };
  rollDice: () => { success: boolean; error?: string };
  nextPhase: () => void;

  // Harbor Master
  buyHarborMasterStock: (cargoType: string) => { success: boolean; error?: string };
  skipStockPurchase: () => { success: boolean; error?: string };
  selectCargos: (cargos: string[]) => { success: boolean; error?: string };
  setShipPositions: (positions: Record<string, number>) => { success: boolean; error?: string };

  // Queries
  getValidActions: (playerId: string) => Action[];
  getPlayerState: (playerId: string) => UIPlayerState | undefined;
  getCurrentPlayer: () => UIPlayerState | undefined;
  getGameHistory: () => any[];
  getEngineState: () => EngineState | null;

  // Utils
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// ==================== AI Auto-Play ====================

let aiTimeoutId: ReturnType<typeof setTimeout> | null = null;
const AI_DELAY_MS = 600;

function scheduleAITurn() {
  if (aiTimeoutId) {
    clearTimeout(aiTimeoutId);
    aiTimeoutId = null;
  }

  const store = useGameStore.getState();
  const { engineState, aiConfigs } = store;
  if (!engineState?.pendingAction) return;

  const pa = engineState.pendingAction;
  const player = engineState.players.find(p => p.id === pa.playerId);
  if (!player?.isAI) return;

  // Find AI config for this player
  const aiConfig = aiConfigs.get(player.id);
  const strategyName = aiConfig?.strategy ?? 'onnx';
  const strategy = getStrategy(strategyName);

  console.log(`[AI] Scheduling ${player.name}'s turn (strategy: ${strategyName}, action: ${pa.actionType})`);

  aiTimeoutId = setTimeout(async () => {
    aiTimeoutId = null;
    try {
      const currentState = useGameStore.getState().engineState;
      if (!currentState?.pendingAction) return;

      // Double-check it's still this AI's turn
      const currentPA = currentState.pendingAction;
      if (currentPA.playerId !== player.id) return;

      const action = await strategy.selectAction(currentState, player.id);
      console.log(`[AI] ${player.name} chose: ${action.type}`, action.data);

      useGameStore.getState().dispatchAction(action);
    } catch (err) {
      console.error(`[AI] ${player.name} failed:`, err);
    }
  }, AI_DELAY_MS);
}

// ==================== Replay Auto-Save ====================

/**
 * Build a compact replay snapshot from engine state.
 * Persists to localStorage after every action so it's always available.
 */
function saveReplayToStorage(engineState: EngineState) {
  try {
    const replay = {
      timestamp: new Date().toISOString(),
      round: engineState.round,
      phase: engineState.phase,
      players: engineState.players.map(p => ({
        id: p.id,
        name: p.name,
        cash: p.cash,
        isAI: p.isAI,
        stocks: p.stocks,
      })),
      stockPrices: engineState.stockPrices,
      ships: engineState.ships.map(s => ({
        cargo: s.cargo,
        position: s.position,
        crew: s.crew.length,
      })),
      investments: engineState.investments.map(inv => ({
        slotId: inv.slotId,
        playerId: inv.playerId,
        type: inv.type,
        cost: inv.cost,
      })),
      log: engineState.log,
      gameResult: engineState.gameResult ?? null,
    };

    localStorage.setItem('manila_current_replay', JSON.stringify(replay));
  } catch (e) {
    // localStorage might be full — silently fail
    console.warn('[Replay] Failed to save:', e);
  }
}

/**
 * Auto-download a complete replay file when game ends.
 * File is named with timestamp for easy identification.
 */
function autoDownloadReplay(engineState: EngineState) {
  try {
    const replayData = JSON.parse(localStorage.getItem('manila_current_replay') || '{}');
    // Add final state
    replayData.gameResult = engineState.gameResult;
    replayData.finalPlayers = engineState.players.map(p => ({
      id: p.id, name: p.name, cash: p.cash,
      stocks: p.stocks,
    }));
    replayData.finalStockPrices = engineState.stockPrices;

    const blob = new Blob([JSON.stringify(replayData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `manila_replay_${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[Replay] Auto-downloaded replay file');
  } catch (e) {
    console.warn('[Replay] Failed to auto-download:', e);
  }
}

// ==================== Store Implementation ======================================

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      engineState: null,
      gameState: null,
      currentPhase: 'LOBBY' as UIPhase,
      players: [],
      isLoading: false,
      error: null,
      gameConfig: null,
      aiConfigs: new Map(),

      // ===================== Game Control =====================

      startGame: (config: UIGameConfig) => {
        try {
          // Build AI config map
          const aiConfigs = new Map<string, UIAIPlayerConfig>();

          // Map UI config → engine config
          const engineConfig: EngineConfig = {
            playerCount: config.players as 3 | 4,
            rounds: config.rounds,
            playerNames: [],
          };

          // Set up player names and AI flags
          const names: string[] = [];
          names.push('你'); // Player 0 is always human

          for (let i = 0; i < config.aiPlayers.length; i++) {
            const aiCfg = config.aiPlayers[i];
            names.push(aiCfg.name || `AI ${i + 1}`);
            aiConfigs.set(`p${i + 1}`, aiCfg);
          }

          // Fill remaining slots if needed
          while (names.length < config.players) {
            const idx = names.length;
            names.push(`AI ${idx}`);
            aiConfigs.set(`p${idx}`, { name: `AI ${idx}`, strategy: 'greedy' });
          }

          engineConfig.playerNames = names;

          // Create game using engine
          let engineState = createGame(engineConfig);

          // Mark AI players
          for (let i = 1; i < engineState.players.length; i++) {
            engineState.players[i].isAI = true;
          }

          const uiState = deriveUIState(engineState, config);

          set({
            engineState,
            gameState: uiState,
            currentPhase: uiState.phase,
            players: uiState.players,
            gameConfig: config,
            aiConfigs,
            error: null,
          });

          // Check if it's an AI player's turn right away
          scheduleAITurn();
        } catch (err) {
          set({ error: `游戏初始化失败: ${err}` });
        }
      },

      endGame: () => {
        set({
          engineState: null,
          gameState: null,
          currentPhase: 'LOBBY',
          players: [],
          error: null,
        });
      },

      resetGame: () => {
        const config = get().gameConfig;
        if (config) {
          get().startGame(config);
        }
      },

      pauseGame: () => { /* no-op for now */ },
      resumeGame: () => { /* no-op for now */ },

      // ===================== Core Dispatch =====================

      dispatchAction: (action: Action) => {
        const { engineState, gameConfig } = get();
        if (!engineState || !gameConfig) {
          return { success: false, error: '游戏未开始' };
        }

        try {
          const newEngineState = applyAction(engineState, action);
          const uiState = deriveUIState(newEngineState, gameConfig);

          set({
            engineState: newEngineState,
            gameState: uiState,
            currentPhase: uiState.phase,
            players: uiState.players,
            error: null,
          });

          // Auto-save replay after every action
          saveReplayToStorage(newEngineState);

          // Auto-download replay when game ends
          if (newEngineState.phase === 'GAME_OVER') {
            autoDownloadReplay(newEngineState);
          }

          // Check if next pendingAction belongs to an AI player
          scheduleAITurn();

          return { success: true };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          set({ error: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      // ===================== Player Actions =====================

      makeBid: (playerId: string, amount: number) => {
        if (amount <= 0) {
          // Pass auction
          return get().dispatchAction({
            type: 'PASS_AUCTION',
            playerId,
            data: {},
          });
        }
        return get().dispatchAction({
          type: 'BID',
          playerId,
          data: { amount },
        });
      },

      buyStock: (playerId: string, cargoType: string) => {
        return get().dispatchAction({
          type: 'BUY_STOCK',
          playerId,
          data: { cargo: cargoType },
        });
      },

      mortgageStock: (playerId: string, cargoType: string) => {
        return get().dispatchAction({
          type: 'MORTGAGE_STOCK',
          playerId,
          data: { cargo: cargoType },
        });
      },

      selectInvestment: (playerId: string, slotId: string) => {
        // Find the matching valid action to get the correct cost
        const engineState = get().engineState;
        if (!engineState) return { success: false, error: '游戏未开始' };

        const validActions = getValidActions(engineState);
        const matchingAction = validActions.find(
          a => a.type === 'SELECT_INVESTMENT' && a.data.slotId === slotId
        );

        if (matchingAction) {
          return get().dispatchAction(matchingAction);
        }

        // No fallback — if slotId doesn't match a valid action, it's a bug
        console.error(`[selectInvestment] slotId "${slotId}" not found in valid actions:`,
          validActions.filter(a => a.type === 'SELECT_INVESTMENT').map(a => a.data.slotId));
        return { success: false, error: `无效的投资槽位: ${slotId}` };
      },

      useNavigator: (playerId: string, action: string) => {
        if (action === 'skip' || action === 'PASS') {
          return get().dispatchAction({
            type: 'SKIP_NAVIGATOR',
            playerId,
            data: {},
          });
        }

        // Parse action string — expected format: "CARGO:delta"
        const [cargo, deltaStr] = action.split(':');
        const delta = parseInt(deltaStr);

        return get().dispatchAction({
          type: 'USE_NAVIGATOR',
          playerId,
          data: { cargo, delta },
        });
      },

      rollDice: () => {
        const engineState = get().engineState;
        if (!engineState || !engineState.pendingAction) {
          return { success: false, error: '不是掷骰阶段' };
        }

        return get().dispatchAction({
          type: 'ROLL_DICE',
          playerId: engineState.pendingAction.playerId,
          data: {},
        });
      },

      nextPhase: () => {
        // In the engine-driven model, phases advance automatically via actions.
        // This is a compatibility shim — if there's a pending ROLL_DICE or
        // ACKNOWLEDGE action, we auto-dispatch it.
        const engineState = get().engineState;
        if (!engineState || !engineState.pendingAction) return;

        const pa = engineState.pendingAction;
        if (pa.validActions.length === 1) {
          get().dispatchAction(pa.validActions[0]);
        }
      },

      // ===================== Harbor Master =====================

      buyHarborMasterStock: (cargoType: string) => {
        const engineState = get().engineState;
        if (!engineState?.pendingAction) {
          return { success: false, error: '非港务长阶段' };
        }

        return get().dispatchAction({
          type: 'BUY_STOCK',
          playerId: engineState.pendingAction.playerId,
          data: { cargo: cargoType },
        });
      },

      skipStockPurchase: () => {
        const engineState = get().engineState;
        if (!engineState?.pendingAction) {
          return { success: false, error: '非港务长阶段' };
        }

        return get().dispatchAction({
          type: 'SKIP_BUY_STOCK',
          playerId: engineState.pendingAction.playerId,
          data: {},
        });
      },

      selectCargos: (_cargos: string[]) => {
        // In the engine, cargo selection and position setting are done in a single
        // PLACE_SHIPS action. This method stores the selection temporarily.
        // The actual dispatch happens in setShipPositions.
        return { success: true };
      },

      setShipPositions: (positions: Record<string, number>) => {
        const engineState = get().engineState;
        if (!engineState?.pendingAction) {
          return { success: false, error: '非港务长阶段' };
        }

        const cargos = Object.keys(positions);
        return get().dispatchAction({
          type: 'PLACE_SHIPS',
          playerId: engineState.pendingAction.playerId,
          data: { cargos, positions },
        });
      },

      // ===================== Queries =====================

      getValidActions: (_playerId: string) => {
        const engineState = get().engineState;
        if (!engineState) return [];
        return getValidActions(engineState);
      },

      getPlayerState: (playerId: string) => {
        return get().gameState?.players.find(p => p.id === playerId);
      },

      getCurrentPlayer: () => {
        const state = get().gameState;
        if (!state) return undefined;
        return state.players[state.currentPlayerIndex];
      },

      getGameHistory: () => {
        return get().gameState?.history ?? [];
      },

      getEngineState: () => get().engineState,

      // ===================== Utils =====================

      setError: (error: string | null) => set({ error }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    { name: 'game-store' }
  )
);

// Expose store on window for debugging and tool access
// Usage: window.__gameStore.getState().engineState
(window as any).__gameStore = useGameStore;
