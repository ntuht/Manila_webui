/**
 * AI Strategy System — unified interface for all AI strategies
 *
 * Supports both simple rule-based strategies and ONNX neural network.
 * All strategies take @manila/engine GameState and return engine Actions.
 */

import type { GameState, Action, CargoType } from '@manila/engine';
import { getValidActions } from '@manila/engine';
import { onnxAI } from './onnxStrategy';
import { PLACEMENT_COMBOS } from '@manila/rl';

// ==================== AI Helpers ====================

/**
 * Build a valid PLACE_SHIPS action for AI.
 * Uses the same PLACEMENT_COMBOS as RL training (100 combos).
 * Strategy can be 'random' (pick any) or 'greedy' (prefer high-priced cargos).
 */
function buildPlaceShipsAction(state: GameState, playerId: string, prefer: 'random' | 'greedy' = 'random'): Action {
  let combo;

  if (prefer === 'greedy') {
    // Greedy: pick the combo whose selected cargos have highest total stock price
    let bestScore = -1;
    for (const c of PLACEMENT_COMBOS) {
      const score = c.cargos.reduce((sum, cargo) =>
        sum + (state.stockPrices[cargo as CargoType] ?? 0), 0);
      if (score > bestScore) {
        bestScore = score;
        combo = c;
      }
    }
    // Among combos with same excluded cargo, pick the one with most even distribution
    if (!combo) combo = PLACEMENT_COMBOS[Math.floor(Math.random() * PLACEMENT_COMBOS.length)];
  } else {
    combo = PLACEMENT_COMBOS[Math.floor(Math.random() * PLACEMENT_COMBOS.length)];
  }

  return {
    type: 'PLACE_SHIPS',
    playerId,
    data: { cargos: [...combo.cargos], positions: { ...combo.positions } },
  };
}

/**
 * Check if the pending action is a free-form action that needs
 * special construction (e.g. PLACE_SHIPS).
 */
function handleSpecialActions(state: GameState, playerId: string, prefer: 'random' | 'greedy' = 'random'): Action | null {
  const pa = state.pendingAction;
  if (!pa || pa.playerId !== playerId) return null;

  if (pa.actionType === 'PLACE_SHIPS') {
    return buildPlaceShipsAction(state, playerId, prefer);
  }

  return null;
}

export interface AIStrategy {
  name: string;
  description: string;
  /** Select the best action given engine state and player ID */
  selectAction(state: GameState, playerId: string): Promise<Action>;
}

// ==================== Simple Strategies ====================

/** Pick action randomly from valid actions */
export const randomStrategy: AIStrategy = {
  name: 'random',
  description: '随机策略',
  async selectAction(state: GameState, playerId: string): Promise<Action> {
    const special = handleSpecialActions(state, playerId);
    if (special) return special;
    const allActions = getValidActions(state);
    const actions = allActions.filter(a => a.type !== 'SKIP_INVEST');
    return actions[Math.floor(Math.random() * actions.length)];
  },
};

/** Greedy — prefer high-reward investments, bid modestly */
export const greedyStrategy: AIStrategy = {
  name: 'greedy',
  description: '贪婪策略 — 优先高收益投资',
  async selectAction(state: GameState, playerId: string): Promise<Action> {
    const special = handleSpecialActions(state, playerId, 'greedy');
    if (special) return special;
    const allActions = getValidActions(state);
    // AI should never skip investment (not part of training)
    const actions = allActions.filter(a => a.type !== 'SKIP_INVEST');
    if (actions.length === 1) return actions[0];

    // For investment actions, prefer highest cost (usually higher reward)
    const investActions = actions.filter(a => a.type === 'SELECT_INVESTMENT');
    if (investActions.length > 0) {
      investActions.sort((a, b) => (b.data.cost as number) - (a.data.cost as number));
      return investActions[0];
    }

    // For bids, cap at 50% of current cash — PASS if too expensive
    const bidAction = actions.find(a => a.type === 'BID');
    const passAction = actions.find(a => a.type === 'PASS_AUCTION');
    if (bidAction) {
      const player = state.players.find(p => p.id === playerId);
      const cash = player?.cash ?? 0;
      const minBid = (bidAction.data.minBid as number) ?? 1;
      const maxWilling = Math.max(Math.floor(cash * 0.5), 5);
      if (minBid > maxWilling && passAction) {
        return passAction;
      }
      return {
        type: 'BID',
        playerId,
        data: { amount: minBid },
      };
    }

    // For stock purchase, prefer cargo the player already holds
    const buyStockActions = actions.filter(a => a.type === 'BUY_STOCK');
    if (buyStockActions.length > 0) {
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        const held = buyStockActions.find(a =>
          player.stocks.some(s => s.cargo === a.data.cargo && s.quantity > 0)
        );
        if (held) return held;
      }
      return buyStockActions[0];
    }

    // Default: random
    return actions[Math.floor(Math.random() * actions.length)];
  },
};

/** Conservative — low bids, prefer crew and insurance */
export const conservativeStrategy: AIStrategy = {
  name: 'conservative',
  description: '保守策略 — 低出价，倾向船员和保险',
  async selectAction(state: GameState, playerId: string): Promise<Action> {
    const special = handleSpecialActions(state, playerId);
    if (special) return special;
    const allActions = getValidActions(state);
    // AI should never skip investment (not part of training)
    const actions = allActions.filter(a => a.type !== 'SKIP_INVEST');
    if (actions.length === 1) return actions[0];

    // For investment, prefer insurance or cheap crew
    const investActions = actions.filter(a => a.type === 'SELECT_INVESTMENT');
    if (investActions.length > 0) {
      const insurance = investActions.find(a => (a.data.slotId as string) === 'insurance');
      if (insurance) return insurance;

      const crewActions = investActions.filter(a => (a.data.slotId as string).startsWith('crew-'));
      if (crewActions.length > 0) {
        crewActions.sort((a, b) => (a.data.cost as number) - (b.data.cost as number));
        return crewActions[0];
      }

      investActions.sort((a, b) => (a.data.cost as number) - (b.data.cost as number));
      return investActions[0];
    }

    // For bids, pass most of the time; cap at 30% of cash
    const passAction = actions.find(a => a.type === 'PASS_AUCTION');
    if (passAction && Math.random() < 0.7) return passAction;

    // For bids, bid minimum amount but cap at 30% of cash
    const bidAction = actions.find(a => a.type === 'BID');
    if (bidAction) {
      const player = state.players.find(p => p.id === playerId);
      const cash = player?.cash ?? 0;
      const minBid = (bidAction.data.minBid as number) ?? 1;
      const maxWilling = Math.max(Math.floor(cash * 0.3), 3);
      if (minBid > maxWilling && passAction) {
        return passAction;
      }
      return {
        type: 'BID',
        playerId,
        data: { amount: minBid },
      };
    }

    // Skip stock purchase
    const skipBuy = actions.find(a => a.type === 'SKIP_BUY_STOCK');
    if (skipBuy) return skipBuy;

    return actions[Math.floor(Math.random() * actions.length)];
  },
};

/** ONNX Neural Network strategy */
export const onnxStrategy: AIStrategy = {
  name: 'onnx',
  description: 'ONNX 神经网络 — 经过200K局训练的AI',
  async selectAction(state: GameState, playerId: string): Promise<Action> {
    try {
      return await onnxAI.selectAction(state, playerId);
    } catch (err) {
      console.error('[AI] ONNX inference failed, falling back to greedy:', err);
      return greedyStrategy.selectAction(state, playerId);
    }
  },
};

// ==================== Strategy Registry ====================

export const AI_STRATEGIES: Record<string, AIStrategy> = {
  random: randomStrategy,
  greedy: greedyStrategy,
  conservative: conservativeStrategy,
  onnx: onnxStrategy,
};

export function getStrategy(name: string): AIStrategy {
  return AI_STRATEGIES[name] ?? greedyStrategy;
}

export const AI_STRATEGY_OPTIONS = [
  { value: 'onnx', label: '智能 (推荐)' },
  { value: 'greedy', label: '贪婪策略' },
  { value: 'conservative', label: '保守策略' },
  { value: 'random', label: '随机策略' },
];
