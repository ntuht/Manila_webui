// 游戏核心类型定义

// 货物类型
export type CargoType = 'JADE' | 'SILK' | 'GINSENG' | 'NUTMEG';

// 游戏阶段
export type GamePhase = 'LOBBY' | 'AUCTION' | 'INVESTMENT' | 'SAILING' | 'SETTLEMENT' | 'GAME_END';

// 港务长阶段
export type HarborMasterPhase = 
  | 'BUY_STOCK'           // 购买股票
  | 'SELECT_CARGO'        // 选择货物
  | 'SET_POSITIONS';      // 设置船只位置

// 动作类型
export type ActionType = 
  | 'BID' 
  | 'BUY_STOCK' 
  | 'MORTGAGE_STOCK' 
  | 'HARBOR_MASTER_SELECT_CARGO'     // 港务长选择货物
  | 'HARBOR_MASTER_SET_POSITIONS'    // 港务长设置位置
  | 'SELECT_INVESTMENT' 
  | 'USE_NAVIGATOR' 
  | 'ROLL_DICE'
  | 'END_PHASE';

// 投资槽位类型
export type InvestmentSlotType = 
  | 'CREW' 
  | 'HARBOR_OFFICE' 
  | 'SHIPYARD_OFFICE' 
  | 'PIRATE' 
  | 'NAVIGATOR' 
  | 'INSURANCE';

// 港务长状态
export interface HarborMasterState {
  playerId: string;
  currentStep: HarborMasterPhase;
  selectedCargos: CargoType[];     // 已选择的货物（最多3种）
  shipPositions: Record<CargoType, number>;  // 船只初始位置
  hasCompletedStockPurchase: boolean;
}

// 投资轮次状态
export interface InvestmentRoundState {
  currentRound: number;          // 当前轮次 (1-3 或 1-4)
  totalRounds: number;           // 总轮次数
  currentPlayerIndex: number;    // 当前投资玩家索引
  investmentOrder: string[];     // 投资顺序（玩家ID列表）
}

// 领航员动作类型
export type NavigatorActionType = 'SMALL_NAVIGATOR' | 'BIG_NAVIGATOR';

// 玩家状态
export interface PlayerState {
  id: string;
  name: string;
  cash: number;
  stocks: StockHolding[];
  investments: Investment[];
  isActive: boolean;
  isAI: boolean;
  aiStrategy?: string;
  isCurrentPlayer?: boolean;
}

// 股票持有
export interface StockHolding {
  cargoType: CargoType;
  quantity: number;
  isMortgaged?: boolean;
}

// 投资记录
export interface Investment {
  id: string;
  type: InvestmentSlotType;
  cost: number;
  expectedReward: number;
  round: number;
  phase: GamePhase;
}

// 船只状态
export interface ShipState {
  id: string;
  cargoType: CargoType;
  position: number;
  crew: CrewMember[];
  isDocked: boolean;
  isInShipyard: boolean;
  isHijacked: boolean;
}

// 船员成员
export interface CrewMember {
  playerId: string;
  playerName: string;
  seatNumber: number;
  cost: number;
}

// 游戏状态
export interface GameState {
  gameId: string;
  phase: GamePhase;
  round: number;
  players: PlayerState[];
  ships: ShipState[];
  stockPrices: StockPrices;
  gameConfig: GameConfig;
  history: GameHistoryEntry[];
  currentPlayerIndex: number;
  auctionWinner?: string;
  diceResults?: DiceResult[];
  harborMaster?: HarborMasterState;
  investmentRound?: InvestmentRoundState;
}

// 股票价格
export interface StockPrices {
  JADE: number;
  SILK: number;
  GINSENG: number;
  NUTMEG: number;
}

// 游戏配置
export interface GameConfig {
  players: number;
  rounds: number;
  aiStrategies: string[];
  enableSearch?: boolean;
  timeoutSeconds?: number;
}

// 游戏历史条目
export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  round: number;
  phase: GamePhase;
  playerId: string;
  action: GameAction;
  result: ActionResult;
}

// 游戏动作
export interface GameAction {
  type: ActionType;
  playerId: string;
  data: any;
  timestamp: number;
}

// 动作结果
export interface ActionResult {
  success: boolean;
  newState?: GameState;
  error?: string;
  validActions?: GameAction[];
}

// 骰子结果
export interface DiceResult {
  dice1: number;
  dice2: number;
  dice3: number;
  total: number;
  phase: number;
}

// 投资槽位
export interface InvestmentSlot {
  id: string;
  type: InvestmentSlotType;
  cost: number;
  reward: number;
  isOccupied: boolean;
  occupiedBy?: string;
  requirements: InvestmentRequirements;
}

// 投资要求
export interface InvestmentRequirements {
  minShipsDocked?: number;
  minShipsInShipyard?: number;
  allShipsDocked?: boolean;
  allShipsInShipyard?: boolean;
}

// 奖励分配
export interface RewardDistribution {
  crewRewards: CrewReward[];
  officeRewards: OfficeReward[];
  insurancePayouts: InsurancePayout[];
  stockDividends: StockDividend[];
}

// 船员奖励
export interface CrewReward {
  shipId: string;
  cargoType: CargoType;
  totalReward: number;
  crewMembers: CrewMember[];
  rewardPerMember: number;
}

// 办公室奖励
export interface OfficeReward {
  playerId: string;
  officeType: 'HARBOR' | 'SHIPYARD';
  seat: 'A' | 'B' | 'C';
  reward: number;
}

// 保险赔付
export interface InsurancePayout {
  playerId: string;
  payout: number;
  shipsInShipyard: number;
}

// 股票分红
export interface StockDividend {
  cargoType: CargoType;
  priceIncrease: number;
  newPrice: number;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// 游戏统计
export interface GameStatistics {
  totalRounds: number;
  averageScore: number;
  highestScore: number;
  mostValuableCargo: CargoType;
  mostActivePlayer: string;
  gameDuration: number;
}

// AI 策略接口
export interface AIStrategy {
  name: string;
  selectBid(state: GameState, playerId: string): number;
  selectInvestment(state: GameState, playerId: string): InvestmentSlot;
  selectNavigatorAction(state: GameState, playerId: string): NavigatorActionType;
  selectStockPurchase(state: GameState, playerId: string): CargoType | null;
}

// 游戏事件
export interface GameEvent {
  type: string;
  data: any;
  timestamp: number;
}

// 游戏设置
export interface GameSettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  autoPlay: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  theme: 'LIGHT' | 'DARK';
  language: 'EN' | 'ZH';
}
