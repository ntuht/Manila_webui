import type { 
  GameState, 
  GameConfig, 
  PlayerState, 
  ShipState, 
  GameAction, 
  ActionResult,
  GamePhase,
  CargoType,
  StockPrices,
  HarborMasterState,
  InvestmentRoundState
} from '../types';

export class GameEngine {
  private state: GameState | null = null;
  private rules: GameRules;

  constructor() {
    this.rules = new GameRules();
  }

  public initializeGame(config: GameConfig): GameState {
    const gameState: GameState = {
      gameId: `game-${Date.now()}`,
      phase: 'AUCTION',
      round: 1,
      players: this.initializePlayers(config),
      ships: this.initializeShips(),
      stockPrices: { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 },
      gameConfig: config,
      history: [],
      currentPlayerIndex: 0
    };

    this.state = gameState;
    return gameState;
  }

  public processAction(action: GameAction): ActionResult {
    if (!this.state) {
      return { success: false, error: 'Game not initialized' };
    }

    // 验证动作
    const validation = this.rules.validateAction(action, this.state);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // 执行动作
    const newState = this.applyAction(this.state, action);
    this.state = newState;

    // 记录历史
    this.state.history.push({
      id: `action-${Date.now()}`,
      timestamp: Date.now(),
      round: this.state.round,
      phase: this.state.phase,
      playerId: action.playerId,
      action,
      result: { success: true, newState }
    });

    return { success: true, newState };
  }

  public getGameState(): GameState | null {
    return this.state;
  }

  public getCurrentPhase(): GamePhase {
    return this.state?.phase || 'LOBBY';
  }

  public nextPhase(): void {
    if (!this.state) return;

    const phases: GamePhase[] = ['AUCTION', 'INVESTMENT', 'SAILING', 'SETTLEMENT'];
    const currentIndex = phases.indexOf(this.state.phase);
    
    if (currentIndex < phases.length - 1) {
      this.state.phase = phases[currentIndex + 1];
    } else {
      // 进入下一轮或结束游戏
      this.state.round++;
      if (this.state.round > this.state.gameConfig.rounds) {
        this.state.phase = 'GAME_END';
      } else {
        this.state.phase = 'AUCTION';
        this.state.currentPlayerIndex = 0;
      }
    }
  }

  private initializePlayers(config: GameConfig): PlayerState[] {
    const players: PlayerState[] = [];
    
    for (let i = 0; i < config.players; i++) {
      players.push({
        id: `player${i + 1}`,
        name: i === 0 ? 'You' : `AI Player ${i}`,
        cash: 30,
        stocks: this.generateInitialStocks(),
        investments: [],
        isActive: true,
        isAI: i > 0,
        aiStrategy: i > 0 ? config.aiStrategies[i - 1] : undefined
      });
    }
    
    return players;
  }

  private initializeShips(): ShipState[] {
    const cargoTypes: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];
    return cargoTypes.slice(0, 3).map((cargoType, index) => ({
      id: `ship${index + 1}`,
      cargoType,
      position: 0,
      crew: [],
      isDocked: false,
      isInShipyard: false,
      isHijacked: false
    }));
  }

  private generateInitialStocks(): any[] {
    // 随机生成初始股票
    const stocks = [];
    const cargoTypes: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];
    
    for (let i = 0; i < 2; i++) {
      const randomCargo = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
      stocks.push({
        cargoType: randomCargo,
        quantity: 1,
        isMortgaged: false
      });
    }
    
    return stocks;
  }

  private applyAction(state: GameState, action: GameAction): GameState {
    const newState = { ...state };
    
    switch (action.type) {
      case 'BID':
        return this.processBid(newState, action);
      case 'BUY_STOCK':
        return this.processBuyStock(newState, action);
      case 'MORTGAGE_STOCK':
        return this.processMortgageStock(newState, action);
      case 'SELECT_INVESTMENT':
        return this.processSelectInvestment(newState, action);
      case 'USE_NAVIGATOR':
        return this.processUseNavigator(newState, action);
      case 'ROLL_DICE':
        return this.processRollDice(newState, action);
      case 'HARBOR_MASTER_SELECT_CARGO':
        return this.processHarborMasterSelectCargo(newState, action);
      case 'HARBOR_MASTER_SET_POSITIONS':
        return this.processHarborMasterSetPositions(newState, action);
      case 'END_PHASE':
        this.nextPhase();
        return newState;
      default:
        return newState;
    }
  }

  private processBid(state: GameState, action: GameAction): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) return state;

    const bidAmount = action.data.amount;
    if (bidAmount > player.cash) {
      return state; // 资金不足，不处理
    }

    // 扣除出价金额
    player.cash -= bidAmount;
    
    // 设置港务长
    state.auctionWinner = action.playerId;
    
    // 初始化港务长状态
    state.harborMaster = {
      playerId: action.playerId,
      currentStep: 'BUY_STOCK',
      selectedCargos: [],
      shipPositions: {
        JADE: 0,
        SILK: 0,
        GINSENG: 0,
        NUTMEG: 0
      },
      hasCompletedStockPurchase: false
    };
    
    return state;
  }

  private processBuyStock(state: GameState, action: GameAction): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) return state;

    const cargoType = action.data.cargoType;
    const cost = Math.max(5, state.stockPrices[cargoType]);
    
    // 检查是否为港务长购买股票
    const isHarborMaster = state.harborMaster?.playerId === action.playerId;
    
    if (player.cash >= cost) {
      player.cash -= cost;
      const existingStock = player.stocks.find(s => s.cargoType === cargoType);
      if (existingStock) {
        existingStock.quantity++;
      } else {
        player.stocks.push({ cargoType, quantity: 1, isMortgaged: false });
      }
      
      // 如果是港务长购买股票，标记为已完成
      if (isHarborMaster && state.harborMaster) {
        state.harborMaster.hasCompletedStockPurchase = true;
        state.harborMaster.currentStep = 'SELECT_CARGO';
      }
    } else {
      // 现金不足，尝试抵押股票
      const mortgageResult = this.tryMortgageStocks(player, cost - player.cash);
      if (mortgageResult.success) {
        player.cash = 0; // 使用所有现金
        player.cash += mortgageResult.cashFromMortgage;
        player.cash -= cost; // 扣除购买成本
        
        const existingStock = player.stocks.find(s => s.cargoType === cargoType);
        if (existingStock) {
          existingStock.quantity++;
        } else {
          player.stocks.push({ cargoType, quantity: 1, isMortgaged: false });
        }
        
        // 如果是港务长购买股票，标记为已完成
        if (isHarborMaster && state.harborMaster) {
          state.harborMaster.hasCompletedStockPurchase = true;
          state.harborMaster.currentStep = 'SELECT_CARGO';
        }
      }
    }
    
    return state;
  }

  private tryMortgageStocks(player: PlayerState, neededCash: number): { success: boolean; cashFromMortgage: number } {
    let totalCashFromMortgage = 0;
    const stocksToMortgage: { stock: any; quantity: number }[] = [];
    let remainingNeededCash = neededCash;
    
    // 计算需要抵押多少股票
    for (const stock of player.stocks) {
      if (stock.quantity > 0 && !stock.isMortgaged && remainingNeededCash > 0) {
        const availableQuantity = stock.quantity;
        const neededQuantity = Math.ceil(remainingNeededCash / 12); // 每抵押一股获得12现金
        
        if (neededQuantity <= availableQuantity) {
          stocksToMortgage.push({ stock, quantity: neededQuantity });
          totalCashFromMortgage += neededQuantity * 12;
          remainingNeededCash -= neededQuantity * 12;
          break;
        } else {
          stocksToMortgage.push({ stock, quantity: availableQuantity });
          totalCashFromMortgage += availableQuantity * 12;
          remainingNeededCash -= availableQuantity * 12;
        }
      }
    }
    
    if (totalCashFromMortgage >= neededCash) {
      // 执行抵押
      stocksToMortgage.forEach(({ stock, quantity }) => {
        stock.quantity -= quantity;
        stock.isMortgaged = true;
      });
      
      return { success: true, cashFromMortgage: totalCashFromMortgage };
    }
    
    return { success: false, cashFromMortgage: 0 };
  }

  private processMortgageStock(state: GameState, action: GameAction): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) return state;

    const cargoType = action.data.cargoType as CargoType;
    const quantity = action.data.quantity as number;
    
    const stock = player.stocks.find(s => s.cargoType === cargoType);
    if (stock && stock.quantity >= quantity) {
      // 减少股票数量
      stock.quantity -= quantity;
      
      // 如果股票数量为0，标记为已抵押
      if (stock.quantity === 0) {
        stock.isMortgaged = true;
      }
      
      // 增加现金
      player.cash += quantity * 12; // 每抵押一股获得12现金
    }
    
    return state;
  }

  private processSelectInvestment(state: GameState, _action: GameAction): GameState {
    // 投资选择逻辑
    return state;
  }

  private processUseNavigator(state: GameState, _action: GameAction): GameState {
    // 领航员使用逻辑
    return state;
  }

  private processHarborMasterSelectCargo(state: GameState, action: GameAction): GameState {
    const { cargos } = action.data;  // CargoType[] 长度为3
    
    if (!state.harborMaster) return state;
    
    state.harborMaster.selectedCargos = cargos;
    
    // 更新船只货物类型
    cargos.forEach((cargo: CargoType, index: number) => {
      if (state.ships[index]) {
        state.ships[index].cargoType = cargo;
      }
    });
    
    state.harborMaster.currentStep = 'SET_POSITIONS';
    
    return state;
  }

  private processHarborMasterSetPositions(state: GameState, action: GameAction): GameState {
    const { positions } = action.data;  // Record<CargoType, number>
    
    if (!state.harborMaster) return state;
    
    // 验证总和为9，每个0-5
    const total = Object.values(positions).reduce((a: number, b: number) => a + b, 0);
    if (total !== 9) {
      throw new Error('船只位置总和必须为9');
    }
    
    // 设置船只位置
    Object.entries(positions).forEach(([cargo, position]) => {
      const ship = state.ships.find(s => s.cargoType === cargo as CargoType);
      if (ship) {
        ship.position = position as number;
      }
    });
    
    // 完成港务长阶段，进入投资阶段
    state.harborMaster = undefined;
    state.phase = 'INVESTMENT';
    
    // 初始化投资轮次
    this.initializeInvestmentRound(state);
    
    return state;
  }

  private initializeInvestmentRound(state: GameState): void {
    const playerCount = state.players.length;
    const totalRounds = playerCount === 3 ? 4 : 3;  // 3人4次，4人3次
    
    // 投资顺序：从港务长开始顺时针
    const harborMasterIndex = state.players.findIndex(
      p => p.id === state.auctionWinner
    );
    
    const order: string[] = [];
    for (let i = 0; i < playerCount; i++) {
      const index = (harborMasterIndex + i) % playerCount;
      order.push(state.players[index].id);
    }
    
    state.investmentRound = {
      currentRound: 1,
      totalRounds,
      currentPlayerIndex: 0,
      investmentOrder: order
    };
  }

  public advanceInvestmentRound(): void {
    if (!this.state?.investmentRound) return;
    
    const { currentPlayerIndex, investmentOrder, currentRound, totalRounds } = this.state.investmentRound;
    
    // 移动到下一个玩家
    const nextPlayerIndex = currentPlayerIndex + 1;
    
    if (nextPlayerIndex >= investmentOrder.length) {
      // 一轮投资完成
      if (currentRound < totalRounds) {
        // 进入下一轮
        this.state.investmentRound.currentRound++;
        this.state.investmentRound.currentPlayerIndex = 0;
      } else {
        // 所有投资轮次完成，进入航行阶段
        this.state.phase = 'SAILING';
        this.state.investmentRound = undefined;
      }
    } else {
      this.state.investmentRound.currentPlayerIndex = nextPlayerIndex;
    }
  }

  private processRollDice(state: GameState, action: GameAction): GameState {
    // 骰子投掷逻辑
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    
    state.diceResults = [{
      dice1,
      dice2,
      dice3,
      total: dice1 + dice2 + dice3,
      phase: 1
    }];
    
    // 移动船只
    state.ships.forEach(ship => {
      ship.position += dice1 + dice2 + dice3;
      if (ship.position >= 13) {
        ship.isDocked = true;
      }
    });
    
    return state;
  }
}

class GameRules {
  public validateAction(action: GameAction, state: GameState): { isValid: boolean; error?: string } {
    switch (action.type) {
      case 'BID':
        return this.validateBid(action, state);
      case 'BUY_STOCK':
        return this.validateBuyStock(action, state);
      case 'MORTGAGE_STOCK':
        return this.validateMortgageStock(action, state);
      default:
        return { isValid: true };
    }
  }

  private validateBid(action: GameAction, state: GameState): { isValid: boolean; error?: string } {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const bidAmount = action.data.amount;
    if (bidAmount < 0) {
      return { isValid: false, error: 'Bid amount cannot be negative' };
    }

    if (bidAmount > player.cash) {
      return { isValid: false, error: 'Insufficient funds' };
    }

    return { isValid: true };
  }

  private validateBuyStock(action: GameAction, state: GameState): { isValid: boolean; error?: string } {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const cargoType = action.data.cargoType;
    const cost = Math.max(5, state.stockPrices[cargoType]);
    
    if (player.cash < cost) {
      return { isValid: false, error: 'Insufficient funds to buy stock' };
    }

    return { isValid: true };
  }

  private validateMortgageStock(action: GameAction, state: GameState): { isValid: boolean; error?: string } {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const cargoType = action.data.cargoType;
    const stock = player.stocks.find(s => s.cargoType === cargoType);
    
    if (!stock || stock.quantity === 0) {
      return { isValid: false, error: 'No stock to mortgage' };
    }

    return { isValid: true };
  }
}
