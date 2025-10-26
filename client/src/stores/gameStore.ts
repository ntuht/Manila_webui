import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GameState, GamePhase, PlayerState, GameAction, ActionResult, GameConfig } from '../types';
import { GameEngine } from '../game/engine';

interface GameStore {
  // 状态
  gameState: GameState | null;
  currentPhase: GamePhase;
  players: PlayerState[];
  isLoading: boolean;
  error: string | null;
  engine: GameEngine;
  
  // 游戏控制
  startGame: (config: GameConfig) => void;
  endGame: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  
  // 阶段管理
  startAuction: () => void;
  startInvestment: () => void;
  startSailing: () => void;
  startSettlement: () => void;
  nextPhase: () => void;
  
  // 玩家操作
  makeBid: (playerId: string, amount: number) => ActionResult;
  buyStock: (playerId: string, cargoType: string, quantity: number) => ActionResult;
  mortgageStock: (playerId: string, cargoType: string, quantity: number) => ActionResult;
  selectInvestment: (playerId: string, slotId: string) => ActionResult;
  useNavigator: (playerId: string, action: string) => ActionResult;
  rollDice: () => ActionResult;
  
  // 港务长操作
  buyHarborMasterStock: (cargoType: string) => ActionResult;
  skipStockPurchase: () => void;
  selectCargos: (cargos: string[]) => ActionResult;
  setShipPositions: (positions: Record<string, number>) => ActionResult;
  
  // 查询
  getValidActions: (playerId: string) => GameAction[];
  getPlayerState: (playerId: string) => PlayerState | undefined;
  getCurrentPlayer: () => PlayerState | undefined;
  getGameHistory: () => any[];
  
  // 工具
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      gameState: null,
      currentPhase: 'LOBBY',
      players: [],
      isLoading: false,
      error: null,
      engine: new GameEngine(),
      
      // 游戏控制
      startGame: (config: GameConfig) => {
        set({ isLoading: true, error: null });
        
        try {
          const { engine } = get();
          const gameState = engine.initializeGame(config);
          
          set({ 
            gameState, 
            currentPhase: 'AUCTION',
            players: gameState.players,
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to start game',
            isLoading: false 
          });
        }
      },
      
      endGame: () => {
        set({ 
          gameState: null, 
          currentPhase: 'GAME_END',
          players: [],
          error: null 
        });
      },
      
      resetGame: () => {
        set({ 
          gameState: null, 
          currentPhase: 'LOBBY',
          players: [],
          error: null,
          isLoading: false 
        });
      },
      
      pauseGame: () => {
        // 暂停游戏逻辑
        set({ isLoading: true });
      },
      
      resumeGame: () => {
        // 恢复游戏逻辑
        set({ isLoading: false });
      },
      
      // 阶段管理
      startAuction: () => {
        set({ currentPhase: 'AUCTION' });
      },
      
      startInvestment: () => {
        set({ currentPhase: 'INVESTMENT' });
      },
      
      startSailing: () => {
        set({ currentPhase: 'SAILING' });
      },
      
      startSettlement: () => {
        set({ currentPhase: 'SETTLEMENT' });
      },
      
      nextPhase: () => {
        const { currentPhase } = get();
        const phases: GamePhase[] = ['AUCTION', 'INVESTMENT', 'SAILING', 'SETTLEMENT'];
        const currentIndex = phases.indexOf(currentPhase);
        
        if (currentIndex < phases.length - 1) {
          set({ currentPhase: phases[currentIndex + 1] });
        } else {
          // 进入下一轮或结束游戏
          set({ currentPhase: 'AUCTION' });
        }
      },
      
      // 玩家操作
      makeBid: (playerId: string, amount: number) => {
        const { engine } = get();
        const gameState = engine.getGameState();
        if (!gameState) {
          return { success: false, error: 'Game not started' };
        }
        
        const action: GameAction = {
          type: 'BID',
          playerId,
          data: { amount },
          timestamp: Date.now()
        };
        
        const result = engine.processAction(action);
        if (result.success && result.newState) {
          set({ gameState: result.newState });
        }
        
        return result;
      },
      
      buyStock: (playerId: string, cargoType: string, quantity: number) => {
        // 购买股票逻辑
        return { success: true };
      },
      
      mortgageStock: (playerId: string, cargoType: string, quantity: number) => {
        const { engine } = get();
        const gameState = engine.getGameState();
        if (!gameState) {
          return { success: false, error: 'Game not started' };
        }
        
        const action: GameAction = {
          type: 'MORTGAGE_STOCK',
          playerId,
          data: { cargoType, quantity },
          timestamp: Date.now()
        };
        
        const result = engine.processAction(action);
        if (result.success && result.newState) {
          set({ gameState: result.newState });
        }
        return result;
      },
      
      selectInvestment: (playerId: string, slotId: string) => {
        // 选择投资逻辑
        return { success: true };
      },
      
      useNavigator: (playerId: string, action: string) => {
        // 使用领航员逻辑
        return { success: true };
      },
      
      rollDice: () => {
        // 投掷骰子逻辑
        return { success: true };
      },
      
      // 查询
      getValidActions: (playerId: string) => {
        const { gameState, currentPhase } = get();
        if (!gameState) {
          return [];
        }
        
        // 根据当前阶段返回有效动作
        const actions: GameAction[] = [];
        
        switch (currentPhase) {
          case 'AUCTION':
            actions.push({
              type: 'BID',
              playerId,
              data: { amount: 0 },
              timestamp: Date.now()
            });
            break;
          case 'INVESTMENT':
            actions.push({
              type: 'SELECT_INVESTMENT',
              playerId,
              data: { slotId: '' },
              timestamp: Date.now()
            });
            break;
          case 'SAILING':
            actions.push({
              type: 'ROLL_DICE',
              playerId,
              data: {},
              timestamp: Date.now()
            });
            break;
        }
        
        return actions;
      },
      
      getPlayerState: (playerId: string) => {
        const { players } = get();
        return players.find(p => p.id === playerId);
      },
      
      getCurrentPlayer: () => {
        const { players, gameState } = get();
        if (!gameState) return undefined;
        return players[gameState.currentPlayerIndex];
      },
      
      getGameHistory: () => {
        const { gameState } = get();
        return gameState?.history || [];
      },
      
      // 港务长操作
      buyHarborMasterStock: (cargoType: string) => {
        const { engine } = get();
        const gameState = engine.getGameState();
        if (!gameState?.harborMaster) {
          return { success: false, error: 'No harbor master session' };
        }
        
        const action: GameAction = {
          type: 'BUY_STOCK',
          playerId: gameState.harborMaster.playerId,
          data: { cargoType },
          timestamp: Date.now()
        };
        
        const result = engine.processAction(action);
        if (result.success && result.newState) {
          set({ gameState: result.newState });
        }
        return result;
      },

      skipStockPurchase: () => {
        const state = get().gameState;
        if (state?.harborMaster) {
          state.harborMaster.hasCompletedStockPurchase = true;
          state.harborMaster.currentStep = 'SELECT_CARGO';
          set({ gameState: { ...state } });
        }
      },

      selectCargos: (cargos: string[]) => {
        const { engine } = get();
        const gameState = engine.getGameState();
        if (!gameState?.harborMaster) {
          return { success: false, error: 'No harbor master session' };
        }
        
        const action: GameAction = {
          type: 'HARBOR_MASTER_SELECT_CARGO',
          playerId: gameState.harborMaster.playerId,
          data: { cargos },
          timestamp: Date.now()
        };
        
        const result = engine.processAction(action);
        if (result.success && result.newState) {
          set({ gameState: result.newState });
        }
        return result;
      },

      setShipPositions: (positions: Record<string, number>) => {
        const { engine } = get();
        const gameState = engine.getGameState();
        if (!gameState?.harborMaster) {
          return { success: false, error: 'No harbor master session' };
        }
        
        const action: GameAction = {
          type: 'HARBOR_MASTER_SET_POSITIONS',
          playerId: gameState.harborMaster.playerId,
          data: { positions },
          timestamp: Date.now()
        };
        
        const result = engine.processAction(action);
        if (result.success && result.newState) {
          set({ gameState: result.newState, currentPhase: 'INVESTMENT' });
        }
        return result;
      },
      
      // 工具
      setError: (error: string | null) => {
        set({ error });
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    { name: 'game-store' }
  )
);

// 辅助函数
function initializePlayers(config: GameConfig): PlayerState[] {
  const players: PlayerState[] = [];
  
  for (let i = 0; i < config.players; i++) {
    players.push({
      id: `player${i + 1}`,
      name: i === 0 ? 'You' : `AI Player ${i}`,
      cash: 30,
      stocks: [],
      investments: [],
      isActive: true,
      isAI: i > 0,
      aiStrategy: i > 0 ? config.aiStrategies[i - 1] : undefined
    });
  }
  
  return players;
}

function initializeShips() {
  return [
    {
      id: 'ship1',
      cargoType: 'JADE' as const,
      position: 0,
      crew: [],
      isDocked: false,
      isInShipyard: false,
      isHijacked: false
    },
    {
      id: 'ship2',
      cargoType: 'SILK' as const,
      position: 0,
      crew: [],
      isDocked: false,
      isInShipyard: false,
      isHijacked: false
    },
    {
      id: 'ship3',
      cargoType: 'GINSENG' as const,
      position: 0,
      crew: [],
      isDocked: false,
      isInShipyard: false,
      isHijacked: false
    }
  ];
}
