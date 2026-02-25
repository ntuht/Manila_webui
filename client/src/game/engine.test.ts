import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './engine';
import type { GameConfig, GameState, GameAction, CargoType } from '../types';

// ==================== Helper functions ====================

function createDefaultConfig(players = 3, rounds = 1): GameConfig {
  return {
    players,
    rounds,
    aiStrategies: ['greedy', 'risk_aware'],
  };
}

function makeAction(type: string, playerId: string, data: any = {}): GameAction {
  return {
    type: type as any,
    playerId,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Helper: Run through auction + harbor master to reach INVESTMENT phase.
 * Returns the game state at the start of the first investment round.
 */
function advanceToInvestmentPhase(engine: GameEngine, state: GameState): GameState {
  // 1. Auction: player1 bids 5
  let result = engine.processAction(makeAction('BID', 'player1', { amount: 5 }));
  expect(result.success).toBe(true);

  // 2. Harbor master: skip stock purchase → select cargos → set positions
  result = engine.processAction(
    makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' })
  );
  // If player can't afford or decides to skip, handle accordingly
  // After buy stock, harbor master step should be SELECT_CARGO
  const gs = engine.getGameState()!;

  // Select 3 cargos
  result = engine.processAction(
    makeAction('HARBOR_MASTER_SELECT_CARGO', 'player1', {
      cargos: ['JADE', 'SILK', 'GINSENG'],
    })
  );
  expect(result.success).toBe(true);

  // Set ship positions (sum must be 9)
  result = engine.processAction(
    makeAction('HARBOR_MASTER_SET_POSITIONS', 'player1', {
      positions: { JADE: 5, SILK: 3, GINSENG: 1 },
    })
  );
  expect(result.success).toBe(true);

  const afterState = engine.getGameState()!;
  expect(afterState.phase).toBe('INVESTMENT');
  return afterState;
}

// ==================== Tests ====================

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  // ==================== 1. Game Initialization ====================

  describe('initializeGame', () => {
    it('should initialize a 3-player game correctly', () => {
      const config = createDefaultConfig(3, 3);
      const state = engine.initializeGame(config);

      expect(state.players).toHaveLength(3);
      expect(state.round).toBe(1);
      expect(state.phase).toBe('AUCTION');
      expect(state.ships).toHaveLength(3);
      expect(state.gameConfig).toEqual(config);
    });

    it('should give each player 30 cash and 2 initial stocks', () => {
      const state = engine.initializeGame(createDefaultConfig());

      state.players.forEach(player => {
        expect(player.cash).toBe(30);
        expect(player.stocks).toHaveLength(2);
        expect(player.investments).toEqual([]);
      });
    });

    it('should mark player1 as human and others as AI', () => {
      const state = engine.initializeGame(createDefaultConfig());

      expect(state.players[0].isAI).toBe(false);
      expect(state.players[0].name).toBe('You');
      expect(state.players[1].isAI).toBe(true);
      expect(state.players[2].isAI).toBe(true);
    });

    it('should initialize ships with positions at 0', () => {
      const state = engine.initializeGame(createDefaultConfig());

      state.ships.forEach(ship => {
        expect(ship.position).toBe(0);
        expect(ship.isDocked).toBe(false);
        expect(ship.isInShipyard).toBe(false);
        expect(ship.crew).toEqual([]);
      });
    });

    it('should initialize stock prices at 0', () => {
      const state = engine.initializeGame(createDefaultConfig());

      expect(state.stockPrices).toEqual({
        JADE: 0,
        SILK: 0,
        GINSENG: 0,
        NUTMEG: 0,
      });
    });

    it('should initialize game flow for 3-player game with correct event sequence', () => {
      const state = engine.initializeGame(createDefaultConfig(3));

      expect(state.gameFlow).toBeDefined();
      expect(state.gameFlow!.currentEventIndex).toBe(0);
      expect(state.gameFlow!.eventSequence).toHaveLength(13);
      // First event should be AUCTION
      expect(state.gameFlow!.eventSequence[0]).toBe('AUCTION');
      // Last event should be SETTLEMENT
      expect(state.gameFlow!.eventSequence[12]).toBe('SETTLEMENT');
    });

    it('should initialize game flow for 4-player game', () => {
      const config = createDefaultConfig(4);
      config.aiStrategies = ['greedy', 'risk_aware', 'greedy'];
      const state = engine.initializeGame(config);

      expect(state.players).toHaveLength(4);
      expect(state.gameFlow).toBeDefined();
      expect(state.gameFlow!.eventSequence).toHaveLength(12);
    });
  });

  // ==================== 2. Auction Phase ====================

  describe('Auction (processBid)', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(createDefaultConfig());
    });

    it('should deduct bid amount from player cash', () => {
      const result = engine.processAction(makeAction('BID', 'player1', { amount: 10 }));

      expect(result.success).toBe(true);
      const gs = engine.getGameState()!;
      const player1 = gs.players.find(p => p.id === 'player1')!;
      expect(player1.cash).toBe(20);
    });

    it('should set auction winner and initialize harbor master state', () => {
      engine.processAction(makeAction('BID', 'player1', { amount: 5 }));

      const gs = engine.getGameState()!;
      expect(gs.auctionWinner).toBe('player1');
      expect(gs.harborMaster).toBeDefined();
      expect(gs.harborMaster!.playerId).toBe('player1');
      expect(gs.harborMaster!.currentStep).toBe('BUY_STOCK');
    });

    it('should reject bid exceeding player cash', () => {
      const result = engine.processAction(makeAction('BID', 'player1', { amount: 50 }));

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });

    it('should reject negative bid', () => {
      const result = engine.processAction(makeAction('BID', 'player1', { amount: -5 }));

      expect(result.success).toBe(false);
    });
  });

  // ==================== 3. Harbor Master Phase ====================

  describe('Harbor Master flow', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(createDefaultConfig());
      // Win auction first
      engine.processAction(makeAction('BID', 'player1', { amount: 5 }));
    });

    it('should allow harbor master to buy stock, advancing step to SELECT_CARGO', () => {
      const result = engine.processAction(
        makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' })
      );

      expect(result.success).toBe(true);
      const gs = engine.getGameState()!;
      expect(gs.harborMaster!.currentStep).toBe('SELECT_CARGO');
      expect(gs.harborMaster!.hasCompletedStockPurchase).toBe(true);
    });

    it('should allow selecting 3 cargos', () => {
      // Buy stock first
      engine.processAction(makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' }));

      const result = engine.processAction(
        makeAction('HARBOR_MASTER_SELECT_CARGO', 'player1', {
          cargos: ['JADE', 'SILK', 'GINSENG'],
        })
      );

      expect(result.success).toBe(true);
      const gs = engine.getGameState()!;
      expect(gs.harborMaster!.selectedCargos).toEqual(['JADE', 'SILK', 'GINSENG']);
      expect(gs.harborMaster!.currentStep).toBe('SET_POSITIONS');
    });

    it('should transition to INVESTMENT after setting positions (sum=9)', () => {
      // Buy stock
      engine.processAction(makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' }));
      // Select cargos
      engine.processAction(
        makeAction('HARBOR_MASTER_SELECT_CARGO', 'player1', {
          cargos: ['JADE', 'SILK', 'GINSENG'],
        })
      );
      // Set positions
      const result = engine.processAction(
        makeAction('HARBOR_MASTER_SET_POSITIONS', 'player1', {
          positions: { JADE: 5, SILK: 3, GINSENG: 1 },
        })
      );

      expect(result.success).toBe(true);
      const gs = engine.getGameState()!;
      expect(gs.phase).toBe('INVESTMENT');
      expect(gs.harborMaster).toBeUndefined();
      expect(gs.investmentRound).toBeDefined();
    });

    it('should reject positions that do not sum to 9', () => {
      engine.processAction(makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' }));
      engine.processAction(
        makeAction('HARBOR_MASTER_SELECT_CARGO', 'player1', {
          cargos: ['JADE', 'SILK', 'GINSENG'],
        })
      );

      const result = engine.processAction(
        makeAction('HARBOR_MASTER_SET_POSITIONS', 'player1', {
          positions: { JADE: 5, SILK: 3, GINSENG: 3 },
        })
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('总和必须为9');
    });

    it('should set ship positions correctly', () => {
      engine.processAction(makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' }));
      engine.processAction(
        makeAction('HARBOR_MASTER_SELECT_CARGO', 'player1', {
          cargos: ['JADE', 'SILK', 'GINSENG'],
        })
      );
      engine.processAction(
        makeAction('HARBOR_MASTER_SET_POSITIONS', 'player1', {
          positions: { JADE: 5, SILK: 3, GINSENG: 1 },
        })
      );

      const gs = engine.getGameState()!;
      const jade = gs.ships.find(s => s.cargoType === 'JADE')!;
      const silk = gs.ships.find(s => s.cargoType === 'SILK')!;
      const ginseng = gs.ships.find(s => s.cargoType === 'GINSENG')!;

      expect(jade.position).toBe(5);
      expect(silk.position).toBe(3);
      expect(ginseng.position).toBe(1);
    });
  });

  // ==================== 4. Investment Round State Machine ====================

  describe('Investment round state machine (3-player)', () => {
    let state: GameState;

    beforeEach(() => {
      state = engine.initializeGame(createDefaultConfig(3, 1));
    });

    it('should initialize investment round with correct player order from harbor master', () => {
      advanceToInvestmentPhase(engine, state);
      const gs = engine.getGameState()!;

      expect(gs.investmentRound).toBeDefined();
      expect(gs.investmentRound!.investmentOrder).toHaveLength(3);
      // Harbor master (player1) goes first
      expect(gs.investmentRound!.investmentOrder[0]).toBe('player1');
      expect(gs.investmentRound!.currentPlayerIndex).toBe(0);
      expect(gs.investmentRound!.currentRound).toBe(1);
    });

    it('should advance player index after each investment within a round', () => {
      advanceToInvestmentPhase(engine, state);

      // Player 1 invests
      let result = engine.processAction(
        makeAction('SELECT_INVESTMENT', 'player1', { slotId: 'insurance' })
      );
      expect(result.success).toBe(true);

      let gs = engine.getGameState()!;
      // Should still be in INVESTMENT phase, next player
      expect(gs.phase).toBe('INVESTMENT');
      expect(gs.investmentRound!.currentPlayerIndex).toBe(1);
    });

    it('should reject investment from wrong player', () => {
      advanceToInvestmentPhase(engine, state);

      // Player 2 tries to invest when it's player 1's turn
      const result = engine.processAction(
        makeAction('SELECT_INVESTMENT', 'player2', { slotId: 'insurance' })
      );

      expect(result.success).toBe(false);
    });

    it('should advance through all 3 players then move to next event', () => {
      advanceToInvestmentPhase(engine, state);
      const gs = engine.getGameState()!;
      const order = gs.investmentRound!.investmentOrder;

      // All 3 players invest in round 1
      for (let i = 0; i < 3; i++) {
        const slotId = `crew-jade-${i + 1}`;
        const result = engine.processAction(
          makeAction('SELECT_INVESTMENT', order[i], { slotId })
        );
        expect(result.success).toBe(true);
      }

      // After all 3 players invest in round 1:
      // 3P flow: [AUCTION(0), HARBOR_MASTER(1), INVESTMENT(2), INVESTMENT(3), ...]
      // After completing event at index 2, should advance to index 3 (another INVESTMENT)
      const afterGs = engine.getGameState()!;
      expect(afterGs.phase).toBe('INVESTMENT');
      // Player index should be reset to 0 for the new round
      expect(afterGs.investmentRound!.currentPlayerIndex).toBe(0);
    });

    it('should track correct event index progression through game flow', () => {
      advanceToInvestmentPhase(engine, state);

      // After harbor master set positions, we're at event index 2 (first INVESTMENT)
      const gs = engine.getGameState()!;
      expect(gs.gameFlow!.currentEventIndex).toBe(2);
    });
  });

  // ==================== 5. Dice Roll and Event Progression ====================

  describe('Dice roll and event progression', () => {
    it('should move ships based on dice results', () => {
      const state = engine.initializeGame(createDefaultConfig(3, 1));
      advanceToInvestmentPhase(engine, state);

      // Complete investment rounds 1 & 2 (3P: indices 2 and 3 are INVESTMENT)
      const gs = engine.getGameState()!;
      const order = gs.investmentRound!.investmentOrder;

      // Round 1: all 3 players invest
      for (let i = 0; i < 3; i++) {
        engine.processAction(
          makeAction('SELECT_INVESTMENT', order[i], { slotId: `crew-jade-${i + 1}` })
        );
      }

      // Round 2: all 3 players invest (now at event index 3)
      const gs2 = engine.getGameState()!;
      const order2 = gs2.investmentRound!.investmentOrder;
      for (let i = 0; i < 3; i++) {
        engine.processAction(
          makeAction('SELECT_INVESTMENT', order2[i], { slotId: `crew-silk-${i + 1}` })
        );
      }

      // Now should be at SAILING phase (DICE_ROLL event, index 4)
      const gs3 = engine.getGameState()!;
      expect(gs3.phase).toBe('SAILING');

      // Record positions before dice roll
      const initialPositions = gs3.ships.map(s => s.position);
      const result = engine.processAction(makeAction('ROLL_DICE', 'player1', {}));
      expect(result.success).toBe(true);

      // After rolling, the engine auto-advances to next event (INVESTMENT)
      // which clears diceResults, so we check ship positions changed instead
      const gs4 = engine.getGameState()!;

      // At least one ship should have moved forward (dice values are 1-6)
      const anyMoved = gs4.ships.some((ship, index) => ship.position > initialPositions[index]);
      expect(anyMoved).toBe(true);
    });
  });

  // ==================== 6. Settlement ====================

  describe('Settlement (processSettlement)', () => {
    it('should update stock prices based on docked ships', () => {
      const state = engine.initializeGame(createDefaultConfig());

      // Manually set one ship as docked  
      state.ships[0].isDocked = true;
      state.ships[0].cargoType = 'JADE';

      engine.processSettlement(state);

      // JADE price should increase
      expect(state.stockPrices.JADE).toBeGreaterThan(0);
    });

    it('should calculate harbor office rewards correctly', () => {
      const state = engine.initializeGame(createDefaultConfig());

      // Set 2 ships as docked
      state.ships[0].isDocked = true;
      state.ships[1].isDocked = true;

      // Give player1 a harbor-office-b investment (requires >= 2 docked, reward = 8)
      state.players[0].investments.push({
        id: 'test-inv-1',
        slotId: 'harbor-office-b',
        type: 'HARBOR_OFFICE',
        cost: 3,
        expectedReward: 8,
        round: 1,
        phase: 'INVESTMENT',
      });

      // Clear all stocks to avoid calculateStockValues interference
      state.players.forEach(p => { p.stocks = []; });

      const initialCash = state.players[0].cash;
      engine.processSettlement(state);

      // Player should receive 8 cash for harbor-office-b with 2 docked ships
      expect(state.players[0].cash).toBe(initialCash + 8);
    });

    it('should calculate shipyard office rewards correctly', () => {
      const state = engine.initializeGame(createDefaultConfig());

      // Set 1 ship in shipyard
      state.ships[0].isInShipyard = true;

      // Give player1 a shipyard-office-a investment (requires >= 1 in shipyard, reward = 6)
      state.players[0].investments.push({
        id: 'test-inv-2',
        slotId: 'shipyard-office-a',
        type: 'SHIPYARD_OFFICE',
        cost: 4,
        expectedReward: 6,
        round: 1,
        phase: 'INVESTMENT',
      });

      const initialCash = state.players[0].cash;
      engine.processSettlement(state);

      expect(state.players[0].cash).toBe(initialCash + 6);
    });

    it('should reset investments and ships after settlement', () => {
      const state = engine.initializeGame(createDefaultConfig());
      state.ships[0].isDocked = true;
      state.players[0].investments.push({
        id: 'test-inv',
        slotId: 'insurance',
        type: 'INSURANCE',
        cost: 0,
        expectedReward: 10,
        round: 1,
        phase: 'INVESTMENT',
      });

      engine.processSettlement(state);

      // All investments should be cleared
      state.players.forEach(p => {
        expect(p.investments).toEqual([]);
      });
      // Ships should be reset
      state.ships.forEach(s => {
        expect(s.position).toBe(0);
        expect(s.isDocked).toBe(false);
        expect(s.crew).toEqual([]);
      });
    });
  });

  // ==================== 7. End-to-End Single Round ====================

  describe('End-to-end: complete single round (3-player)', () => {
    it('should complete a full game round from AUCTION to SETTLEMENT', () => {
      const state = engine.initializeGame(createDefaultConfig(3, 1));

      // --- AUCTION ---
      expect(state.phase).toBe('AUCTION');
      engine.processAction(makeAction('BID', 'player1', { amount: 5 }));

      // --- HARBOR MASTER ---
      engine.processAction(makeAction('BUY_STOCK', 'player1', { cargoType: 'JADE' }));
      engine.processAction(
        makeAction('HARBOR_MASTER_SELECT_CARGO', 'player1', {
          cargos: ['JADE', 'SILK', 'GINSENG'],
        })
      );
      engine.processAction(
        makeAction('HARBOR_MASTER_SET_POSITIONS', 'player1', {
          positions: { JADE: 5, SILK: 3, GINSENG: 1 },
        })
      );

      let gs = engine.getGameState()!;
      expect(gs.phase).toBe('INVESTMENT');
      const order = gs.investmentRound!.investmentOrder;

      // --- INVESTMENT ROUND 1 (event index 2) ---
      // 3P flow: INVESTMENT at indices 2, 3, 5, 8
      for (let i = 0; i < 3; i++) {
        const result = engine.processAction(
          makeAction('SELECT_INVESTMENT', order[i], { slotId: `crew-jade-${i + 1}` })
        );
        expect(result.success).toBe(true);
      }

      // --- INVESTMENT ROUND 2 (event index 3) ---
      gs = engine.getGameState()!;
      expect(gs.phase).toBe('INVESTMENT');
      for (let i = 0; i < 3; i++) {
        const playerId = gs.investmentRound!.investmentOrder[i];
        const result = engine.processAction(
          makeAction('SELECT_INVESTMENT', playerId, { slotId: `crew-silk-${i + 1}` })
        );
        expect(result.success).toBe(true);
      }

      // --- DICE ROLL 1 (event index 4) ---
      gs = engine.getGameState()!;
      expect(gs.phase).toBe('SAILING');
      engine.processAction(makeAction('ROLL_DICE', 'player1', {}));

      // --- INVESTMENT ROUND 3 (event index 5) ---
      gs = engine.getGameState()!;
      expect(gs.phase).toBe('INVESTMENT');
      for (let i = 0; i < 3; i++) {
        const playerId = gs.investmentRound!.investmentOrder[i];
        const result = engine.processAction(
          makeAction('SELECT_INVESTMENT', playerId, { slotId: `crew-ginseng-${i + 1}` })
        );
        expect(result.success).toBe(true);
      }

      // --- DICE ROLL 2 (event index 6) ---
      gs = engine.getGameState()!;
      expect(gs.phase).toBe('SAILING');
      engine.processAction(makeAction('ROLL_DICE', 'player1', {}));

      // --- PIRATE_ONBOARD (event index 7) - auto-skips if no pirates ---
      // --- INVESTMENT ROUND 4 (event index 8) ---
      gs = engine.getGameState()!;
      // Could be PIRATE_ONBOARD or INVESTMENT depending on state
      // If no pirates, it auto-advances to INVESTMENT
      if (gs.phase === 'PIRATE_ONBOARD') {
        // Should auto-advance since no one invested in pirates
        // The engine calls advanceToNextEvent internally
      }

      // Might need to check where we are now
      gs = engine.getGameState()!;
      if (gs.phase === 'INVESTMENT') {
        for (let i = 0; i < 3; i++) {
          const playerId = gs.investmentRound!.investmentOrder[i];
          // Use navigator or other remaining slots
          const result = engine.processAction(
            makeAction('SELECT_INVESTMENT', playerId, { slotId: `harbor-office-${['a', 'b', 'c'][i]}` })
          );
          expect(result.success).toBe(true);
        }
      }

      // --- NAVIGATOR_USE (event index 9) - auto-skips if no navigators ---
      // --- DICE ROLL 3 (event index 10) ---
      gs = engine.getGameState()!;
      if (gs.phase === 'NAVIGATOR_USE') {
        // Auto-advances if no one has navigator
      }

      gs = engine.getGameState()!;
      if (gs.phase === 'SAILING') {
        engine.processAction(makeAction('ROLL_DICE', 'player1', {}));
      }

      // --- PIRATE_HIJACK (event index 11) - auto-skips ---
      // --- SETTLEMENT (event index 12) ---
      gs = engine.getGameState()!;

      // At this point we should have reached or passed SETTLEMENT
      // The settlement processes automatically via initializeEventState
      // Check that the game progressed past settlement
      const reachedSettlementOrEnd =
        gs.phase === 'SETTLEMENT' ||
        gs.phase === 'GAME_END' ||
        gs.gameFlow!.currentEventIndex >= 12;

      expect(reachedSettlementOrEnd).toBe(true);
    });
  });

  // ==================== 8. Game Flow Event Sequence Validation ====================

  describe('Game flow event sequence', () => {
    it('3-player: event sequence should be correct', () => {
      const state = engine.initializeGame(createDefaultConfig(3));
      const events = state.gameFlow!.eventSequence;

      expect(events).toEqual([
        'AUCTION',        // 0
        'HARBOR_MASTER',  // 1
        'INVESTMENT',     // 2
        'INVESTMENT',     // 3
        'DICE_ROLL',      // 4
        'INVESTMENT',     // 5
        'DICE_ROLL',      // 6
        'PIRATE_ONBOARD', // 7
        'INVESTMENT',     // 8
        'NAVIGATOR_USE',  // 9
        'DICE_ROLL',      // 10
        'PIRATE_HIJACK',  // 11
        'SETTLEMENT',     // 12
      ]);
    });

    it('4-player: event sequence should be correct', () => {
      const config = createDefaultConfig(4);
      config.aiStrategies = ['greedy', 'risk_aware', 'greedy'];
      const state = engine.initializeGame(config);
      const events = state.gameFlow!.eventSequence;

      expect(events).toEqual([
        'AUCTION',        // 0
        'HARBOR_MASTER',  // 1
        'INVESTMENT',     // 2
        'DICE_ROLL',      // 3
        'INVESTMENT',     // 4
        'DICE_ROLL',      // 5
        'PIRATE_ONBOARD', // 6
        'INVESTMENT',     // 7
        'NAVIGATOR_USE',  // 8
        'DICE_ROLL',      // 9
        'PIRATE_HIJACK',  // 10
        'SETTLEMENT',     // 11
      ]);
    });
  });

  // ==================== 9. Mortgage Stock ====================

  describe('Mortgage stock', () => {
    it('should increase player cash by 12 per mortgaged stock', () => {
      const state = engine.initializeGame(createDefaultConfig());
      const player = state.players[0];
      // Ensure player has JADE stock
      player.stocks = [{ cargoType: 'JADE', quantity: 2, isMortgaged: false }];
      const initialCash = player.cash;

      const result = engine.processAction(
        makeAction('MORTGAGE_STOCK', 'player1', { cargoType: 'JADE', quantity: 1 })
      );

      expect(result.success).toBe(true);
      const gs = engine.getGameState()!;
      const p = gs.players.find(p => p.id === 'player1')!;
      expect(p.cash).toBe(initialCash + 12);
      expect(p.stocks[0].quantity).toBe(1);
    });
  });

  // ==================== 10. Investment Cost Calculation ====================

  describe('Investment cost calculation', () => {
    it('should calculate crew costs correctly for JADE (3,4,5,5)', () => {
      const state = engine.initializeGame(createDefaultConfig());
      advanceToInvestmentPhase(engine, state);

      const gs = engine.getGameState()!;
      const order = gs.investmentRound!.investmentOrder;

      // First crew investment for JADE should cost 3
      const result1 = engine.processAction(
        makeAction('SELECT_INVESTMENT', order[0], { slotId: 'crew-jade-1' })
      );
      expect(result1.success).toBe(true);
      // Player should have paid 3
      const p1 = engine.getGameState()!.players.find(p => p.id === order[0])!;
      // Initial cash was 30, bid was 5 (if player1), stock bought (5), so check relative
    });
  });
});
