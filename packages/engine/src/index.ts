export type {
    GameState, GameConfig, Action, PlayerState, ShipState,
    StockHolding, CargoType, AuctionState, PendingAction,
    Investment, RNG, DiceResult, GameResult, PlayerRanking,
    RoundStep, LogEntry, InvestmentType, ActionType, Phase,
    OfficeSlot, ShipConfig, CrewSeat, SettlementSummary,
} from './types.js';

export { createGame, applyAction, getValidActions, isGameOver, getGameResult } from './game.js';
export { defaultRNG, createFixedRNG, createSeededRNG, rollDice } from './dice.js';
export {
    SHIPS, ALL_CARGO, INITIAL_CASH, INITIAL_STOCKS,
    SHIP_DOCK_POSITION, SHIP_PLACEMENT_TOTAL, PIRATE_TRIGGER_POSITION,
    STOCK_MAX_PER_CARGO,
    HARBOR_OFFICES, SHIPYARD_OFFICES,
    NAVIGATOR_BIG_COST, NAVIGATOR_SMALL_COST,
    PIRATE_CAPTAIN_COST, PIRATE_CREW_COST,
    INSURANCE_COST, INSURANCE_REWARD, INSURANCE_PENALTIES,
    STOCK_MIN_BUY_PRICE, STOCK_MORTGAGE_VALUE, STOCK_REDEEM_COST,
    STOCK_PRICE_INCREASE, STOCK_PRICE_LEVELS, STOCK_END_PRICE,
    getNextStockPrice, getStockPriceIncrease,
    ROUND_STEPS_3P, ROUND_STEPS_4P,
    getInvestmentCost, getCrewRewardPerSeat, getAllInvestmentSlots,
} from './rules.js';
