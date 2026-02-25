/**
 * Manila 游戏规则常量表
 * 所有游戏数值定义在此，方便调整和测试
 */

import type { CargoType, ShipConfig, OfficeSlot } from './types.js';

// ==================== 船只配置 ====================

export const SHIPS: Record<CargoType, ShipConfig> = {
    JADE: { cargo: 'JADE', seats: 4, costs: [3, 4, 5, 5], totalReward: 36 },
    SILK: { cargo: 'SILK', seats: 3, costs: [3, 4, 5], totalReward: 30 },
    GINSENG: { cargo: 'GINSENG', seats: 3, costs: [1, 2, 3], totalReward: 18 },
    NUTMEG: { cargo: 'NUTMEG', seats: 3, costs: [2, 3, 4], totalReward: 24 },
};

export const ALL_CARGO: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];

// ==================== 港口/修船厂办事处 ====================

export const HARBOR_OFFICES: OfficeSlot[] = [
    { id: 'harbor-A', cost: 4, minShips: 1, reward: 6 },
    { id: 'harbor-B', cost: 3, minShips: 2, reward: 8 },
    { id: 'harbor-C', cost: 2, minShips: 3, reward: 15 },
];

export const SHIPYARD_OFFICES: OfficeSlot[] = [
    { id: 'shipyard-A', cost: 4, minShips: 1, reward: 6 },
    { id: 'shipyard-B', cost: 3, minShips: 2, reward: 8 },
    { id: 'shipyard-C', cost: 2, minShips: 3, reward: 15 },
];

// ==================== 海盗 ====================

export const PIRATE_CAPTAIN_COST = 5;
export const PIRATE_CREW_COST = 5;

// ==================== 领航员 ====================

export const NAVIGATOR_BIG_COST = 5;
export const NAVIGATOR_BIG_MOVE = 2;
export const NAVIGATOR_SMALL_COST = 2;
export const NAVIGATOR_SMALL_MOVE = 1;

// ==================== 保险 ====================

export const INSURANCE_COST = 0;
export const INSURANCE_REWARD = 10;
/** 保险赔付：按进修船厂船只数 [0艘, 1艘, 2艘, 3艘] */
export const INSURANCE_PENALTIES = [0, 6, 14, 29];

// ==================== 股票 ====================

export const STOCK_MIN_BUY_PRICE = 5;
export const STOCK_MORTGAGE_VALUE = 12;
export const STOCK_REDEEM_COST = 15;
export const STOCK_MAX_PER_CARGO = 5;  // 每种货物最多5张股票

/** 股价等级表: 0 → 5 → 10 → 20 → 30，到30游戏结束 */
export const STOCK_PRICE_LEVELS = [0, 5, 10, 20, 30];
export const STOCK_END_PRICE = 30;

/** @deprecated 使用 getNextStockPrice 代替 */
export const STOCK_PRICE_INCREASE = 5;

/** 根据当前股价返回下一个等级的股价 */
export function getNextStockPrice(currentPrice: number): number {
    for (const level of STOCK_PRICE_LEVELS) {
        if (level > currentPrice) return level;
    }
    return currentPrice; // 已达最高
}

/** 当前股价到下一等级的增量 */
export function getStockPriceIncrease(currentPrice: number): number {
    return getNextStockPrice(currentPrice) - currentPrice;
}

// ==================== 游戏常量 ====================

export const INITIAL_CASH = 30;
export const INITIAL_STOCKS = 2;
export const SHIP_DOCK_POSITION = 14;   // >= 14 视为到港
export const PIRATE_TRIGGER_POSITION = 13;
export const SHIP_PLACEMENT_TOTAL = 9;  // 3 船起始位置总和
export const DICE_COUNT = 3;

// ==================== 游戏流程 ====================

/** 3 人游戏：每轮事件序列（拍卖和港务长已处理，这是投资+掷骰交替） */
export const ROUND_STEPS_3P = [
    { type: 'INVEST' as const, index: 0 },
    { type: 'INVEST' as const, index: 1 },
    { type: 'DICE' as const, index: 0 },
    { type: 'INVEST' as const, index: 2 },
    { type: 'DICE' as const, index: 1 },
    { type: 'INVEST' as const, index: 3 },
    { type: 'DICE' as const, index: 2 },
];

/** 4 人游戏：每轮事件序列 */
export const ROUND_STEPS_4P = [
    { type: 'INVEST' as const, index: 0 },
    { type: 'DICE' as const, index: 0 },
    { type: 'INVEST' as const, index: 1 },
    { type: 'DICE' as const, index: 1 },
    { type: 'INVEST' as const, index: 2 },
    { type: 'DICE' as const, index: 2 },
];

// ==================== 辅助函数 ====================

/**
 * 获取船员座位成本
 */
export function getCrewCost(cargo: CargoType, seatIndex: number): number {
    return SHIPS[cargo].costs[seatIndex];
}

/**
 * 获取指定货物已占座位数
 */
export function getOccupiedSeats(cargo: CargoType, investments: { type: string; slotId: string }[]): number {
    return investments.filter(
        inv => inv.type === 'CREW' && inv.slotId.startsWith(`crew-${cargo}-`)
    ).length;
}

/**
 * 生成所有可用的投资槽位 ID
 */
export function getAllInvestmentSlots(selectedCargos: CargoType[]): string[] {
    const slots: string[] = [];

    // 船员位（仅限选中的 3 种货物）
    for (const cargo of selectedCargos) {
        const ship = SHIPS[cargo];
        for (let i = 0; i < ship.seats; i++) {
            slots.push(`crew-${cargo}-${i}`);
        }
    }

    // 港口办事处
    HARBOR_OFFICES.forEach(o => slots.push(o.id));

    // 修船厂办事处
    SHIPYARD_OFFICES.forEach(o => slots.push(o.id));

    // 海盗
    slots.push('pirate-captain', 'pirate-crew');

    // 领航员
    slots.push('navigator-big', 'navigator-small');

    // 保险
    slots.push('insurance');

    return slots;
}

/**
 * 获取投资成本
 */
export function getInvestmentCost(
    slotId: string,
    currentInvestments: { type: string; slotId: string }[]
): number | null {
    // 船员
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1].toUpperCase() as CargoType;
        const seatIndex = parseInt(parts[2]);
        if (seatIndex < 0 || seatIndex >= SHIPS[cargo].seats) return null;
        return SHIPS[cargo].costs[seatIndex];
    }

    // 港口办事处
    const harbor = HARBOR_OFFICES.find(o => o.id === slotId);
    if (harbor) return harbor.cost;

    // 修船厂办事处
    const shipyard = SHIPYARD_OFFICES.find(o => o.id === slotId);
    if (shipyard) return shipyard.cost;

    // 海盗
    if (slotId === 'pirate-captain') return PIRATE_CAPTAIN_COST;
    if (slotId === 'pirate-crew') return PIRATE_CREW_COST;

    // 领航员
    if (slotId === 'navigator-big') return NAVIGATOR_BIG_COST;
    if (slotId === 'navigator-small') return NAVIGATOR_SMALL_COST;

    // 保险
    if (slotId === 'insurance') return INSURANCE_COST;

    return null;
}

/**
 * 获取每个玩家船员在某船的座位奖励
 */
export function getCrewRewardPerSeat(cargo: CargoType, totalCrew: number): number {
    if (totalCrew === 0) return 0;
    return Math.floor(SHIPS[cargo].totalReward / totalCrew);
}
