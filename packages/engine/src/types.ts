// ==================== 货物与船只 ====================

export type CargoType = 'JADE' | 'SILK' | 'GINSENG' | 'NUTMEG';

export interface ShipConfig {
    cargo: CargoType;
    seats: number;
    costs: number[];       // 每个座位的成本，按顺序填满
    totalReward: number;   // 总奖励池
}

export interface ShipState {
    cargo: CargoType;
    position: number;      // 0-14, >=14 = 到港
    crew: CrewSeat[];
}

export interface CrewSeat {
    playerId: string;
    seatIndex: number;     // 0-based
    cost: number;
}

// ==================== 投资槽位 ====================

export type InvestmentType =
    | 'CREW'
    | 'HARBOR_OFFICE'
    | 'SHIPYARD_OFFICE'
    | 'PIRATE'
    | 'NAVIGATOR'
    | 'INSURANCE';

export interface OfficeSlot {
    id: string;
    cost: number;
    minShips: number;     // 最低需要的船只数量
    reward: number;
}

export interface Investment {
    type: InvestmentType;
    slotId: string;
    playerId: string;
    cost: number;
    reward: number;       // 预期收益（结算时计算实际）
}

// ==================== 股票 ====================

export interface StockHolding {
    cargo: CargoType;
    quantity: number;
    mortgaged: number;    // 已抵押数量
}

// ==================== 玩家 ====================

export interface PlayerState {
    id: string;
    name: string;
    cash: number;
    stocks: StockHolding[];
    isAI: boolean;
}

// ==================== 游戏配置 ====================

export interface GameConfig {
    playerCount: 3 | 4;
    rounds: number;
    playerNames?: string[];
}

// ==================== 游戏阶段与动作 ====================

export type Phase =
    | 'AUCTION'
    | 'PLACEMENT'
    | 'INVEST'
    | 'SAIL'
    | 'SETTLE'
    | 'GAME_OVER';

/** 动作类型 */
export type ActionType =
    | 'BID'                   // 拍卖出价
    | 'PASS_AUCTION'          // 放弃拍卖
    | 'BUY_STOCK'             // 港务长购买股票
    | 'SKIP_BUY_STOCK'        // 跳过购买
    | 'MORTGAGE_STOCK'        // 抵押股票
    | 'REDEEM_STOCK'          // 赎回股票
    | 'PLACE_SHIPS'           // 设置船只位置
    | 'SELECT_INVESTMENT'     // 选择投资
    | 'SKIP_INVEST'            // 跳过投资（本轮剩余投资轮次全部跳过）
    | 'ROLL_DICE'             // 掷骰子
    | 'USE_NAVIGATOR'         // 使用领航员
    | 'SKIP_NAVIGATOR'        // 跳过领航员
    | 'PIRATE_BOARD'          // 海盗上船
    | 'PIRATE_KICK'           // 海盗踢人
    | 'PIRATE_PASS'           // 海盗放弃
    | 'PIRATE_HIJACK'         // 海盗劫持决策
    | 'ACKNOWLEDGE'            // 确认（自动事件后继续）
    | 'ACKNOWLEDGE_SETTLE';   // 确认结算（查看结算摘要后继续）

/** 通用动作 */
export interface Action {
    type: ActionType;
    playerId: string;
    data: Record<string, unknown>;
}

// ==================== 游戏流程子阶段 ====================

/**
 * 一轮的事件序列中每个步骤
 * 3P: [INVEST, INVEST, DICE, INVEST, DICE, INVEST, DICE]
 * 4P: [INVEST, DICE, INVEST, DICE, INVEST, DICE]
 */
export interface RoundStep {
    type: 'INVEST' | 'DICE';
    index: number;
}

// ==================== 待执行动作提示 ====================

export interface PendingAction {
    playerId: string;
    actionType: ActionType;
    validActions: Action[];
    message?: string;
}

// ==================== 骰子 ====================

export interface DiceResult {
    values: [number, number, number]; // 3 个骰子
    round: number;
    rollIndex: number;                // 该轮第几次掷骰 (0-2)
}

// ==================== 游戏状态 ====================

export interface GameState {
    // 基本信息
    config: GameConfig;
    round: number;            // 1-based
    phase: Phase;

    // 玩家
    players: PlayerState[];
    currentPlayerIndex: number;

    // 船只
    ships: ShipState[];
    stockPrices: Record<CargoType, number>;

    // 拍卖
    auctionState?: AuctionState;

    // 港务长
    harborMasterId?: string;

    // 投资
    investments: Investment[];
    roundSteps: RoundStep[];
    currentStepIndex: number;
    investTurnIndex: number;   // 当前投资轮中第几个玩家 (0-based)

    // 航行
    diceHistory: DiceResult[];
    currentRollIndex: number;  // 当前是第几次掷骰 (0-2)
    navigatorsUsed: string[];  // 本次掷骰已决策的领航员 slotId
    investSkippedPlayers: string[];  // 本轮已选择跳过投资的玩家ID

    // 待执行动作
    pendingAction: PendingAction | null;

    // 海盗
    pirateDecisions: Record<string, 'dock' | 'shipyard'>; // cargo → fate (captain decides)
    pirateBoardedSlots: string[];  // pirate slotIds that boarded ships (become crew)

    // 历史信息 (跨轮保留)
    /** 每位玩家公开购买的股票记录 (港务长购股, 按货物累计) */
    stockPurchaseHistory: Record<string, Record<CargoType, number>>;
    /** 每位玩家最近一次当港务长时的排船位置 */
    playerShipPlacements: Record<string, Record<CargoType, number>>;

    // 结算摘要 (SETTLE 阶段暂停时填充)
    settlementSummary?: SettlementSummary;

    // 结果
    gameResult?: GameResult;

    // 日志
    log: LogEntry[];
}

export interface SettlementSummary {
    dockedCargos: CargoType[];
    shipyardCargos: CargoType[];
    hijackedCargos: CargoType[];
    stockPriceChanges: { cargo: CargoType; from: number; to: number }[];
    anyStockMaxed: boolean;
    isLastRound: boolean;
}

export interface AuctionState {
    currentBidderId: string;
    highestBid: number;
    highestBidderId: string | null;
    passedPlayerIds: string[];
    biddingOrder: string[];    // 竞拍顺序
}

export interface LogEntry {
    round: number;
    phase: Phase;
    playerId: string;
    action: ActionType | 'EVENT';
    detail: string;
    timestamp: number;
}

export interface GameResult {
    rankings: PlayerRanking[];
    totalRounds: number;
}

export interface PlayerRanking {
    playerId: string;
    name: string;
    cash: number;
    stockValue: number;
    mortgagePenalty: number;
    totalScore: number;
    rank: number;
}

// ==================== RNG 接口 ====================

/**
 * 可注入的随机数生成器，支持确定性测试和蒙特卡洛模拟
 */
export interface RNG {
    /** 返回 [min, max] 闭区间的随机整数 */
    nextInt(min: number, max: number): number;
}
