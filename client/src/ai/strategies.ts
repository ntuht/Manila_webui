import type { GameState, PlayerState, CargoType, InvestmentSlotType } from '../types';

export interface AIStrategy {
  name: string;
  description: string;
  makeBid: (gameState: GameState, player: PlayerState) => number;
  selectInvestment: (gameState: GameState, player: PlayerState, availableSlots: InvestmentSlot[]) => string | null;
  buyStock: (gameState: GameState, player: PlayerState) => CargoType | null;
  mortgageStock: (_gameState: GameState, player: PlayerState) => { cargoType: CargoType; quantity: number } | null;
}

export interface InvestmentSlot {
  id: string;
  type: InvestmentSlotType;
  cost: number;
  expectedReward: number;
  isOccupied: boolean;
}

// 贪婪策略：总是选择最高收益的投资
export const greedyStrategy: AIStrategy = {
  name: '贪婪策略',
  description: '总是选择预期收益最高的投资选项',
  
  makeBid: (_gameState: GameState, player: PlayerState) => {
    // 随机出价，但不超过现金的30%
    const maxBid = Math.floor(player.cash * 0.3);
    return Math.floor(Math.random() * maxBid);
  },
  
  selectInvestment: (_gameState: GameState, player: PlayerState, availableSlots: InvestmentSlot[]) => {
    // 过滤出能负担得起且未被占用的槽位
    const affordableSlots = availableSlots.filter(slot => 
      !slot.isOccupied && player.cash >= slot.cost
    );
    
    if (affordableSlots.length === 0) return null;
    
    // 按收益/成本比排序，选择最高的
    const bestSlot = affordableSlots.reduce((best, current) => {
      const bestRatio = best.expectedReward / best.cost;
      const currentRatio = current.expectedReward / current.cost;
      return currentRatio > bestRatio ? current : best;
    });
    
    return bestSlot.id;
  },
  
  buyStock: (_gameState: GameState, player: PlayerState) => {
    // 随机选择一种货物购买
    const cargoTypes: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];
    const randomCargo = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
    const price = Math.max(5, _gameState.stockPrices[randomCargo]);
    
    return player.cash >= price ? randomCargo : null;
  },
  
  mortgageStock: (_gameState: GameState, player: PlayerState) => {
    // 如果现金不足，抵押股票
    if (player.cash < 10) {
      const availableStocks = player.stocks.filter(stock => 
        stock.quantity > 0 && !stock.isMortgaged
      );
      
      if (availableStocks.length > 0) {
        const stock = availableStocks[0];
        return {
          cargoType: stock.cargoType,
          quantity: Math.min(1, stock.quantity)
        };
      }
    }
    
    return null;
  }
};

// 风险意识策略：平衡风险和收益
export const riskAwareStrategy: AIStrategy = {
  name: '风险意识策略',
  description: '平衡风险和收益，倾向于选择稳定的投资',
  
  makeBid: (_gameState: GameState, player: PlayerState) => {
    // 保守出价，不超过现金的20%
    const maxBid = Math.floor(player.cash * 0.2);
    return Math.floor(Math.random() * maxBid);
  },
  
  selectInvestment: (_gameState: GameState, player: PlayerState, availableSlots: InvestmentSlot[]) => {
    const affordableSlots = availableSlots.filter(slot => 
      !slot.isOccupied && player.cash >= slot.cost
    );
    
    if (affordableSlots.length === 0) return null;
    
    // 优先选择船员投资（相对稳定）
    const crewSlots = affordableSlots.filter(slot => slot.type === 'CREW');
    if (crewSlots.length > 0) {
      return crewSlots[0].id;
    }
    
    // 其次选择保险（无风险）
    const insuranceSlots = affordableSlots.filter(slot => slot.type === 'INSURANCE');
    if (insuranceSlots.length > 0) {
      return insuranceSlots[0].id;
    }
    
    // 最后选择其他投资
    return affordableSlots[0].id;
  },
  
  buyStock: (_gameState: GameState, player: PlayerState) => {
    // 选择价格较低的股票
    const cargoTypes: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];
    const stockPrices = cargoTypes.map(cargo => ({
      cargo,
      price: _gameState.stockPrices[cargo]
    }));
    
    stockPrices.sort((a, b) => a.price - b.price);
    
    for (const { cargo, price } of stockPrices) {
      if (player.cash >= price) {
        return cargo;
      }
    }
    
    return null;
  },
  
  mortgageStock: (_gameState: GameState, player: PlayerState) => {
    // 只有在现金严重不足时才抵押
    if (player.cash < 5) {
      const availableStocks = player.stocks.filter(stock => 
        stock.quantity > 0 && !stock.isMortgaged
      );
      
      if (availableStocks.length > 0) {
        const stock = availableStocks[0];
        return {
          cargoType: stock.cargoType,
          quantity: 1
        };
      }
    }
    
    return null;
  }
};

// 保守策略：最小化风险
export const conservativeStrategy: AIStrategy = {
  name: '保守策略',
  description: '最小化风险，选择最安全的投资',
  
  makeBid: (_gameState: GameState, player: PlayerState) => {
    // 很少出价
    return Math.random() < 0.3 ? Math.floor(player.cash * 0.1) : 0;
  },
  
  selectInvestment: (_gameState: GameState, player: PlayerState, availableSlots: InvestmentSlot[]) => {
    const affordableSlots = availableSlots.filter(slot => 
      !slot.isOccupied && player.cash >= slot.cost
    );
    
    if (affordableSlots.length === 0) return null;
    
    // 优先选择保险（无风险）
    const insuranceSlots = affordableSlots.filter(slot => slot.type === 'INSURANCE');
    if (insuranceSlots.length > 0) {
      return insuranceSlots[0].id;
    }
    
    // 其次选择便宜的船员投资
    const crewSlots = affordableSlots.filter(slot => slot.type === 'CREW');
    if (crewSlots.length > 0) {
      const cheapestCrew = crewSlots.reduce((cheapest, current) => 
        current.cost < cheapest.cost ? current : cheapest
      );
      return cheapestCrew.id;
    }
    
    return null;
  },
  
  buyStock: (_gameState: GameState, player: PlayerState) => {
    // 很少购买股票
    return Math.random() < 0.2 ? greedyStrategy.buyStock(_gameState, player) : null;
  },
  
  mortgageStock: (_gameState: GameState, _player: PlayerState) => {
    // 几乎不抵押股票
    return null;
  }
};

export const aiStrategies: AIStrategy[] = [
  greedyStrategy,
  riskAwareStrategy,
  conservativeStrategy
];
