/**
 * 动作空间映射 — Action ↔ 整数 ID 双向转换
 *
 * 设计原则：
 * - 固定维度，与玩家数 (3~5) 无关
 * - 每个 Action 都有唯一的 ID，通过 Action Mask 过滤非法动作
 * - BID 范围扩大到 1~99 以覆盖极端情况
 *
 * ID 分配：
 *   0:        PASS_AUCTION              放弃竞拍
 *   1-99:     BID(amount)               出价 1~99 元
 *   100:      SKIP_BUY_STOCK            跳过买股
 *   101-104:  BUY_STOCK(cargo)          买 JADE/SILK/GINSENG/NUTMEG
 *   105-128:  SELECT_INVESTMENT(slot)   24 个投资槽位
 *   129:      SKIP_NAVIGATOR            跳过领航员
 *   130-141:  USE_NAVIGATOR(ship,delta) 3 船 × 4 种移动 = 12
 *   142-145:  MORTGAGE_STOCK(cargo)     抵押 4 种股票
 *   146:      ROLL_DICE                 掷骰子（自动动作）
 *   147-246:  PLACE_SHIPS(combo)        100 种布置组合
 *   247:      PIRATE_PASS               海盗放弃上船
 *   248-250:  PIRATE_BOARD(ship)        海盗上船 (3艘)
 *   251-259:  PIRATE_KICK(ship,opp)     海盗踢人 (3船×3对手=9)
 *   260:      PIRATE_HIJACK_DOCK        劫持→到港
 *   261:      PIRATE_HIJACK_SHIPYARD    劫持→修船厂
 *   262:      SKIP_INVEST               跳过投资
 *   263-274:  USE_NAVIGATOR_DUAL        大领航员双船分配 (12种)
 */

import type { Action, GameState, CargoType } from '@manila/engine';
import { ALL_CARGO, SHIPS, SHIP_PLACEMENT_TOTAL } from '@manila/engine';

// ==================== 动作空间维度 ====================

export const ACTION_DIM = 288;

// ==================== 货物索引映射 ====================

const CARGO_INDEX: Record<CargoType, number> = {
    JADE: 0,
    SILK: 1,
    GINSENG: 2,
    NUTMEG: 3,
};

const INDEX_CARGO: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];

// ==================== ID 常量 ====================

const ID_PASS_AUCTION = 0;
const ID_BID_START = 1;      // 1~99
const ID_BID_END = 99;
const ID_SKIP_BUY_STOCK = 100;
const ID_BUY_STOCK_START = 101;
const ID_BUY_STOCK_END = 104;
const ID_INVESTMENT_START = 105;
// 24 slots → 105~128
const ID_INVESTMENT_END = 128;
const ID_SKIP_NAVIGATOR = 129;
const ID_NAVIGATOR_START = 130;
// 12 moves → 130~141
const ID_NAVIGATOR_END = 141;
const ID_MORTGAGE_START = 142;
const ID_MORTGAGE_END = 145;
const ID_ROLL_DICE = 146;
const ID_PLACEMENT_START = 147;
// 100 combos → 147~246

// 海盗动作
const ID_PIRATE_PASS = 247;
const ID_PIRATE_BOARD_START = 248;   // 248,249,250 = 3艘船
const ID_PIRATE_BOARD_END = 250;
const ID_PIRATE_KICK_START = 251;    // 251-259 = 3船×3对手
const ID_PIRATE_KICK_END = 259;
const ID_PIRATE_HIJACK_DOCK = 260;
const ID_PIRATE_HIJACK_SHIPYARD = 261;
const ID_SKIP_INVEST = 262;
const ID_NAV_DUAL_START = 263;  // 12 dual moves → 263~274
const ID_NAV_DUAL_END = 274;

// ==================== 布置组合预计算 ====================

export interface PlacementCombo {
    /** 未上船的货物 */
    excludedCargo: CargoType;
    /** 上船的 3 种货物 */
    cargos: CargoType[];
    /** 每船起始位置 */
    positions: Record<string, number>;
}

function generatePlacementCombos(): PlacementCombo[] {
    const combos: PlacementCombo[] = [];

    for (const excluded of ALL_CARGO) {
        const selected = ALL_CARGO.filter(c => c !== excluded);

        for (let a = 0; a <= Math.min(5, SHIP_PLACEMENT_TOTAL); a++) {
            for (let b = 0; b <= Math.min(5, SHIP_PLACEMENT_TOTAL - a); b++) {
                const c = SHIP_PLACEMENT_TOTAL - a - b;
                if (c < 0 || c > 5) continue;

                const positions: Record<string, number> = {};
                positions[selected[0]] = a;
                positions[selected[1]] = b;
                positions[selected[2]] = c;

                combos.push({
                    excludedCargo: excluded,
                    cargos: [...selected],
                    positions,
                });
            }
        }
    }

    return combos;
}

export const PLACEMENT_COMBOS = generatePlacementCombos();

// 验证组合数适合 ID 范围
const PLACEMENT_COUNT = PLACEMENT_COMBOS.length;
const ID_PLACEMENT_END = ID_PLACEMENT_START + PLACEMENT_COUNT - 1;

if (ID_PLACEMENT_END >= ACTION_DIM) {
    throw new Error(
        `ACTION_DIM=${ACTION_DIM} 不足: 需要 ${ID_PLACEMENT_END + 1} ` +
        `(${PLACEMENT_COUNT} 种布置组合)`
    );
}

// ==================== 投资槽位映射 ====================

/**
 * 所有可能的投资槽位 ID（固定顺序，共 24 个）
 * 包含所有 4 种货物的船员位，未在场的货物通过 mask 排除
 */
const ALL_INVESTMENT_SLOTS: string[] = [];

// 4 种货物 × 最多 4 座 = 13 个船员位
for (const cargo of ALL_CARGO) {
    const ship = SHIPS[cargo];
    for (let i = 0; i < ship.seats; i++) {
        ALL_INVESTMENT_SLOTS.push(`crew-${cargo}-${i}`);
    }
}
// 港口 3 + 修船厂 3 + 海盗 2 + 领航员 2 + 保险 1 = 11
ALL_INVESTMENT_SLOTS.push('harbor-A', 'harbor-B', 'harbor-C');
ALL_INVESTMENT_SLOTS.push('shipyard-A', 'shipyard-B', 'shipyard-C');
ALL_INVESTMENT_SLOTS.push('pirate-captain', 'pirate-crew');
ALL_INVESTMENT_SLOTS.push('navigator-big', 'navigator-small');
ALL_INVESTMENT_SLOTS.push('insurance');

// 总共: 13 + 11 = 24
if (ALL_INVESTMENT_SLOTS.length !== 24) {
    throw new Error(`Expected 24 investment slots, got ${ALL_INVESTMENT_SLOTS.length}`);
}

const SLOT_TO_INDEX = new Map<string, number>();
ALL_INVESTMENT_SLOTS.forEach((slot, i) => { SLOT_TO_INDEX.set(slot, i); });

export { ALL_INVESTMENT_SLOTS };

// ==================== 领航员移动表 ====================

interface NavMove {
    shipIndex: number;  // 0-2, 按 state.ships 顺序
    delta: number;      // -2, -1, +1, +2
}

const NAV_MOVES: NavMove[] = [];
for (let si = 0; si < 3; si++) {
    for (const delta of [-2, -1, 1, 2]) {
        NAV_MOVES.push({ shipIndex: si, delta });
    }
}

// ==================== 大领航员双船移动表 ====================

interface NavDualMove {
    ship1Index: number;  // 0-2
    delta1: number;      // -1 or +1
    ship2Index: number;  // 0-2, != ship1Index
    delta2: number;      // -1 or +1
}

const NAV_DUAL_MOVES: NavDualMove[] = [];
// 3 pairs × 4 combos = 12
for (const [s1, s2] of [[0, 1], [0, 2], [1, 2]]) {
    for (const d1 of [-1, 1]) {
        for (const d2 of [-1, 1]) {
            NAV_DUAL_MOVES.push({ ship1Index: s1, delta1: d1, ship2Index: s2, delta2: d2 });
        }
    }
}

// ==================== 核心映射函数 ====================

/**
 * 将引擎 Action 对象 → 整数 ID
 */
export function actionToId(action: Action, state: GameState): number {
    switch (action.type) {
        case 'PASS_AUCTION':
            return ID_PASS_AUCTION;

        case 'BID': {
            const amount = action.data.amount as number;
            if (amount < 1 || amount > 99) {
                throw new Error(`BID amount ${amount} out of range 1-99`);
            }
            return ID_BID_START + amount - 1;
        }

        case 'SKIP_BUY_STOCK':
            return ID_SKIP_BUY_STOCK;

        case 'BUY_STOCK': {
            const cargo = action.data.cargo as CargoType;
            return ID_BUY_STOCK_START + CARGO_INDEX[cargo];
        }

        case 'SELECT_INVESTMENT': {
            const slotId = action.data.slotId as string;
            const idx = SLOT_TO_INDEX.get(slotId);
            if (idx === undefined) {
                throw new Error(`Unknown investment slot: ${slotId}`);
            }
            return ID_INVESTMENT_START + idx;
        }

        case 'SKIP_NAVIGATOR':
            return ID_SKIP_NAVIGATOR;

        case 'USE_NAVIGATOR': {
            const moves = action.data.moves as Array<{ cargo: CargoType, delta: number }> | undefined;
            if (moves && moves.length === 2) {
                // 双船移动
                const s1 = state.ships.findIndex(s => s.cargo === moves[0].cargo);
                const s2 = state.ships.findIndex(s => s.cargo === moves[1].cargo);
                const dualIdx = NAV_DUAL_MOVES.findIndex(
                    m => m.ship1Index === s1 && m.delta1 === moves[0].delta
                        && m.ship2Index === s2 && m.delta2 === moves[1].delta
                );
                if (dualIdx === -1) throw new Error(`Nav dual move not in table`);
                return ID_NAV_DUAL_START + dualIdx;
            }
            // 单船移动
            const cargo = (moves ? moves[0].cargo : action.data.cargo) as CargoType;
            const delta = (moves ? moves[0].delta : action.data.delta) as number;
            const shipIndex = state.ships.findIndex(s => s.cargo === cargo);
            if (shipIndex === -1) throw new Error(`Ship ${cargo} not found`);
            const moveIdx = NAV_MOVES.findIndex(
                m => m.shipIndex === shipIndex && m.delta === delta
            );
            if (moveIdx === -1) {
                throw new Error(`Nav move (ship=${shipIndex}, delta=${delta}) not in table`);
            }
            return ID_NAVIGATOR_START + moveIdx;
        }

        case 'MORTGAGE_STOCK': {
            const cargo = action.data.cargo as CargoType;
            return ID_MORTGAGE_START + CARGO_INDEX[cargo];
        }

        case 'ROLL_DICE':
            return ID_ROLL_DICE;

        case 'PLACE_SHIPS': {
            const cargos = action.data.cargos as CargoType[];
            const positions = action.data.positions as Record<string, number>;
            const comboIdx = findPlacementComboIndex(cargos, positions);
            if (comboIdx === -1) {
                throw new Error(`Placement combo not found: ${JSON.stringify(action.data)}`);
            }
            return ID_PLACEMENT_START + comboIdx;
        }

        case 'PIRATE_PASS':
            return ID_PIRATE_PASS;

        case 'SKIP_INVEST':
            return ID_SKIP_INVEST;

        case 'PIRATE_BOARD': {
            const cargo = action.data.cargo as CargoType;
            const shipIdx = state.ships.findIndex(s => s.cargo === cargo);
            if (shipIdx === -1) throw new Error(`Ship ${cargo} not found for PIRATE_BOARD`);
            return ID_PIRATE_BOARD_START + shipIdx;
        }

        case 'PIRATE_KICK': {
            const cargo = action.data.cargo as CargoType;
            const targetId = action.data.kickPlayerId as string;
            const shipIdx = state.ships.findIndex(s => s.cargo === cargo);
            if (shipIdx === -1) throw new Error(`Ship ${cargo} not found for PIRATE_KICK`);
            // 对手索引: 排除自己, 按 players 顺序取前 3 个对手
            const opponents = state.players.filter(p => p.id !== action.playerId);
            const oppIdx = opponents.findIndex(p => p.id === targetId);
            if (oppIdx === -1 || oppIdx >= 3) throw new Error(`Opponent ${targetId} not mapped`);
            return ID_PIRATE_KICK_START + shipIdx * 3 + oppIdx;
        }

        case 'PIRATE_HIJACK': {
            const choice = action.data.decision as string;
            return choice === 'dock' ? ID_PIRATE_HIJACK_DOCK : ID_PIRATE_HIJACK_SHIPYARD;
        }

        default:
            throw new Error(`Unsupported action type for encoding: ${action.type}`);
    }
}

/**
 * 将整数 ID → 引擎 Action 对象
 * 需要 validActions 来获取 playerId 等基础信息
 */
export function idToAction(
    id: number, state: GameState, validActions: Action[]
): Action {
    // Short-circuit: only one legal action (but NOT for PLACE_SHIPS which
    // needs combo expansion from its single placeholder)
    if (validActions.length === 1 && validActions[0].type !== 'PLACE_SHIPS') {
        return validActions[0];
    }

    if (id === ID_PASS_AUCTION) {
        return findAction(validActions, 'PASS_AUCTION');
    }

    if (id >= ID_BID_START && id <= ID_BID_END) {
        const amount = id - ID_BID_START + 1;
        const bidAction = validActions.find(a => a.type === 'BID');
        if (!bidAction) throw new Error('No BID action available');
        return { ...bidAction, data: { ...bidAction.data, amount } };
    }

    if (id === ID_SKIP_BUY_STOCK) {
        return findAction(validActions, 'SKIP_BUY_STOCK');
    }

    if (id >= ID_BUY_STOCK_START && id <= ID_BUY_STOCK_END) {
        const cargo = INDEX_CARGO[id - ID_BUY_STOCK_START];
        return findAction(validActions, 'BUY_STOCK', a => a.data.cargo === cargo);
    }

    if (id >= ID_INVESTMENT_START && id <= ID_INVESTMENT_END) {
        const slotId = ALL_INVESTMENT_SLOTS[id - ID_INVESTMENT_START];
        return findAction(validActions, 'SELECT_INVESTMENT', a => a.data.slotId === slotId);
    }

    if (id === ID_SKIP_NAVIGATOR) {
        return findAction(validActions, 'SKIP_NAVIGATOR');
    }

    if (id >= ID_NAVIGATOR_START && id <= ID_NAVIGATOR_END) {
        const move = NAV_MOVES[id - ID_NAVIGATOR_START];
        const ship = state.ships[move.shipIndex];
        if (!ship) throw new Error(`Ship index ${move.shipIndex} out of range`);
        return findAction(validActions, 'USE_NAVIGATOR',
            a => {
                const moves = a.data.moves as Array<{ cargo: CargoType, delta: number }> | undefined;
                if (moves && moves.length === 1) {
                    return moves[0].cargo === ship.cargo && moves[0].delta === move.delta;
                }
                return a.data.cargo === ship.cargo && a.data.delta === move.delta;
            }
        );
    }

    if (id >= ID_NAV_DUAL_START && id <= ID_NAV_DUAL_END) {
        const dm = NAV_DUAL_MOVES[id - ID_NAV_DUAL_START];
        const ship1 = state.ships[dm.ship1Index];
        const ship2 = state.ships[dm.ship2Index];
        if (!ship1 || !ship2) throw new Error(`Ship index out of range for dual nav`);
        return findAction(validActions, 'USE_NAVIGATOR',
            a => {
                const moves = a.data.moves as Array<{ cargo: CargoType, delta: number }> | undefined;
                if (!moves || moves.length !== 2) return false;
                return moves[0].cargo === ship1.cargo && moves[0].delta === dm.delta1
                    && moves[1].cargo === ship2.cargo && moves[1].delta === dm.delta2;
            }
        );
    }

    if (id >= ID_MORTGAGE_START && id <= ID_MORTGAGE_END) {
        const cargo = INDEX_CARGO[id - ID_MORTGAGE_START];
        return findAction(validActions, 'MORTGAGE_STOCK', a => a.data.cargo === cargo);
    }

    if (id === ID_ROLL_DICE) {
        return findAction(validActions, 'ROLL_DICE');
    }

    if (id >= ID_PLACEMENT_START && id <= ID_PLACEMENT_END) {
        const combo = PLACEMENT_COMBOS[id - ID_PLACEMENT_START];
        const baseAction = validActions.find(a => a.type === 'PLACE_SHIPS');
        if (!baseAction) throw new Error('No PLACE_SHIPS action available');
        return {
            ...baseAction,
            data: {
                cargos: combo.cargos,
                positions: { ...combo.positions },
            },
        };
    }

    // --- 海盗动作 ---
    if (id === ID_PIRATE_PASS) {
        return findAction(validActions, 'PIRATE_PASS');
    }

    if (id === ID_SKIP_INVEST) {
        return findAction(validActions, 'SKIP_INVEST');
    }

    if (id >= ID_PIRATE_BOARD_START && id <= ID_PIRATE_BOARD_END) {
        const shipIdx = id - ID_PIRATE_BOARD_START;
        const ship = state.ships[shipIdx];
        if (!ship) throw new Error(`Ship index ${shipIdx} out of range for PIRATE_BOARD`);
        return findAction(validActions, 'PIRATE_BOARD', a => a.data.cargo === ship.cargo);
    }

    if (id >= ID_PIRATE_KICK_START && id <= ID_PIRATE_KICK_END) {
        const offset = id - ID_PIRATE_KICK_START;
        const shipIdx = Math.floor(offset / 3);
        const oppIdx = offset % 3;
        const ship = state.ships[shipIdx];
        if (!ship) throw new Error(`Ship index ${shipIdx} out of range for PIRATE_KICK`);
        const myId = validActions[0]?.playerId ?? 'p0';
        const opponents = state.players.filter(p => p.id !== myId);
        if (oppIdx >= opponents.length) throw new Error(`Opponent index ${oppIdx} out of range`);
        return findAction(validActions, 'PIRATE_KICK',
            a => a.data.cargo === ship.cargo && a.data.kickPlayerId === opponents[oppIdx].id
        );
    }

    if (id === ID_PIRATE_HIJACK_DOCK) {
        return findAction(validActions, 'PIRATE_HIJACK', a => a.data.decision === 'dock');
    }

    if (id === ID_PIRATE_HIJACK_SHIPYARD) {
        return findAction(validActions, 'PIRATE_HIJACK', a => a.data.decision === 'shipyard');
    }

    throw new Error(`Unknown action ID: ${id}`);
}

/**
 * 将 validActions 转为 ACTION_DIM 维 0/1 掩码
 */
export function buildActionMask(
    validActions: Action[], state: GameState
): Int8Array {
    const mask = new Int8Array(ACTION_DIM);

    for (const action of validActions) {
        switch (action.type) {
            case 'PASS_AUCTION':
                mask[ID_PASS_AUCTION] = 1;
                break;

            case 'BID': {
                const minBid = (action.data.minBid as number) ?? 1;
                const maxBid = Math.min((action.data.maxBid as number) ?? 99, 99);
                for (let amount = minBid; amount <= maxBid; amount++) {
                    mask[ID_BID_START + amount - 1] = 1;
                }
                break;
            }

            case 'SKIP_BUY_STOCK':
                mask[ID_SKIP_BUY_STOCK] = 1;
                break;

            case 'BUY_STOCK': {
                const cargo = action.data.cargo as CargoType;
                mask[ID_BUY_STOCK_START + CARGO_INDEX[cargo]] = 1;
                break;
            }

            case 'SELECT_INVESTMENT': {
                const slotId = action.data.slotId as string;
                const idx = SLOT_TO_INDEX.get(slotId);
                if (idx !== undefined) {
                    mask[ID_INVESTMENT_START + idx] = 1;
                }
                break;
            }

            case 'SKIP_NAVIGATOR':
                mask[ID_SKIP_NAVIGATOR] = 1;
                break;

            case 'USE_NAVIGATOR': {
                const moves = action.data.moves as Array<{ cargo: CargoType, delta: number }> | undefined;
                if (moves && moves.length === 2) {
                    // 双船移动
                    const s1 = state.ships.findIndex(s => s.cargo === moves[0].cargo);
                    const s2 = state.ships.findIndex(s => s.cargo === moves[1].cargo);
                    const dualIdx = NAV_DUAL_MOVES.findIndex(
                        m => m.ship1Index === s1 && m.delta1 === moves[0].delta
                            && m.ship2Index === s2 && m.delta2 === moves[1].delta
                    );
                    if (dualIdx !== -1) {
                        mask[ID_NAV_DUAL_START + dualIdx] = 1;
                    }
                } else {
                    // 单船移动
                    const cargo = (moves ? moves[0].cargo : action.data.cargo) as CargoType;
                    const delta = (moves ? moves[0].delta : action.data.delta) as number;
                    const shipIndex = state.ships.findIndex(s => s.cargo === cargo);
                    if (shipIndex !== -1) {
                        const moveIdx = NAV_MOVES.findIndex(
                            m => m.shipIndex === shipIndex && m.delta === delta
                        );
                        if (moveIdx !== -1) {
                            mask[ID_NAVIGATOR_START + moveIdx] = 1;
                        }
                    }
                }
                break;
            }

            case 'MORTGAGE_STOCK': {
                const cargo = action.data.cargo as CargoType;
                mask[ID_MORTGAGE_START + CARGO_INDEX[cargo]] = 1;
                break;
            }

            case 'ROLL_DICE':
                mask[ID_ROLL_DICE] = 1;
                break;

            case 'PLACE_SHIPS':
                // PLACE_SHIPS 引擎给出一个占位 Action，全部合法组合 mask 置 1
                for (let i = 0; i < PLACEMENT_COUNT; i++) {
                    mask[ID_PLACEMENT_START + i] = 1;
                }
                break;

            case 'PIRATE_PASS':
                mask[ID_PIRATE_PASS] = 1;
                break;

            case 'SKIP_INVEST':
                mask[ID_SKIP_INVEST] = 1;
                break;

            case 'PIRATE_BOARD': {
                const cargo = action.data.cargo as CargoType;
                const shipIdx = state.ships.findIndex(s => s.cargo === cargo);
                if (shipIdx !== -1) {
                    mask[ID_PIRATE_BOARD_START + shipIdx] = 1;
                }
                break;
            }

            case 'PIRATE_KICK': {
                const cargo = action.data.cargo as CargoType;
                const targetId = action.data.kickPlayerId as string;
                const shipIdx = state.ships.findIndex(s => s.cargo === cargo);
                if (shipIdx !== -1) {
                    const opponents = state.players.filter(p => p.id !== action.playerId);
                    const oppIdx = opponents.findIndex(p => p.id === targetId);
                    if (oppIdx !== -1 && oppIdx < 3) {
                        mask[ID_PIRATE_KICK_START + shipIdx * 3 + oppIdx] = 1;
                    }
                }
                break;
            }

            case 'PIRATE_HIJACK': {
                const choice = action.data.decision as string;
                if (choice === 'dock') mask[ID_PIRATE_HIJACK_DOCK] = 1;
                else mask[ID_PIRATE_HIJACK_SHIPYARD] = 1;
                break;
            }

            default:
                break;
        }
    }

    return mask;
}

// ==================== 辅助函数 ====================

function findAction(
    validActions: Action[],
    type: string,
    predicate?: (a: Action) => boolean,
): Action {
    const found = validActions.find(
        a => a.type === type && (!predicate || predicate(a))
    );
    if (!found) {
        throw new Error(`Action type '${type}' not found in valid actions`);
    }
    return found;
}

function findPlacementComboIndex(
    cargos: CargoType[],
    positions: Record<string, number>,
): number {
    const excluded = ALL_CARGO.find(c => !cargos.includes(c));
    return PLACEMENT_COMBOS.findIndex(combo => {
        if (combo.excludedCargo !== excluded) return false;
        for (const c of combo.cargos) {
            if ((positions[c] ?? -1) !== (combo.positions[c] ?? -2)) return false;
        }
        return true;
    });
}

// ==================== 导出 ID 范围（调试/测试用） ====================

export const ACTION_RANGES = {
    PASS_AUCTION: ID_PASS_AUCTION,
    BID: [ID_BID_START, ID_BID_END],
    SKIP_BUY_STOCK: ID_SKIP_BUY_STOCK,
    BUY_STOCK: [ID_BUY_STOCK_START, ID_BUY_STOCK_END],
    INVESTMENT: [ID_INVESTMENT_START, ID_INVESTMENT_END],
    SKIP_NAVIGATOR: ID_SKIP_NAVIGATOR,
    NAVIGATOR: [ID_NAVIGATOR_START, ID_NAVIGATOR_END],
    NAVIGATOR_DUAL: [ID_NAV_DUAL_START, ID_NAV_DUAL_END],
    MORTGAGE: [ID_MORTGAGE_START, ID_MORTGAGE_END],
    ROLL_DICE: ID_ROLL_DICE,
    PLACEMENT: [ID_PLACEMENT_START, ID_PLACEMENT_END],
    PIRATE_PASS: ID_PIRATE_PASS,
    PIRATE_BOARD: [ID_PIRATE_BOARD_START, ID_PIRATE_BOARD_END],
    PIRATE_KICK: [ID_PIRATE_KICK_START, ID_PIRATE_KICK_END],
    PIRATE_HIJACK_DOCK: ID_PIRATE_HIJACK_DOCK,
    PIRATE_HIJACK_SHIPYARD: ID_PIRATE_HIJACK_SHIPYARD,
    SKIP_INVEST: ID_SKIP_INVEST,
} as const;
