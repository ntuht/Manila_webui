import type { GameState, PlayerState, CargoType } from '../types';
import { aiStrategies, type AIStrategy } from './strategies';

export class AIPlayer {
  private strategy: AIStrategy;

  constructor(strategyName: string) {
    this.strategy = aiStrategies.find(s => s.name === strategyName) || aiStrategies[0];
  }

  public makeDecision(gameState: GameState, player: PlayerState): AIDecision {
    const decision: AIDecision = {
      type: 'WAIT',
      data: {}
    };

    // 根据游戏阶段做出决策
    switch (gameState.phase) {
      case 'AUCTION':
        const bidAmount = this.strategy.makeBid(gameState, player);
        if (bidAmount > 0) {
          decision.type = 'BID';
          decision.data = { amount: bidAmount };
        }
        break;

      case 'INVESTMENT':
        // 这里需要从游戏状态中获取可用的投资槽位
        // 暂时返回等待，实际实现需要更复杂的逻辑
        decision.type = 'WAIT';
        break;

      case 'SAILING':
        // 航行阶段AI不需要做决策
        decision.type = 'WAIT';
        break;

      case 'SETTLEMENT':
        // 结算阶段AI不需要做决策
        decision.type = 'WAIT';
        break;
    }

    return decision;
  }

  public shouldBuyStock(gameState: GameState, player: PlayerState): CargoType | null {
    return this.strategy.buyStock(gameState, player);
  }

  public shouldMortgageStock(gameState: GameState, player: PlayerState): { cargoType: CargoType; quantity: number } | null {
    return this.strategy.mortgageStock(gameState, player);
  }

  public selectInvestment(gameState: GameState, player: PlayerState, availableSlots: any[]): string | null {
    return this.strategy.selectInvestment(gameState, player, availableSlots);
  }
}

export interface AIDecision {
  type: 'BID' | 'INVEST' | 'BUY_STOCK' | 'MORTGAGE' | 'WAIT';
  data: any;
}
