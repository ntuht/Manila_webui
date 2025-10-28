import type {
  GameState,
  GameConfig,
  PlayerState,
  ShipState,
  GameAction,
  ActionResult,
  GamePhase,
  GameEvent,
  CargoType,
  InvestmentSlotType,
  PirateAction
} from '../types';

// 事件序列定义
const GAME_FLOW_3P: GameEvent[] = [
  'AUCTION',           // 拍卖
  'HARBOR_MASTER',     // 港务长行动
  'INVESTMENT',        // 投资轮1
  'INVESTMENT',        // 投资轮2
  'DICE_ROLL',         // 投掷骰子1
  'INVESTMENT',        // 投资轮3
  'DICE_ROLL',         // 投掷骰子2
  'PIRATE_ONBOARD',    // 海盗上船判定
  'INVESTMENT',        // 投资轮4
  'NAVIGATOR_USE',     // 领航员使用（最后一次骰子前）
  'DICE_ROLL',         // 投掷骰子3
  'PIRATE_HIJACK',     // 海盗劫持判定
  'SETTLEMENT'         // 结算
];

const GAME_FLOW_4P: GameEvent[] = [
  'AUCTION',           // 拍卖
  'HARBOR_MASTER',     // 港务长行动
  'INVESTMENT',        // 投资轮1
  'DICE_ROLL',         // 投掷骰子1
  'INVESTMENT',        // 投资轮2
  'DICE_ROLL',         // 投掷骰子2
  'PIRATE_ONBOARD',    // 海盗上船判定
  'INVESTMENT',        // 投资轮3
  'NAVIGATOR_USE',     // 领航员使用（最后一次骰子前）
  'DICE_ROLL',         // 投掷骰子3
  'PIRATE_HIJACK',     // 海盗劫持判定
  'SETTLEMENT'         // 结算
];

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

    // 初始化游戏流程
    this.initializeGameFlow(gameState);

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

    try {
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
    } catch (error) {
      // 捕获并返回错误
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  public getGameState(): GameState | null {
    return this.state;
  }

  public getCurrentPhase(): GamePhase {
    return this.state?.phase || 'LOBBY';
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

    const cargoType = action.data.cargoType as CargoType;
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
      } else {
        // 抵押失败，抛出错误
        throw new Error('Insufficient funds to buy stock');
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

  private processSelectInvestment(state: GameState, action: GameAction): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) return state;

    const slotId = action.data.slotId as string;
    
    // 计算投资成本（船员投资根据已投资数量递增）
    const cost = this.calculateInvestmentCost(slotId, player, state);
    if (cost !== undefined && player.cash >= cost) {
      // 检查是否已经投资过这个槽位
      const alreadyInvested = player.investments.some(inv => inv.slotId === slotId);
      if (alreadyInvested) {
        throw new Error('该槽位已被投资');
      }
      
      player.cash -= cost;
      // 如果是船员投资，需要分配到正确的座位
      if (slotId.startsWith('crew-')) {
        const ship = this.assignCrewToShip(state, player, slotId, cost);
        if (!ship) {
          throw new Error('无法分配船员到船只');
        }
      } else {
        player.investments.push({
          id: `investment-${Date.now()}`,
          slotId: slotId,
          type: this.getInvestmentTypeFromSlotId(slotId) as InvestmentSlotType,
          cost,
          expectedReward: 0,
          round: state.round,
          phase: state.phase
        });
      }
      
      // 推进投资轮次
      const updatedState = this.advanceInvestmentRound();
      if (updatedState) {
        return updatedState;
      }
    } else if (cost === undefined) {
      throw new Error('无效的投资槽位');
    } else {
      throw new Error('资金不足');
    }
    
    return state;
  }

  private getInvestmentTypeFromSlotId(slotId: string): string {
    if (slotId.startsWith('crew-')) return 'CREW';
    if (slotId.startsWith('harbor-office-')) return 'HARBOR_OFFICE';
    if (slotId.startsWith('shipyard-office-')) return 'SHIPYARD_OFFICE';
    if (slotId.startsWith('pirate-')) return 'PIRATE';
    if (slotId.startsWith('navigator-')) return 'NAVIGATOR';
    if (slotId === 'insurance') return 'INSURANCE';
    return 'UNKNOWN';
  }

  private calculateInvestmentCost(slotId: string, _player: PlayerState, state: GameState): number {
    // 船员投资成本根据已投资数量递增
    if (slotId.startsWith('crew-')) {
      const cargoType = slotId.split('-')[1].toUpperCase();
      
      // 计算所有玩家对该货物类型的投资总数
      const totalInvestedCount = state.players.reduce((total, p) => {
        const playerInvestments = p.investments.filter(
          inv => inv.slotId.startsWith(`crew-${cargoType.toLowerCase()}`)
        ).length;
        return total + playerInvestments;
      }, 0);
      
      // 根据马尼拉规则设置成本
      const costSchemes: Record<string, number[]> = {
        'JADE': [3, 4, 5, 5],     // 翡翠：3,4,5,5
        'SILK': [3, 4, 5],        // 丝绸：3,4,5
        'GINSENG': [1, 2, 3],     // 人参：1,2,3
        'NUTMEG': [2, 3, 4]       // 肉豆蔻：2,3,4
      };
      
      const costs = costSchemes[cargoType] || [1];
      return costs[totalInvestedCount] || costs[costs.length - 1];
    }
    
    // 其他投资的固定成本
    const fixedCosts: Record<string, number> = {
      'harbor-office-a': 4,
      'harbor-office-b': 3,
      'harbor-office-c': 2,
      'shipyard-office-a': 4,
      'shipyard-office-b': 3,
      'shipyard-office-c': 2,
      'pirate-captain': 5,
      'pirate-crew': 5,
      'navigator-small': 2,
      'navigator-big': 5,
      'insurance': 0
    };
    
    return fixedCosts[slotId] || 0;
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
    const total = (Object.values(positions) as number[]).reduce((a: number, b: number) => a + b, 0);
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
    
    // 保存港务长选择的货物到游戏状态
    state.selectedCargos = state.harborMaster.selectedCargos;
    
    // 完成港务长阶段，进入投资阶段
    state.harborMaster = undefined;
    state.phase = 'INVESTMENT';
    
    // 初始化投资轮次
    this.initializeInvestmentRound(state);
    
    return state;
  }

  private initializeInvestmentRound(state: GameState): void {
    const playerCount = state.players.length;

    // 如果已有投资顺序，保持不变；否则创建新顺序
    let order: string[];
    let currentRound = 1;
    
    if (state.investmentRound?.investmentOrder) {
      // 保持原有投资顺序
      order = state.investmentRound.investmentOrder;
      currentRound = (state.investmentRound.currentRound || 0) + 1;
      console.log(`[GameFlow] Reusing investment order, round ${currentRound}`);
    } else {
      // 投资顺序：从港务长开始顺时针
      const harborMasterIndex = state.players.findIndex(
        p => p.id === state.auctionWinner
      );
      order = [];
      for (let i = 0; i < playerCount; i++) {
        const index = (harborMasterIndex + i) % playerCount;
        order.push(state.players[index].id);
      }
      console.log(`[GameFlow] Created new investment order:`, order);
    }

    state.investmentRound = {
      currentRound,
      totalRounds: 1, // 现在由事件序列控制，每次投资都是单轮
      currentPlayerIndex: 0,
      investmentOrder: order
    };
  }


  public advanceInvestmentRound(): GameState | null {
    if (!this.state?.investmentRound) return null;
    
    const { currentPlayerIndex, investmentOrder } = this.state.investmentRound;
    const nextPlayerIndex = currentPlayerIndex + 1;
    
    if (nextPlayerIndex >= investmentOrder.length) {
      // 本轮投资完成，进入下一个事件
      return this.advanceToNextEvent();
    } else {
      // 下一个玩家投资
      this.state.investmentRound.currentPlayerIndex = nextPlayerIndex;
      return this.state;
    }
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
        // 重置船只位置
        this.state.ships.forEach(ship => {
          ship.position = 0;
          ship.isDocked = false;
        });
        // 清除骰子结果
        this.state.diceResults = [];
        // 清除选择的货物
        this.state.selectedCargos = undefined;
      }
    }
  }

  private processRollDice(state: GameState, _action: GameAction): GameState {
    // 骰子投掷逻辑 - 每艘船对应一个骰子
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    
    const diceResult = {
      dice1,
      dice2,
      dice3,
      total: dice1 + dice2 + dice3,
      phase: state.sailingPhase || 1
    };
    
    // 添加到骰子结果历史
    if (!state.diceResults) {
      state.diceResults = [];
    }
    state.diceResults.push(diceResult);
    
    // 移动船只 - 每艘船根据对应的骰子移动
    state.ships.forEach((ship, index) => {
      const diceValue = index === 0 ? dice1 : index === 1 ? dice2 : dice3;
      ship.position += diceValue;
      
      // 检查是否到港（位置14）
      if (ship.position >= 14) {
        ship.isDocked = true;
        ship.position = 14; // 确保位置不超过14
      }
    });
    
    // 进入下一个事件
    const nextState = this.advanceToNextEvent();
    if (!nextState) {
      throw new Error('Failed to advance to next event');
    }
    return nextState;
  }

  public processSettlement(state: GameState): void {
    // 1. 计算船员投资奖励
    this.calculateCrewRewards(state);
    
    // 2. 计算办事处投资奖励
    this.calculateOfficeRewards(state);
    
    // 3. 计算海盗投资奖励
    this.calculatePirateRewards(state);
    
    // 4. 更新股价
    this.updateStockPrices(state);
    
    // 5. 计算股票价值
    this.calculateStockValues(state);
    
    // 6. 重置投资
    this.resetInvestments(state);
  }

  private calculateCrewRewards(state: GameState): void {
    state.players.forEach(player => {
      player.investments.forEach(investment => {
        if (investment.type === 'CREW') {
          // 找到对应的船只
          const ship = state.ships.find(s => s.cargoType === investment.slotId.split('-')[1].toUpperCase());
          if (ship && ship.isDocked) {
            // 船员在到港船只上，获得奖励
            player.cash += investment.expectedReward;
          }
        }
      });
    });
  }

  private calculateOfficeRewards(state: GameState): void {
    const dockedShips = state.ships.filter(ship => ship.isDocked).length;
    const shipyardShips = state.ships.filter(ship => ship.isInShipyard).length;
    
    state.players.forEach(player => {
      player.investments.forEach(investment => {
        if (investment.type === 'HARBOR_OFFICE') {
          let reward = 0;
          if (investment.slotId.includes('a') && dockedShips >= 1) reward = 6;
          else if (investment.slotId.includes('b') && dockedShips >= 2) reward = 8;
          else if (investment.slotId.includes('c') && dockedShips >= 3) reward = 15;
          
          if (reward > 0) {
            player.cash += reward;
          }
        } else if (investment.type === 'SHIPYARD_OFFICE') {
          let reward = 0;
          if (investment.slotId.includes('a') && shipyardShips >= 1) reward = 6;
          else if (investment.slotId.includes('b') && shipyardShips >= 2) reward = 8;
          else if (investment.slotId.includes('c') && shipyardShips >= 3) reward = 15;
          
          if (reward > 0) {
            player.cash += reward;
          }
        }
      });
    });
  }

  private calculatePirateRewards(state: GameState): void {
    const hijackedShips = state.ships.filter(ship => ship.isHijacked).length;
    
    state.players.forEach(player => {
      player.investments.forEach(investment => {
        if (investment.type === 'PIRATE' && hijackedShips > 0) {
          player.cash += investment.expectedReward;
        }
      });
    });
  }

  private updateStockPrices(state: GameState): void {
    // 根据到港船只更新股价
    state.ships.forEach(ship => {
      if (ship.isDocked) {
        // 到港船只的货物股价+1
        state.stockPrices[ship.cargoType] = Math.min(30, state.stockPrices[ship.cargoType] + 1);
      } else if (ship.isInShipyard) {
        // 修船厂的船只货物股价-1
        state.stockPrices[ship.cargoType] = Math.max(0, state.stockPrices[ship.cargoType] - 1);
      }
    });
  }

  private calculateStockValues(state: GameState): void {
    state.players.forEach(player => {
      player.stocks.forEach(stock => {
        if (!stock.isMortgaged) {
          const value = stock.quantity * state.stockPrices[stock.cargoType];
          player.cash += value;
        }
      });
    });
  }

  private assignCrewToShip(state: GameState, player: PlayerState, slotId: string, cost: number): ShipState | null {
    // 解析货物类型和座位号
    const parts = slotId.split('-');
    const cargoType = parts[1].toUpperCase() as CargoType;
    const seatNumber = parseInt(parts[2]);
    
    // 找到对应的船只
    const ship = state.ships.find(s => s.cargoType === cargoType);
    if (!ship) return null;
    
    // 检查座位是否已被占用
    const isSeatOccupied = ship.crew.some(crew => crew.seatNumber === seatNumber);
    if (isSeatOccupied) {
      throw new Error('该座位已被占用');
    }
    
    // 添加船员到船只
    ship.crew.push({
      playerId: player.id,
      playerName: player.name,
      seatNumber: seatNumber,
      cost: cost
    });
    
    // 记录投资
    player.investments.push({
      id: `investment-${Date.now()}`,
      slotId: slotId,
      type: 'CREW' as InvestmentSlotType,
      cost,
      expectedReward: 0,
      round: state.round,
      phase: state.phase
    });
    
    return ship;
  }

  private resetInvestments(state: GameState): void {
    // 清除所有玩家的投资
    state.players.forEach(player => {
      player.investments = [];
    });
    
    // 重置船只状态
    state.ships.forEach(ship => {
      ship.position = 0;
      ship.isDocked = false;
      ship.isInShipyard = false;
      ship.isHijacked = false;
      ship.crew = [];
    });
    
    // 清除骰子结果
    state.diceResults = [];
    
    // 清除选择的货物
    state.selectedCargos = undefined;
  }

  // ==================== 游戏流程管理 ====================

  private initializeGameFlow(state: GameState): void {
    const playerCount = state.players.length;
    const eventSequence = playerCount === 3 ? GAME_FLOW_3P : GAME_FLOW_4P;
    
    state.gameFlow = {
      eventSequence,
      currentEventIndex: 0
    };
  }

  public advanceToNextEvent(): GameState | null {
    if (!this.state?.gameFlow) return null;
    
    const currentEventIndex = this.state.gameFlow.currentEventIndex;
    const currentEvent = this.state.gameFlow.eventSequence[currentEventIndex];
    
    console.log(`[GameFlow] Advancing from event ${currentEventIndex}: ${currentEvent}`);
    
    this.state.gameFlow.currentEventIndex++;
    const nextEvent = this.getCurrentEvent();
    
    console.log(`[GameFlow] Next event: ${nextEvent} (index: ${this.state.gameFlow.currentEventIndex})`);
    
    if (!nextEvent) {
      // 游戏结束
      this.state.phase = 'GAME_END';
      return this.state;
    }
    
    // 清除上一个事件的临时状态
    this.clearEventState(this.state, nextEvent);
    
    // 根据事件设置游戏阶段
    this.state.phase = this.eventToPhase(nextEvent);
    
    // 初始化事件特定状态
    this.initializeEventState(nextEvent);
    
    return this.state;
  }

  private clearEventState(state: GameState, nextEvent: GameEvent): void {
    // 清除骰子结果（仅在进入非DICE_ROLL事件时）
    if (nextEvent !== 'DICE_ROLL') {
      console.log('[GameFlow] Clearing dice results');
      state.diceResults = [];
    }
    
    // 清除投资轮次状态（仅在离开INVESTMENT事件时）
    if (nextEvent !== 'INVESTMENT' && state.investmentRound) {
      console.log('[GameFlow] Clearing investment round state');
      // 注意：不清除投资顺序，保留给下次投资使用
      state.investmentRound = undefined;
    }
  }

  private getCurrentEvent(): GameEvent | null {
    if (!this.state?.gameFlow) return null;
    
    const { eventSequence, currentEventIndex } = this.state.gameFlow;
    return eventSequence[currentEventIndex] || null;
  }

  private eventToPhase(event: GameEvent): GamePhase {
    switch (event) {
      case 'AUCTION': return 'AUCTION';
      case 'HARBOR_MASTER': return 'HARBOR_MASTER';
      case 'INVESTMENT': return 'INVESTMENT';
      case 'NAVIGATOR_USE': return 'NAVIGATOR_USE';
      case 'DICE_ROLL': return 'SAILING';
      case 'PIRATE_ONBOARD': return 'PIRATE_ONBOARD';
      case 'PIRATE_HIJACK': return 'PIRATE_HIJACK';
      case 'SETTLEMENT': return 'SETTLEMENT';
      default: return 'GAME_END';
    }
  }

  private initializeEventState(event: GameEvent): void {
    if (!this.state) return;

    switch (event) {
      case 'INVESTMENT':
        this.initializeInvestmentRound(this.state);
        break;
      case 'PIRATE_ONBOARD':
        this.processPirateOnboard(this.state);
        break;
      case 'PIRATE_HIJACK':
        this.processPirateHijack(this.state);
        break;
      case 'NAVIGATOR_USE':
        this.processNavigatorUse(this.state);
        break;
      case 'SETTLEMENT':
        this.processSettlement(this.state);
        break;
    }
  }

  // ==================== 海盗功能 ====================

  private processPirateOnboard(state: GameState): void {
    // 检查是否有船只在位置13
    const shipsAt13 = state.ships.filter(s => s.position === 13);
    
    if (shipsAt13.length === 0) {
      // 没有船在位置13，跳过海盗阶段
      this.advanceToNextEvent();
      return;
    }
    
    // 检查是否有玩家投资了海盗
    const piratePlayers = this.getPiratePlayers(state);
    
    if (piratePlayers.length === 0) {
      // 没有海盗，跳过
      this.advanceToNextEvent();
      return;
    }
    
    // 进入海盗上船阶段，等待玩家决策
    state.pirateOnboardState = {
      shipsAt13: shipsAt13.map(s => s.cargoType),
      piratePlayers,
      currentPirateIndex: 0
    };
  }

  private processPirateHijack(state: GameState): void {
    // 检查是否有船只在位置13
    const shipsAt13 = state.ships.filter(s => s.position === 13);
    
    if (shipsAt13.length === 0) {
      // 没有船在位置13，跳过海盗阶段
      this.advanceToNextEvent();
      return;
    }
    
    // 检查是否有海盗船长
    const pirateCaptain = this.getPirateCaptain(state);
    
    if (!pirateCaptain) {
      // 没有海盗船长，跳过
      this.advanceToNextEvent();
      return;
    }
    
    // 进入海盗劫持阶段，等待玩家决策
    state.pirateHijackState = {
      shipsAt13: shipsAt13.map(s => s.cargoType),
      pirateCaptain,
      hijackDecision: null
    };
  }

  private getPiratePlayers(state: GameState): string[] {
    return state.players
      .filter(player => 
        player.investments.some(inv => 
          inv.type === 'PIRATE' && inv.slotId.includes('pirate')
        )
      )
      .map(player => player.id);
  }

  private getPirateCaptain(state: GameState): string | null {
    const captainPlayer = state.players.find(player => 
      player.investments.some(inv => 
        inv.type === 'PIRATE' && inv.slotId.includes('pirate-captain')
      )
    );
    return captainPlayer?.id || null;
  }

  public executePirateOnboard(
    piratePlayerId: string,
    targetShip: CargoType,
    action: PirateAction,
    targetCrewId?: string
  ): ActionResult {
    if (!this.state?.pirateOnboardState) {
      return { success: false, error: 'No pirate onboard state' };
    }

    const ship = this.state.ships.find(s => s.cargoType === targetShip);
    if (!ship) {
      return { success: false, error: 'Ship not found' };
    }

    const player = this.state.players.find(p => p.id === piratePlayerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    switch (action) {
      case 'BOARD':
        // 检查是否有空位
        const emptySeats = this.getEmptySeats(ship);
        if (emptySeats.length === 0) {
          return { success: false, error: 'No empty seats available' };
        }
        
        // 海盗占据第一个空位
        const seatNumber = emptySeats[0];
        ship.crew.push({
          playerId: piratePlayerId,
          playerName: player.name,
          seatNumber,
          cost: 5 // 海盗投资成本
        });
        break;

      case 'KICK':
        if (!targetCrewId) {
          return { success: false, error: 'Target crew ID required for kick action' };
        }
        
        // 找到要踢掉的船员
        const crewIndex = ship.crew.findIndex(c => c.playerId === targetCrewId);
        if (crewIndex === -1) {
          return { success: false, error: 'Target crew not found' };
        }
        
        // 替换船员
        ship.crew[crewIndex] = {
          playerId: piratePlayerId,
          playerName: player.name,
          seatNumber: ship.crew[crewIndex].seatNumber,
          cost: 5
        };
        break;

      case 'PASS':
        // 海盗选择放弃，不做任何操作
        break;
    }

    // 移动到下一个海盗或完成海盗阶段
    this.advancePirateOnboard();
    return { success: true, newState: this.state };
  }

  public executePirateHijack(
    pirateCaptainId: string,
    decision: 'DOCK' | 'SHIPYARD'
  ): ActionResult {
    if (!this.state?.pirateHijackState) {
      return { success: false, error: 'No pirate hijack state' };
    }

    if (this.state.pirateHijackState.pirateCaptain !== pirateCaptainId) {
      return { success: false, error: 'Only pirate captain can make hijack decision' };
    }

    // 记录劫持决定
    this.state.pirateHijackState.hijackDecision = decision;

    // 处理劫持结果
    const shipsAt13 = this.state.ships.filter(s => s.position === 13);
    shipsAt13.forEach(ship => {
      if (decision === 'DOCK') {
        ship.isDocked = true;
        ship.position = 14;
      } else {
        ship.isInShipyard = true;
        ship.position = 0; // 修船厂位置
      }
    });

    // 海盗船长获得所有船员的收益
    const totalReward = shipsAt13.reduce((total, ship) => {
      return total + ship.crew.reduce((crewTotal, crew) => crewTotal + crew.cost, 0);
    }, 0);

    const captainPlayer = this.state.players.find(p => p.id === pirateCaptainId);
    if (captainPlayer) {
      captainPlayer.cash += totalReward;
    }

    // 进入下一个事件
    this.advanceToNextEvent();
    return { success: true, newState: this.state };
  }

  private advancePirateOnboard(): void {
    if (!this.state?.pirateOnboardState) return;

    const { currentPirateIndex, piratePlayers } = this.state.pirateOnboardState;
    
    if (currentPirateIndex < piratePlayers.length - 1) {
      // 还有海盗需要行动
      this.state.pirateOnboardState.currentPirateIndex++;
    } else {
      // 所有海盗都行动完毕，进入下一个事件
      this.state.pirateOnboardState = undefined;
      this.advanceToNextEvent();
    }
  }

  private getEmptySeats(ship: ShipState): number[] {
    const occupiedSeats = ship.crew.map(c => c.seatNumber);
    const totalSeats = this.getTotalSeats(ship.cargoType);
    const emptySeats: number[] = [];
    
    for (let i = 1; i <= totalSeats; i++) {
      if (!occupiedSeats.includes(i)) {
        emptySeats.push(i);
      }
    }
    
    return emptySeats;
  }

  private getTotalSeats(cargoType: CargoType): number {
    const seatCounts = {
      'JADE': 4,
      'SILK': 3,
      'GINSENG': 3,
      'NUTMEG': 3
    };
    return seatCounts[cargoType];
  }

  // ==================== 领航员功能 ====================

  private processNavigatorUse(state: GameState): void {
    // 检查是否有玩家投资了领航员
    const navigatorPlayers = this.getNavigatorPlayers(state);
    
    if (navigatorPlayers.length === 0) {
      // 没有领航员，直接进入下一个事件
      this.advanceToNextEvent();
      return;
    }
    
    // 进入领航员使用阶段，等待玩家决策
    state.navigatorUseState = {
      navigatorPlayers,
      currentNavigatorIndex: 0
    };
  }

  private getNavigatorPlayers(state: GameState): string[] {
    return state.players
      .filter(player => 
        player.investments.some(inv => 
          inv.type === 'NAVIGATOR' && inv.slotId.includes('navigator')
        )
      )
      .map(player => player.id);
  }

  public useNavigator(
    playerId: string,
    targetShip: CargoType,
    movement: number
  ): ActionResult {
    if (!this.state?.navigatorUseState) {
      return { success: false, error: 'No navigator use state' };
    }

    const ship = this.state.ships.find(s => s.cargoType === targetShip);
    if (!ship) {
      return { success: false, error: 'Ship not found' };
    }

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // 检查玩家是否有领航员投资
    const navigatorInvestment = player.investments.find(inv => 
      inv.type === 'NAVIGATOR' && inv.slotId.includes('navigator')
    );

    if (!navigatorInvestment) {
      return { success: false, error: 'Player does not have navigator investment' };
    }

    // 验证移动距离
    const maxMovement = navigatorInvestment.slotId.includes('big') ? 2 : 1;
    if (Math.abs(movement) > maxMovement) {
      return { success: false, error: `Maximum movement is ${maxMovement}` };
    }

    // 应用移动
    ship.position += movement;
    
    // 确保位置在有效范围内
    if (ship.position < 0) ship.position = 0;
    if (ship.position > 14) ship.position = 14;

    // 移动到下一个领航员或完成领航员阶段
    this.advanceNavigatorUse();
    return { success: true, newState: this.state };
  }

  private advanceNavigatorUse(): void {
    if (!this.state?.navigatorUseState) return;

    const { currentNavigatorIndex, navigatorPlayers } = this.state.navigatorUseState;
    
    if (currentNavigatorIndex < navigatorPlayers.length - 1) {
      // 还有领航员需要行动
      this.state.navigatorUseState.currentNavigatorIndex++;
    } else {
      // 所有领航员都行动完毕，进入下一个事件
      this.state.navigatorUseState = undefined;
      this.advanceToNextEvent();
    }
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

    const cargoType = action.data.cargoType as CargoType;
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