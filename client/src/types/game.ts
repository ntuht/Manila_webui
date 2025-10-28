// 游戏核心类型定义

// 货物类型
export type CargoType = 'JADE' | 'SILK' | 'GINSENG' | 'NUTMEG';

// 游戏阶段
export type GamePhase = 
  | 'LOBBY'
  | 'AUCTION'
  | 'HARBOR_MASTER'
  | 'INVESTMENT'
  | 'SAILING'
  | 'NAVIGATOR_USE'
  | 'PIRATE_ONBOARD'
  | 'PIRATE_HIJACK'
  | 'SETTLEMENT'
  | 'GAME_END';

// 游戏事件类型
export type GameEvent = 
  | 'AUCTION'          // 拍卖阶段
  | 'HARBOR_MASTER'    // 港务长行动
  | 'INVESTMENT'       // 投资阶段
  | 'NAVIGATOR_USE'    // 领航员使用（最后一次骰子前）
  | 'DICE_ROLL'        // 投掷骰子
  | 'PIRATE_ONBOARD'   // 海盗上船判定（第2次骰子后）
  | 'PIRATE_HIJACK'    // 海盗劫持判定（第3次骰子后）
  | 'SETTLEMENT';      // 结算

// 游戏流程
export interface GameFlow {
  eventSequence: GameEvent[];
  currentEventIndex: number;
}

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
  | 'PIRATE_ONBOARD_ACTION'          // 海盗上船行动
  | 'PIRATE_HIJACK_ACTION'           // 海盗劫持行动
  | 'END_PHASE';

// 海盗行动类型
export type PirateAction = 
  | 'BOARD'        // 上船
  | 'KICK'         // 踢人
  | 'PASS';        // 放弃

// 领航员行动类型
export type NavigatorAction = 
  | 'MOVE_FORWARD'  // 向前移动
  | 'MOVE_BACKWARD' // 向后移动
  | 'PASS';         // 放弃

// 海盗上船状态
export interface PirateOnboardState {
  shipsAt13: CargoType[];
  piratePlayers: string[];
  currentPirateIndex: number;
}

// 海盗劫持状态
export interface PirateHijackState {
  shipsAt13: CargoType[];
  pirateCaptain: string | null;
  hijackDecision: 'DOCK' | 'SHIPYARD' | null;
}

// 领航员使用状态
export interface NavigatorUseState {
  navigatorPlayers: string[];
  currentNavigatorIndex: number;
}

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
  slotId: string;  // 投资槽位ID
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
  selectedCargos?: CargoType[];  // 港务长选择的货物（投资阶段使用）
  sailingPhase?: number;  // 当前航行阶段 (1-3)
  gameFlow?: GameFlow;  // 游戏流程状态
  pirateOnboardState?: PirateOnboardState;  // 海盗上船状态
  pirateHijackState?: PirateHijackState;  // 海盗劫持状态
  navigatorUseState?: NavigatorUseState;  // 领航员使用状态
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


// 游戏设置
export interface GameSettings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  autoPlay: boolean;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  theme: 'LIGHT' | 'DARK';
  language: 'EN' | 'ZH';
}
