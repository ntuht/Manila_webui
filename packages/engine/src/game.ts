/**
 * Manila 游戏引擎 — 纯函数式
 *
 * 核心 API:
 *   createGame(config, rng)      → GameState
 *   applyAction(state, action)   → GameState
 *   getValidActions(state)       → Action[]   (由 pendingAction 预计算)
 *
 * 设计原则:
 *   - 每个函数返回新状态，不修改输入
 *   - pendingAction 始终指向下一步需要谁做什么
 *   - RNG 可注入，支持确定性测试
 */

import type {
    GameState, GameConfig, Action, PlayerState, ShipState,
    StockHolding, CargoType, AuctionState, PendingAction,
    Investment, RNG, DiceResult, GameResult, PlayerRanking,
    RoundStep, LogEntry,
} from './types.js';

import {
    SHIPS, ALL_CARGO, INITIAL_CASH, INITIAL_STOCKS,
    SHIP_DOCK_POSITION, SHIP_PLACEMENT_TOTAL, PIRATE_TRIGGER_POSITION,
    STOCK_MIN_BUY_PRICE, STOCK_MORTGAGE_VALUE, STOCK_REDEEM_COST,
    STOCK_MAX_PER_CARGO,
    STOCK_PRICE_INCREASE, STOCK_END_PRICE, getNextStockPrice,
    HARBOR_OFFICES, SHIPYARD_OFFICES,
    NAVIGATOR_BIG_COST, NAVIGATOR_SMALL_COST,
    INSURANCE_REWARD, INSURANCE_PENALTIES,
    ROUND_STEPS_3P, ROUND_STEPS_4P,
    getInvestmentCost, getCrewRewardPerSeat,
    NAVIGATOR_BIG_MOVE, NAVIGATOR_SMALL_MOVE,
} from './rules.js';

import { rollDice, defaultRNG } from './dice.js';

// ==================== 深拷贝工具 ====================

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/** Push a system event log entry (not a player action) */
function logEvent(s: GameState, message: string, data?: Record<string, unknown>) {
    s.log.push({
        round: s.round,
        phase: s.phase,
        playerId: 'SYSTEM',
        action: 'EVENT',
        detail: JSON.stringify({ message, ...data }),
        timestamp: Date.now(),
    });
}

// ==================== 创建游戏 ====================

export function createGame(config: GameConfig, rng: RNG = defaultRNG): GameState {
    const players = createPlayers(config, rng);
    const ships: ShipState[] = [];  // 港务长选定后才创建
    const roundSteps = config.playerCount === 3 ? ROUND_STEPS_3P : ROUND_STEPS_4P;

    const state: GameState = {
        config,
        round: 1,
        phase: 'AUCTION',
        players,
        currentPlayerIndex: 0,
        ships,
        stockPrices: { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 },
        investments: [],
        roundSteps: deepClone(roundSteps),
        currentStepIndex: 0,
        investTurnIndex: 0,
        diceHistory: [],
        currentRollIndex: 0,
        navigatorsUsed: [],
        investSkippedPlayers: [],
        pendingAction: null,
        pirateDecisions: {},
        pirateBoardedSlots: [],
        stockPurchaseHistory: {},
        playerShipPlacements: {},
        log: [],
    };

    // 设置第一个待执行动作：拍卖
    return initAuction(state);
}

function createPlayers(config: GameConfig, rng: RNG): PlayerState[] {
    const players: PlayerState[] = [];

    // 创建股票池并随机分配
    const stockPool = createStockPool();
    shuffleArray(stockPool, rng);

    for (let i = 0; i < config.playerCount; i++) {
        const stocks: StockHolding[] = [];
        // 每人抽 2 张股票
        for (let j = 0; j < INITIAL_STOCKS; j++) {
            const cargo = stockPool.pop()!;
            const existing = stocks.find(s => s.cargo === cargo);
            if (existing) {
                existing.quantity++;
            } else {
                stocks.push({ cargo, quantity: 1, mortgaged: 0 });
            }
        }

        players.push({
            id: `p${i}`,
            name: config.playerNames?.[i] ?? (i === 0 ? '你' : `AI-${i}`),
            cash: INITIAL_CASH,
            stocks,
            isAI: i !== 0,
        });
    }

    return players;
}

function createStockPool(): CargoType[] {
    // 每种货物若干张股票
    const pool: CargoType[] = [];
    for (const cargo of ALL_CARGO) {
        for (let i = 0; i < 5; i++) {
            pool.push(cargo);
        }
    }
    return pool;
}

function shuffleArray<T>(arr: T[], rng: RNG): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = rng.nextInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// ==================== 核心：应用动作 ====================

export function applyAction(state: GameState, action: Action, rng: RNG = defaultRNG): GameState {
    const s = deepClone(state);

    // 验证动作合法性
    if (!s.pendingAction) {
        throw new Error('没有待执行的动作');
    }
    if (action.playerId !== s.pendingAction.playerId) {
        throw new Error(`不是 ${action.playerId} 的回合，当前等待 ${s.pendingAction.playerId}`);
    }

    // 记录日志
    s.log.push({
        round: s.round,
        phase: s.phase,
        playerId: action.playerId,
        action: action.type,
        detail: JSON.stringify(action.data),
        timestamp: Date.now(),
    });

    switch (action.type) {
        case 'BID':
            return handleBid(s, action);
        case 'PASS_AUCTION':
            return handlePassAuction(s, action);
        case 'BUY_STOCK':
            return handleBuyStock(s, action);
        case 'SKIP_BUY_STOCK':
            return handleSkipBuyStock(s);
        case 'MORTGAGE_STOCK':
            return handleMortgageStock(s, action);
        case 'PLACE_SHIPS':
            return handlePlaceShips(s, action);
        case 'SELECT_INVESTMENT':
            return handleSelectInvestment(s, action);
        case 'SKIP_INVEST':
            return handleSkipInvest(s, action);
        case 'ROLL_DICE':
            return handleRollDice(s, rng);
        case 'USE_NAVIGATOR':
            return handleUseNavigator(s, action);
        case 'SKIP_NAVIGATOR':
            return handleSkipNavigator(s);
        case 'PIRATE_BOARD':
            return handlePirateBoard(s, action);
        case 'PIRATE_KICK':
            return handlePirateKick(s, action);
        case 'PIRATE_PASS':
            return handlePiratePass(s, action);
        case 'PIRATE_HIJACK':
            return handlePirateHijack(s, action);
        case 'ACKNOWLEDGE_SETTLE':
            return handleAcknowledgeSettle(s);
        default:
            throw new Error(`未知动作类型: ${action.type}`);
    }
}

// ==================== 拍卖阶段 ====================

function initAuction(state: GameState): GameState {
    const s = deepClone(state);
    s.phase = 'AUCTION';

    // 拍卖顺序：从 currentPlayerIndex 开始轮流
    const order: string[] = [];
    for (let i = 0; i < s.players.length; i++) {
        const idx = (s.currentPlayerIndex + i) % s.players.length;
        order.push(s.players[idx].id);
    }

    s.auctionState = {
        currentBidderId: order[0],
        highestBid: 0,
        highestBidderId: null,
        passedPlayerIds: [],
        biddingOrder: order,
    };

    s.pendingAction = buildAuctionPendingAction(s);
    return s;
}

function buildAuctionPendingAction(s: GameState): PendingAction {
    const auction = s.auctionState!;
    const player = s.players.find(p => p.id === auction.currentBidderId)!;
    const minBid = auction.highestBid + 1;
    const maxBid = player.cash + getTotalMortgageValue(player);

    const actions: Action[] = [];

    // 出价选项
    if (maxBid >= minBid) {
        actions.push({
            type: 'BID',
            playerId: player.id,
            data: { minBid, maxBid },
        });
    }

    // 放弃
    actions.push({
        type: 'PASS_AUCTION',
        playerId: player.id,
        data: {},
    });

    return {
        playerId: player.id,
        actionType: actions.length > 1 ? 'BID' : 'PASS_AUCTION',
        validActions: actions,
        message: `${player.name} 的竞拍回合 (当前最高: ${auction.highestBid})`,
    };
}

function handleBid(s: GameState, action: Action): GameState {
    const amount = action.data.amount as number;
    const player = findPlayer(s, action.playerId);
    const auction = s.auctionState!;

    if (amount <= auction.highestBid) {
        throw new Error(`出价 ${amount} 必须高于当前最高 ${auction.highestBid}`);
    }
    if (amount > player.cash + getTotalMortgageValue(player)) {
        throw new Error('资金不足（包含可抵押股票）');
    }

    auction.highestBid = amount;
    auction.highestBidderId = player.id;

    return advanceAuction(s);
}

function handlePassAuction(s: GameState, action: Action): GameState {
    const auction = s.auctionState!;
    auction.passedPlayerIds.push(action.playerId);

    return advanceAuction(s);
}

function advanceAuction(s: GameState): GameState {
    const auction = s.auctionState!;
    const activeBidders = auction.biddingOrder.filter(
        id => !auction.passedPlayerIds.includes(id)
    );

    // 只剩一人 — 拍卖结束
    if (activeBidders.length <= 1 && auction.highestBidderId) {
        return finishAuction(s, auction.highestBidderId, auction.highestBid);
    }

    // 所有人都放弃 — 第一个玩家免费成为港务长
    if (activeBidders.length === 0) {
        return finishAuction(s, auction.biddingOrder[0], 0);
    }

    // 轮到下一个未放弃的玩家
    const currentIdx = auction.biddingOrder.indexOf(auction.currentBidderId);
    let nextIdx = (currentIdx + 1) % auction.biddingOrder.length;
    while (auction.passedPlayerIds.includes(auction.biddingOrder[nextIdx])) {
        nextIdx = (nextIdx + 1) % auction.biddingOrder.length;
    }
    auction.currentBidderId = auction.biddingOrder[nextIdx];

    s.pendingAction = buildAuctionPendingAction(s);
    return s;
}

function finishAuction(s: GameState, winnerId: string, bidAmount: number): GameState {
    const winner = findPlayer(s, winnerId);

    logEvent(s, `🏆 ${winner.name} 以 ${bidAmount} 元赢得港务长拍卖`, { winnerId, bidAmount });

    // 规则 A: 竞拍获胜后, 若出价超过现金, 自动抵押股票补足差额
    const cashBefore = winner.cash;
    autoMortgageUntil(winner, bidAmount);
    if (winner.cash > cashBefore) {
        logEvent(s, `⚠️ ${winner.name} 现金不足，自动抵押股票补足差额 (+${winner.cash - cashBefore} 元)`);
    }
    winner.cash -= bidAmount;

    s.harborMasterId = winnerId;
    s.auctionState = undefined;

    // 港务长可以先购买股票
    return initHarborMasterBuyStock(s);
}

// ==================== 港务长阶段 ====================

function initHarborMasterBuyStock(s: GameState): GameState {
    s.phase = 'PLACEMENT';
    const masterId = s.harborMasterId!;
    const player = findPlayer(s, masterId);

    const actions: Action[] = [];

    // 可购买的股票选项
    for (const cargo of ALL_CARGO) {
        const price = Math.max(STOCK_MIN_BUY_PRICE, s.stockPrices[cargo]);
        // 检查库存: 所有玩家持有该货物股票总数 < 5
        const totalIssued = s.players.reduce((sum, p) => {
            const st = p.stocks.find(x => x.cargo === cargo);
            return sum + (st ? st.quantity : 0);
        }, 0);
        if (player.cash >= price && totalIssued < STOCK_MAX_PER_CARGO) {
            actions.push({
                type: 'BUY_STOCK',
                playerId: masterId,
                data: { cargo, price },
            });
        }
    }

    // 可以跳过
    actions.push({ type: 'SKIP_BUY_STOCK', playerId: masterId, data: {} });

    s.pendingAction = {
        playerId: masterId,
        actionType: 'BUY_STOCK',
        validActions: actions,
        message: `${player.name}（港务长）可购买一股股票`,
    };

    return s;
}

function handleBuyStock(s: GameState, action: Action): GameState {
    const cargo = action.data.cargo as CargoType;
    const player = findPlayer(s, action.playerId);
    const price = Math.max(STOCK_MIN_BUY_PRICE, s.stockPrices[cargo]);

    if (player.cash < price) throw new Error('资金不足');
    const totalIssued = s.players.reduce((sum, p) => {
        const st = p.stocks.find(x => x.cargo === cargo);
        return sum + (st ? st.quantity : 0);
    }, 0);
    if (totalIssued >= STOCK_MAX_PER_CARGO) throw new Error(`${cargo} 库存不足`);

    player.cash -= price;
    addStock(player, cargo);

    // 记录公开购买历史
    if (!s.stockPurchaseHistory[action.playerId]) {
        s.stockPurchaseHistory[action.playerId] = { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 };
    }
    s.stockPurchaseHistory[action.playerId][cargo]++;

    return initPlacement(s);
}

function handleSkipBuyStock(s: GameState): GameState {
    return initPlacement(s);
}

// ==================== 布置阶段 ====================

function initPlacement(s: GameState): GameState {
    const masterId = s.harborMasterId!;
    const player = findPlayer(s, masterId);

    s.pendingAction = {
        playerId: masterId,
        actionType: 'PLACE_SHIPS',
        validActions: [{
            type: 'PLACE_SHIPS',
            playerId: masterId,
            data: { hint: '选择 3 种货物并设置位置，总和 = 9' },
        }],
        message: `${player.name}（港务长）布置船只位置`,
    };

    return s;
}

function handlePlaceShips(s: GameState, action: Action): GameState {
    const cargos = action.data.cargos as CargoType[];
    const positions = action.data.positions as Record<CargoType, number>;

    if (cargos.length !== 3) throw new Error('必须选择 3 种货物');

    const total = cargos.reduce((sum, c) => sum + (positions[c] ?? 0), 0);
    if (total !== SHIP_PLACEMENT_TOTAL) {
        throw new Error(`船只位置总和必须为 ${SHIP_PLACEMENT_TOTAL}，当前 ${total}`);
    }

    for (const c of cargos) {
        const pos = positions[c];
        if (pos < 0 || pos > 5) throw new Error(`${c} 的位置 ${pos} 超出 0-5 范围`);
    }

    // 创建 3 艘船
    s.ships = cargos.map(cargo => ({
        cargo,
        position: positions[cargo],
        crew: [],
    }));

    // 记录港务长的排船画像 (跨轮保留)
    const hmId = s.harborMasterId!;
    s.playerShipPlacements[hmId] = { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 };
    for (const cargo of cargos) {
        s.playerShipPlacements[hmId][cargo] = positions[cargo];
    }

    // 进入投资/掷骰交替阶段
    s.currentStepIndex = 0;
    s.investTurnIndex = 0;
    return advanceRoundStep(s);
}

// ==================== 投资/掷骰交替 ====================

function advanceRoundStep(s: GameState): GameState {
    if (s.currentStepIndex >= s.roundSteps.length) {
        // 所有步骤完成 → 检查海盗劫持, 然后结算
        const hijackState = checkPirateHijackDecision(s);
        if (hijackState) return hijackState;
        return doSettlement(s);
    }

    const step = s.roundSteps[s.currentStepIndex];

    if (step.type === 'INVEST') {
        return initInvestTurn(s);
    } else {
        // DICE — 掷骰前检查领航员 (仅在最后一次掷骰前)
        return initDiceRoll(s);
    }
}

function initInvestTurn(s: GameState): GameState {
    s.phase = 'INVEST';

    // 投资顺序：从港务长开始
    const masterIdx = s.players.findIndex(p => p.id === s.harborMasterId);
    const order: string[] = [];
    for (let i = 0; i < s.players.length; i++) {
        order.push(s.players[(masterIdx + i) % s.players.length].id);
    }

    // 跳过没有合法投资选项的玩家
    while (s.investTurnIndex < order.length) {
        const playerId = order[s.investTurnIndex];
        const player = findPlayer(s, playerId);

        // Auto-skip players who chose to skip this round
        if (s.investSkippedPlayers.includes(playerId)) {
            s.investTurnIndex++;
            continue;
        }

        const validActions = buildInvestActions(s, player);

        if (validActions.length > 0) {
            s.pendingAction = {
                playerId,
                actionType: 'SELECT_INVESTMENT',
                validActions,
                message: `${player.name} 选择投资 (第 ${s.currentStepIndex + 1} 轮)`,
            };
            return s;
        }

        // 该玩家无合法选项，自动跳过
        s.investTurnIndex++;
    }

    // 这一轮投资的所有玩家都行动完了（或都跳过了）
    s.investTurnIndex = 0;
    s.currentStepIndex++;
    return advanceRoundStep(s);
}

function buildInvestActions(s: GameState, player: PlayerState): Action[] {
    const takenSlots = s.investments.map(inv => inv.slotId);

    // ── 1. 收集所有可用的非保险槽位及其正常成本 ──
    const availableSlots: { slotId: string; cost: number }[] = [];

    // 船员位 — 严格顺序
    for (const ship of s.ships) {
        const config = SHIPS[ship.cargo];
        for (let seatIdx = 0; seatIdx < config.seats; seatIdx++) {
            const slotId = `crew-${ship.cargo}-${seatIdx}`;
            if (takenSlots.includes(slotId)) continue;
            availableSlots.push({ slotId, cost: config.costs[seatIdx] });
            break; // 只允许下一个顺序座位
        }
    }

    // 港口办事处
    for (const office of HARBOR_OFFICES) {
        if (!takenSlots.includes(office.id)) {
            availableSlots.push({ slotId: office.id, cost: office.cost });
        }
    }

    // 修船厂办事处
    for (const office of SHIPYARD_OFFICES) {
        if (!takenSlots.includes(office.id)) {
            availableSlots.push({ slotId: office.id, cost: office.cost });
        }
    }

    // 海盗 — 严格顺序: 必须先有船长, 才能招募船员
    if (!takenSlots.includes('pirate-captain')) {
        availableSlots.push({ slotId: 'pirate-captain', cost: 5 });
    } else if (!takenSlots.includes('pirate-crew')) {
        availableSlots.push({ slotId: 'pirate-crew', cost: 5 });
    }

    // 领航员
    if (!takenSlots.includes('navigator-big')) {
        availableSlots.push({ slotId: 'navigator-big', cost: NAVIGATOR_BIG_COST });
    }
    if (!takenSlots.includes('navigator-small')) {
        availableSlots.push({ slotId: 'navigator-small', cost: NAVIGATOR_SMALL_COST });
    }

    // ── 2. 破产规则: 现金不足以买最便宜的槽位, 且无可抵押股票 → 所有位免费 ──
    const canMortgage = ALL_CARGO.some(cargo => {
        const stock = player.stocks.find(st => st.cargo === cargo);
        return stock && stock.quantity - stock.mortgaged > 0;
    });
    const minSlotCost = availableSlots.length > 0
        ? Math.min(...availableSlots.map(s => s.cost))
        : Infinity;
    const isBankrupt = player.cash < minSlotCost && !canMortgage;

    // ── 3. 构建动作列表 ──
    const actions: Action[] = [];

    if (isBankrupt) {
        // 破产: 所有位免费开放
        for (const slot of availableSlots) {
            actions.push({
                type: 'SELECT_INVESTMENT',
                playerId: player.id,
                data: { slotId: slot.slotId, cost: 0 },
            });
        }
    } else {
        // 正常模式: 玩家只看到能负担的投资位
        for (const slot of availableSlots) {
            if (player.cash >= slot.cost) {
                actions.push({
                    type: 'SELECT_INVESTMENT',
                    playerId: player.id,
                    data: { slotId: slot.slotId, cost: slot.cost },
                });
            }
        }
    }

    // 保险（独立处理，总是免费，1 席）
    if (!takenSlots.includes('insurance')) {
        actions.push({
            type: 'SELECT_INVESTMENT',
            playerId: player.id,
            data: { slotId: 'insurance', cost: 0 },
        });
    }

    // 抵押股票选项（手动抵押获得 12 现金）— 仅非破产时
    if (!isBankrupt) {
        for (const cargo of ALL_CARGO) {
            const stock = player.stocks.find(st => st.cargo === cargo);
            if (stock && stock.quantity - stock.mortgaged > 0) {
                actions.push({
                    type: 'MORTGAGE_STOCK',
                    playerId: player.id,
                    data: { cargo },
                });
            }
        }
    }

    // 跳过投资选项（一旦跳过，本轮剩余投资轮次全部自动跳过）
    actions.push({
        type: 'SKIP_INVEST',
        playerId: player.id,
        data: {},
    });

    return actions;
}

function handleSelectInvestment(s: GameState, action: Action): GameState {
    const slotId = action.data.slotId as string;
    const cost = action.data.cost as number;
    const player = findPlayer(s, action.playerId);

    // Safety: cost must be a valid number
    if (typeof cost !== 'number' || isNaN(cost)) {
        throw new Error(`Invalid cost for slot ${slotId}: ${cost}`);
    }

    // 验证
    if (s.investments.some(inv => inv.slotId === slotId)) {
        throw new Error(`槽位 ${slotId} 已被占用`);
    }
    if (player.cash < cost) throw new Error('资金不足');

    // 扣费
    player.cash -= cost;

    // 破产免费投资时，清零残余现金
    if (cost === 0 && slotId !== 'insurance') {
        player.cash = 0;
    }

    // 记录投资
    const investmentType = getInvestmentTypeFromSlot(slotId);
    s.investments.push({
        type: investmentType,
        slotId,
        playerId: player.id,
        cost,
        reward: 0,
    });

    // 如果是保险，立即获得 10 现金
    if (slotId === 'insurance') {
        player.cash += INSURANCE_REWARD;
    }

    // 如果是船员，记录到船只
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1] as CargoType;
        const seatIdx = parseInt(parts[2]);
        const ship = s.ships.find(sh => sh.cargo === cargo);
        if (ship) {
            ship.crew.push({
                playerId: player.id,
                seatIndex: seatIdx,
                cost,
            });
        }
    }

    // 推进到下一个玩家
    s.investTurnIndex++;
    return advanceRoundStep(s);
}

function handleSkipInvest(s: GameState, action: Action): GameState {
    s.log.push({
        round: s.round,
        phase: s.phase,
        playerId: action.playerId,
        action: 'SKIP_INVEST',
        detail: `${findPlayer(s, action.playerId).name} 跳过投资（本轮后续投资将自动跳过）`,
        timestamp: Date.now(),
    });

    // Mark this player as skipped — they auto-skip all future invest turns this round
    if (!s.investSkippedPlayers.includes(action.playerId)) {
        s.investSkippedPlayers.push(action.playerId);
    }

    // Advance to next player
    s.investTurnIndex++;
    return initInvestTurn(s);
}

function getInvestmentTypeFromSlot(slotId: string): Investment['type'] {
    if (slotId.startsWith('crew-')) return 'CREW';
    if (slotId.startsWith('harbor-')) return 'HARBOR_OFFICE';
    if (slotId.startsWith('shipyard-')) return 'SHIPYARD_OFFICE';
    if (slotId.startsWith('pirate-')) return 'PIRATE';
    if (slotId.startsWith('navigator-')) return 'NAVIGATOR';
    if (slotId === 'insurance') return 'INSURANCE';
    throw new Error(`未知槽位: ${slotId}`);
}

// ==================== 掷骰阶段 ====================

function initDiceRoll(s: GameState): GameState {
    s.phase = 'SAIL';

    // 检查是否是最后一次掷骰且有领航员
    const isLastRoll = s.currentStepIndex === s.roundSteps.length - 1 ||
        (s.currentStepIndex < s.roundSteps.length - 1 &&
            s.roundSteps.slice(s.currentStepIndex + 1).every(step => step.type !== 'DICE'));

    if (isLastRoll) {
        // 清空本次掷骰已决策的领航员记录
        s.navigatorsUsed = [];
        // 小领航员先行动，再大领航员
        const navInvestment = findNextNavigator(s);
        if (navInvestment) {
            s.navigatorsUsed.push(navInvestment.slotId);
            return initNavigatorUse(s, navInvestment);
        }
    }

    // 由港务长掷骰
    const masterId = s.harborMasterId!;
    const player = findPlayer(s, masterId);

    s.pendingAction = {
        playerId: masterId,
        actionType: 'ROLL_DICE',
        validActions: [{
            type: 'ROLL_DICE',
            playerId: masterId,
            data: {},
        }],
        message: `${player.name} 掷骰子 (第 ${s.currentRollIndex + 1} 次)`,
    };

    return s;
}

function handleRollDice(s: GameState, rng: RNG): GameState {
    const result = rollDice(rng, s.round, s.currentRollIndex);
    s.diceHistory.push(result);

    // 移动船只：港务长分配 3 个骰子给 3 艘船
    // 简化：按顺序分配
    const movements: string[] = [];
    for (let i = 0; i < s.ships.length; i++) {
        const oldPos = s.ships[i].position;
        s.ships[i].position += result.values[i];
        movements.push(`${s.ships[i].cargo}: ${oldPos}→${s.ships[i].position}(+${result.values[i]})`);
    }

    s.currentRollIndex++;

    // 检查到港: >=14 即到港 (=13 是海盗区, 不自动到港)
    for (const ship of s.ships) {
        if (ship.position >= SHIP_DOCK_POSITION) {
            ship.position = SHIP_DOCK_POSITION;
        }
    }

    logEvent(s, `🎲 第${s.currentRollIndex}次掷骰 [${result.values.join(', ')}] — ${movements.join(' | ')}`);

    // ── 海盗上船: 第2次掷骰后, 船只=13 且有海盗 → 触发上船选择 ──
    if (s.currentRollIndex === 2) {
        const pirateCheck = checkPirateBoarding(s);
        if (pirateCheck) return pirateCheck;
    }

    // 推进到下一步
    s.currentStepIndex++;
    s.investTurnIndex = 0;
    return advanceRoundStep(s);
}

// ==================== 领航员 ====================

/**
 * 查找下一个需要决策的领航员, 按规则: 小领航员先行动, 然后大领航员
 */
function findNextNavigator(s: GameState): Investment | undefined {
    const navOrder = ['navigator-small', 'navigator-big'] as const;
    for (const slotId of navOrder) {
        const inv = s.investments.find(
            i => i.slotId === slotId && !s.navigatorsUsed.includes(i.slotId)
        );
        if (inv) return inv;
    }
    return undefined;
}

function initNavigatorUse(s: GameState, navInvestment: Investment): GameState {
    const player = findPlayer(s, navInvestment.playerId);
    const isBig = navInvestment.slotId === 'navigator-big';
    const maxMove = isBig ? NAVIGATOR_BIG_MOVE : NAVIGATOR_SMALL_MOVE;

    const actions: Action[] = [];
    const movableShips = s.ships.filter(ship => ship.position < SHIP_DOCK_POSITION);

    // 单船移动: ±1 (小/大领航员) 和 ±2 (仅大领航员)
    for (const ship of movableShips) {
        for (let delta = -maxMove; delta <= maxMove; delta++) {
            if (delta === 0) continue;
            const newPos = ship.position + delta;
            if (newPos < 0 || newPos > SHIP_DOCK_POSITION) continue;
            actions.push({
                type: 'USE_NAVIGATOR',
                playerId: navInvestment.playerId,
                data: { cargo: ship.cargo, delta, moves: [{ cargo: ship.cargo, delta }] },
            });
        }
    }

    // 双船分配: 仅大领航员, 每船 ±1 (总计 2 点)
    if (isBig && movableShips.length >= 2) {
        for (let i = 0; i < movableShips.length; i++) {
            for (let j = i + 1; j < movableShips.length; j++) {
                const ship1 = movableShips[i];
                const ship2 = movableShips[j];
                for (const d1 of [-1, 1]) {
                    for (const d2 of [-1, 1]) {
                        const newPos1 = ship1.position + d1;
                        const newPos2 = ship2.position + d2;
                        if (newPos1 < 0 || newPos1 > SHIP_DOCK_POSITION) continue;
                        if (newPos2 < 0 || newPos2 > SHIP_DOCK_POSITION) continue;
                        actions.push({
                            type: 'USE_NAVIGATOR',
                            playerId: navInvestment.playerId,
                            data: {
                                moves: [
                                    { cargo: ship1.cargo, delta: d1 },
                                    { cargo: ship2.cargo, delta: d2 },
                                ],
                            },
                        });
                    }
                }
            }
        }
    }

    // 可以跳过
    actions.push({
        type: 'SKIP_NAVIGATOR',
        playerId: navInvestment.playerId,
        data: {},
    });

    s.pendingAction = {
        playerId: navInvestment.playerId,
        actionType: 'USE_NAVIGATOR',
        validActions: actions,
        message: `${player.name} 使用领航员（${isBig ? '大' : '小'}领航员, 最大移动 ${maxMove}）`,
    };

    return s;
}

function handleUseNavigator(s: GameState, action: Action): GameState {
    const moves = action.data.moves as Array<{ cargo: CargoType, delta: number }> | undefined;

    if (moves && moves.length > 0) {
        // 新格式: moves 数组 (单船或双船)
        for (const move of moves) {
            const ship = s.ships.find(sh => sh.cargo === move.cargo);
            if (!ship) throw new Error(`找不到 ${move.cargo} 船`);
            ship.position = Math.max(0, Math.min(SHIP_DOCK_POSITION, ship.position + move.delta));
        }
    } else {
        // 兼容旧格式: cargo + delta
        const cargo = action.data.cargo as CargoType;
        const delta = action.data.delta as number;
        const ship = s.ships.find(sh => sh.cargo === cargo);
        if (!ship) throw new Error(`找不到 ${cargo} 船`);
        ship.position = Math.max(0, Math.min(SHIP_DOCK_POSITION, ship.position + delta));
    }

    // 继续掷骰
    return continueAfterNavigator(s);
}

function handleSkipNavigator(s: GameState): GameState {
    return continueAfterNavigator(s);
}

function continueAfterNavigator(s: GameState): GameState {
    // 检查是否还有未决策的领航员 (小领航员先行动)
    const nextNav = findNextNavigator(s);
    if (nextNav) {
        s.navigatorsUsed.push(nextNav.slotId);
        return initNavigatorUse(s, nextNav);
    }

    // 所有领航员已决策，继续掷骰
    const masterId = s.harborMasterId!;
    const player = findPlayer(s, masterId);

    s.pendingAction = {
        playerId: masterId,
        actionType: 'ROLL_DICE',
        validActions: [{
            type: 'ROLL_DICE',
            playerId: masterId,
            data: {},
        }],
        message: `${player.name} 掷骰子 (第 ${s.currentRollIndex + 1} 次)`,
    };

    return s;
}

// ==================== 海盗 ====================

/**
 * 第2次掷骰后: 检查是否有船到达位置=13，且有未上船的海盗
 * 船长先行动，然后船员
 */
function checkPirateBoarding(s: GameState): GameState | null {
    const shipsAt13 = s.ships.filter(ship => ship.position === PIRATE_TRIGGER_POSITION);
    if (shipsAt13.length === 0) return null;

    // 找第一个未上船的海盗 (船长优先)
    for (const slotId of ['pirate-captain', 'pirate-crew']) {
        const inv = s.investments.find(i => i.slotId === slotId);
        if (inv && !s.pirateBoardedSlots.includes(slotId)) {
            return initPirateBoardingForSlot(s, slotId, inv.playerId, shipsAt13);
        }
    }
    return null;
}

/** 为某个海盗生成上船选项 */
function initPirateBoardingForSlot(
    s: GameState, pirateSlotId: string, playerId: string,
    shipsAt13: ShipState[]
): GameState {
    const player = findPlayer(s, playerId);
    const isPirateCaptain = pirateSlotId === 'pirate-captain';
    const label = isPirateCaptain ? '船长' : '船员';
    const actions: Action[] = [];

    for (const ship of shipsAt13) {
        const occupiedSeats = ship.crew.length;
        const maxSeats = SHIPS[ship.cargo].seats;

        // 空位 → 可以上船占座
        if (occupiedSeats < maxSeats) {
            actions.push({
                type: 'PIRATE_BOARD',
                playerId,
                data: { cargo: ship.cargo, pirateSlotId },
            });
        } else {
            // 满员 → 可以踢人
            for (const seat of ship.crew) {
                // 海盗船员不能踢掉海盗船长占据的特定新座位
                // 注意: 同一玩家可能有原始船员座(cost>0)和海盗新座(cost=0)
                // 海盗船员可以踢该玩家的原始座位，只是不能踢海盗船长的新座位
                if (!isPirateCaptain && seat.cost === 0) {
                    const captainInv = s.investments.find(i => i.slotId === 'pirate-captain');
                    if (captainInv && seat.playerId === captainInv.playerId) {
                        continue; // 海盗船长占据的座位，不可踢
                    }
                }
                actions.push({
                    type: 'PIRATE_KICK',
                    playerId,
                    data: { cargo: ship.cargo, kickPlayerId: seat.playerId, pirateSlotId },
                });
            }
        }
    }

    // 可以放弃
    actions.push({
        type: 'PIRATE_PASS',
        playerId,
        data: { pirateSlotId },
    });

    logEvent(s, `☠️ 海盗${label} (${player.name}) 可以选择上船`);

    s.pendingAction = {
        playerId,
        actionType: 'PIRATE_BOARD',
        validActions: actions,
        message: `海盗${label} (${player.name}) 选择上船行动`,
    };

    return s;
}

function handlePirateBoard(s: GameState, action: Action): GameState {
    const cargo = action.data.cargo as CargoType;
    const pirateSlotId = action.data.pirateSlotId as string;
    const ship = s.ships.find(sh => sh.cargo === cargo)!;
    const player = findPlayer(s, action.playerId);

    // 上船: 占据下一个空位
    const seatIndex = ship.crew.length;
    ship.crew.push({ playerId: action.playerId, seatIndex, cost: 0 });
    s.pirateBoardedSlots.push(pirateSlotId);

    logEvent(s, `☠️ ${player.name} 的海盗上了 ${cargo} 船 (座位${seatIndex + 1})`);

    return continueAfterPirateBoarding(s);
}

function handlePirateKick(s: GameState, action: Action): GameState {
    const cargo = action.data.cargo as CargoType;
    const kickPlayerId = action.data.kickPlayerId as string;
    const pirateSlotId = action.data.pirateSlotId as string;
    const ship = s.ships.find(sh => sh.cargo === cargo)!;
    const player = findPlayer(s, action.playerId);
    const kickedPlayer = findPlayer(s, kickPlayerId);

    // 踢人: 移除被踢玩家, 海盗替换其座位
    const kickedSeatIdx = ship.crew.findIndex(c => c.playerId === kickPlayerId);
    const seatIndex = ship.crew[kickedSeatIdx].seatIndex;
    ship.crew[kickedSeatIdx] = { playerId: action.playerId, seatIndex, cost: 0 };
    s.pirateBoardedSlots.push(pirateSlotId);

    logEvent(s, `☠️ ${player.name} 的海盗踢掉 ${kickedPlayer.name}, 替换了 ${cargo} 船座位${seatIndex + 1}`);

    return continueAfterPirateBoarding(s);
}

function handlePiratePass(s: GameState, action: Action): GameState {
    const pirateSlotId = action.data.pirateSlotId as string;
    const player = findPlayer(s, action.playerId);
    const label = pirateSlotId === 'pirate-captain' ? '船长' : '船员';
    s.pirateBoardedSlots.push(pirateSlotId); // 标记为已行动 (虽然没上船)

    logEvent(s, `☠️ 海盗${label} (${player.name}) 放弃上船`);

    return continueAfterPirateBoarding(s);
}

/** 一个海盗行动完后, 检查是否还有下一个海盗需要行动 */
function continueAfterPirateBoarding(s: GameState): GameState {
    // 船长晋升: 如果船长已行动(上船/放弃), 且船员仍在海盗位, 船员晋升为船长
    if (s.pirateBoardedSlots.includes('pirate-captain')) {
        const crewInv = s.investments.find(i => i.slotId === 'pirate-crew');
        if (crewInv && !s.pirateBoardedSlots.includes('pirate-crew')) {
            crewInv.slotId = 'pirate-captain';
            // 将 boarded 记录中的 'pirate-captain' 替换, 新船长未行动
            // 旧船长的 boarded 标记需要移除, 因为现在 'pirate-captain' 指向新人
            // 用新的标记 'pirate-captain-original' 来区分
            s.pirateBoardedSlots = s.pirateBoardedSlots.map(
                slot => slot === 'pirate-captain' ? 'pirate-captain-original' : slot
            );
            logEvent(s, `☠️ 海盗船员 (${findPlayer(s, crewInv.playerId).name}) 晋升为海盗船长`);
        }
    }

    const shipsAt13 = s.ships.filter(ship => ship.position === PIRATE_TRIGGER_POSITION);

    // 检查下一个未行动的海盗
    for (const slotId of ['pirate-captain', 'pirate-crew']) {
        const inv = s.investments.find(i => i.slotId === slotId);
        if (inv && !s.pirateBoardedSlots.includes(slotId)) {
            // 船员的有效船只: 位置=13 的船 (可能船长已上船改变了可选项)
            if (shipsAt13.length > 0) {
                return initPirateBoardingForSlot(s, slotId, inv.playerId, shipsAt13);
            }
        }
    }

    // 所有海盗已行动, 继续正常游戏流程
    s.currentStepIndex++;
    s.investTurnIndex = 0;
    return advanceRoundStep(s);
}

/**
 * 结算前: 第3次掷骰后, 检查位置=13的船是否需要海盗劫持决策
 * 只有海盗仍然在海盗位 (未上船) 才能劫持
 */
function checkPirateHijackDecision(s: GameState): GameState | null {
    const pirateCaptain = s.investments.find(i => i.slotId === 'pirate-captain');
    const pirateCrew = s.investments.find(i => i.slotId === 'pirate-crew');

    // 海盗已上船 → 不再是海盗, 无法劫持
    const captainStillPirate = pirateCaptain && !s.pirateBoardedSlots.includes('pirate-captain');
    const crewStillPirate = pirateCrew && !s.pirateBoardedSlots.includes('pirate-crew');
    // 只要有一个海盗在位即可劫船
    const hasPiratesForHijack = !!(captainStillPirate || crewStillPirate);

    if (!hasPiratesForHijack) return null;

    const shipsAt13 = s.ships.filter(ship => ship.position === PIRATE_TRIGGER_POSITION);
    if (shipsAt13.length === 0) return null;

    // 由在位的海盗做劫持决策 (船长优先)
    const decisionMaker = captainStillPirate ? pirateCaptain! : pirateCrew!;
    return initPirateHijackForShip(s, decisionMaker.playerId, shipsAt13, 0);
}

function initPirateHijackForShip(
    s: GameState, captainPlayerId: string,
    hijackedShips: ShipState[], shipIndex: number
): GameState {
    if (shipIndex >= hijackedShips.length) {
        // 所有劫持决策完成 → 进入结算
        return doSettlement(s);
    }

    const ship = hijackedShips[shipIndex];
    const player = findPlayer(s, captainPlayerId);

    s.pendingAction = {
        playerId: captainPlayerId,
        actionType: 'PIRATE_HIJACK',
        validActions: [
            {
                type: 'PIRATE_HIJACK',
                playerId: captainPlayerId,
                data: { cargo: ship.cargo, decision: 'dock' },
            },
            {
                type: 'PIRATE_HIJACK',
                playerId: captainPlayerId,
                data: { cargo: ship.cargo, decision: 'shipyard' },
            },
        ],
        message: `海盗船长 (${player.name}) 决定 ${ship.cargo} 的命运：到港还是进修船厂？`,
    };

    logEvent(s, `☠️ 海盗船长 (${player.name}) 需要决定 ${ship.cargo} 的命运`);

    return s;
}

function handlePirateHijack(s: GameState, action: Action): GameState {
    const cargo = action.data.cargo as string;
    const decision = action.data.decision as 'dock' | 'shipyard';
    const player = findPlayer(s, action.playerId);

    s.pirateDecisions[cargo] = decision;

    const label = decision === 'dock' ? '送往港口' : '送入修船厂';
    logEvent(s, `☠️ 海盗船长 (${player.name}) 决定: ${cargo} ${label}`);

    // 检查是否还有更多劫持决策
    // 找在位的海盗做后续劫持决策 (船长优先, 兼容只有船员的情况)
    const captainInv = s.investments.find(i => i.slotId === 'pirate-captain');
    const crewInv = s.investments.find(i => i.slotId === 'pirate-crew');
    const captainStill = captainInv && !s.pirateBoardedSlots.includes('pirate-captain');
    const crewStill = crewInv && !s.pirateBoardedSlots.includes('pirate-crew');
    const decisionMaker = captainStill ? captainInv! : crewStill ? crewInv! : null;

    const shipsAt13 = s.ships.filter(
        ship => ship.position === PIRATE_TRIGGER_POSITION
            && !s.pirateDecisions[ship.cargo]
    );

    if (shipsAt13.length > 0 && decisionMaker) {
        return initPirateHijackForShip(s, decisionMaker.playerId, shipsAt13, 0);
    }

    // 所有决策完成 → 进入结算
    return doSettlement(s);
}

// ==================== 抵押股票 ====================

function handleMortgageStock(s: GameState, action: Action): GameState {
    const cargo = action.data.cargo as CargoType;
    const player = findPlayer(s, action.playerId);
    const stock = player.stocks.find(st => st.cargo === cargo);

    if (!stock || stock.quantity - stock.mortgaged <= 0) {
        throw new Error(`没有可抵押的 ${cargo} 股票`);
    }

    stock.mortgaged++;
    player.cash += STOCK_MORTGAGE_VALUE;

    // 如果在投资阶段抵押, 重建投资选项 (现金增加了)
    if (s.pendingAction?.actionType === 'SELECT_INVESTMENT') {
        const newActions = buildInvestActions(s, player);
        s.pendingAction = {
            ...s.pendingAction,
            validActions: newActions,
        };
    }

    return s;
}

// ==================== 结算 ====================

function doSettlement(s: GameState): GameState {
    s.phase = 'SETTLE';

    logEvent(s, `━━━━━ 第${s.round}轮结算 ━━━━━`);

    // ── 1. 分类船只 ──
    // pirateDecisions[cargo] 记录了船长的决策 (dock/shipyard)
    // 如果没有 pirateDecision 记录, 位置=13的船算正常到港
    const dockedShips: typeof s.ships = [];      // 正常到港 (>13 or =13无劫持)
    const hijackedDockedShips: typeof s.ships = [];  // 被劫 → 船长选择到港
    const hijackedShipyardShips: typeof s.ships = []; // 被劫 → 船长选择修船厂
    const shipyardShips: typeof s.ships = [];     // 沉船/修船厂 (<13)

    for (const ship of s.ships) {
        if (ship.position > PIRATE_TRIGGER_POSITION) {
            dockedShips.push(ship);
        } else if (ship.position === PIRATE_TRIGGER_POSITION) {
            const decision = s.pirateDecisions[ship.cargo];
            if (decision === 'dock') {
                hijackedDockedShips.push(ship);
            } else if (decision === 'shipyard') {
                hijackedShipyardShips.push(ship);
            } else {
                dockedShips.push(ship);  // =13 无海盗决策 → 到港
            }
        } else {
            shipyardShips.push(ship);
        }
    }

    // 汇总: 所有最终到港的船 & 所有最终进修船厂的船
    const allDockedShips = [...dockedShips, ...hijackedDockedShips];
    const allShipyardShips = [...shipyardShips, ...hijackedShipyardShips];

    // 日志: 各船状态
    for (const ship of dockedShips) {
        logEvent(s, `🚢 ${ship.cargo} 到港 (位置${ship.position})`);
    }
    for (const ship of hijackedDockedShips) {
        logEvent(s, `☠️ ${ship.cargo} 被海盗劫持 → 送往港口 (位置${ship.position})`);
    }
    for (const ship of hijackedShipyardShips) {
        logEvent(s, `☠️ ${ship.cargo} 被海盗劫持 → 送入修船厂 (位置${ship.position})`);
    }
    for (const ship of shipyardShips) {
        logEvent(s, `🔧 ${ship.cargo} 进入修船厂 (位置${ship.position})`);
    }

    // ── 2. 海盗劫持奖励 ──
    const allHijackedShips = [...hijackedDockedShips, ...hijackedShipyardShips];
    const pirateCaptain = s.investments.find(i => i.slotId === 'pirate-captain');
    const pirateCrew = s.investments.find(i => i.slotId === 'pirate-crew');

    // 找出仍在海盗位 (未上船) 的海盗
    const activePirates = [pirateCaptain, pirateCrew].filter(
        p => p && !s.pirateBoardedSlots.includes(p.slotId)
    ) as NonNullable<typeof pirateCaptain>[];

    if (allHijackedShips.length > 0 && activePirates.length > 0) {
        logEvent(s, `☠️ 海盗出动！${activePirates.length}人劫持 ${allHijackedShips.length} 艘船`);

        for (const ship of allHijackedShips) {
            const hijackReward = SHIPS[ship.cargo].totalReward;
            const shareEach = Math.floor(hijackReward / activePirates.length);
            let remainder = hijackReward - shareEach * activePirates.length;

            const shares: string[] = [];
            for (const pirate of activePirates) {
                const player = findPlayer(s, pirate.playerId);
                const share = shareEach + (remainder > 0 ? 1 : 0);
                remainder = Math.max(0, remainder - 1);
                player.cash += share;
                pirate.reward = (pirate.reward || 0) + share;
                shares.push(`${player.name} +${share}`);
            }

            const fate = s.pirateDecisions[ship.cargo] === 'shipyard' ? '修船厂' : '港口';
            logEvent(s, `☠️ 劫持 ${ship.cargo} (总奖池${hijackReward})！${shares.join(', ')} → ${fate}`);
        }
    }

    // ── 3. 船员奖励 (仅正常到港的船+被劫送到港口的船, 被劫船只的原船员无收益) ──
    for (const ship of dockedShips) {
        if (ship.crew.length > 0) {
            const rewardPerSeat = getCrewRewardPerSeat(ship.cargo, ship.crew.length);
            for (const seat of ship.crew) {
                const player = findPlayer(s, seat.playerId);
                player.cash += rewardPerSeat;
                logEvent(s, `💰 ${player.name} 获得 ${ship.cargo} 船员奖励 +${rewardPerSeat} 元`);
            }
        }
    }
    // 被劫船只的原船员无收益
    for (const ship of allHijackedShips) {
        if (ship.crew.length > 0) {
            const names = ship.crew.map((c: { playerId: string }) => findPlayer(s, c.playerId).name).join(', ');
            logEvent(s, `❌ ${ship.cargo} 被劫持，船员 (${names}) 无收益`);
        }
    }

    // ── 4. 港口办事处 (按 allDockedShips 计算) ──
    for (const inv of s.investments.filter(i => i.type === 'HARBOR_OFFICE')) {
        const office = HARBOR_OFFICES.find(o => o.id === inv.slotId);
        if (office && allDockedShips.length >= office.minShips) {
            const player = findPlayer(s, inv.playerId);
            player.cash += office.reward;
            inv.reward = office.reward;
            logEvent(s, `🏛️ ${player.name} 港口办事处(${inv.slotId})奖励 +${office.reward} 元`);
        }
    }

    // ── 5. 修船厂办事处 (按 allShipyardShips 计算) ──
    for (const inv of s.investments.filter(i => i.type === 'SHIPYARD_OFFICE')) {
        const office = SHIPYARD_OFFICES.find(o => o.id === inv.slotId);
        if (office && allShipyardShips.length >= office.minShips) {
            const player = findPlayer(s, inv.playerId);
            player.cash += office.reward;
            inv.reward = office.reward;
            logEvent(s, `🏗️ ${player.name} 修船厂办事处(${inv.slotId})奖励 +${office.reward} 元`);
        }
    }

    // ── 6. 保险赔付 — 规则 B: 先自动抵押, 仍不够则现金清零、超出部分免除 ──
    const insuranceInv = s.investments.find(i => i.type === 'INSURANCE');
    if (insuranceInv) {
        const penalty = INSURANCE_PENALTIES[Math.min(allShipyardShips.length, 3)];
        const player = findPlayer(s, insuranceInv.playerId);

        // 自动抵押股票来覆盖赔付
        autoMortgageUntil(player, penalty);

        if (player.cash >= penalty) {
            player.cash -= penalty;
        } else {
            // 抵押所有股票后仍不够 → 现金清零, 超出部分免除
            player.cash = 0;
        }
        insuranceInv.reward = INSURANCE_REWARD - penalty;
        logEvent(s, `🛡️ ${player.name} 保险赔付 -${penalty} 元 (${allShipyardShips.length}艘进修船厂)`);
    }

    // ── 7. 更新股价 — 所有到港船只 (含被劫的) 的货物股价上涨 ──
    for (const ship of allDockedShips) {
        const current = s.stockPrices[ship.cargo];
        const next = getNextStockPrice(current);
        s.stockPrices[ship.cargo] = next;
        logEvent(s, `📈 ${ship.cargo} 股价上涨: ${current} → ${next}`);
    }

    // 玩家资产汇总
    for (const p of s.players) {
        const stockInfo = p.stocks.filter(st => st.quantity > 0)
            .map(st => `${st.cargo}×${st.quantity}${st.mortgaged > 0 ? `(抵押${st.mortgaged})` : ''}`)
            .join(', ');
        logEvent(s, `👤 ${p.name}: 现金${p.cash} | 股票: ${stockInfo || '无'}`);
    }

    // ── 8. 暂停结算，等待玩家确认 ──
    // 保存结算信息供 UI 显示
    s.settlementSummary = {
        dockedCargos: allDockedShips.map(ship => ship.cargo),
        shipyardCargos: allShipyardShips.map(ship => ship.cargo),
        hijackedCargos: allHijackedShips.map(ship => ship.cargo),
        stockPriceChanges: allDockedShips.map(ship => ({
            cargo: ship.cargo,
            from: s.stockPrices[ship.cargo] - 5 < 0 ? 0 : (() => {
                // 这里 stockPrices 已更新, 需要回推旧价
                const cur = s.stockPrices[ship.cargo];
                if (cur === 5) return 0;
                if (cur === 10) return 5;
                if (cur === 20) return 10;
                if (cur === 30) return 20;
                return cur;
            })(),
            to: s.stockPrices[ship.cargo],
        })),
        anyStockMaxed: ALL_CARGO.some(cargo => s.stockPrices[cargo] >= STOCK_END_PRICE),
        isLastRound: s.round >= s.config.rounds,
    };

    // 设置 pendingAction 让 UI 先显示结算摘要
    s.pendingAction = {
        playerId: s.players[0].id, // 任意玩家即可
        actionType: 'ACKNOWLEDGE_SETTLE',
        validActions: [{ type: 'ACKNOWLEDGE_SETTLE', playerId: s.players[0].id, data: {} }],
        message: `第${s.round}轮结算完毕`,
    };

    return s;
}

function handleAcknowledgeSettle(s: GameState): GameState {
    const summary = s.settlementSummary;
    s.settlementSummary = undefined;

    if (summary?.anyStockMaxed || summary?.isLastRound) {
        const reason = summary?.anyStockMaxed
            ? `有股票达到 ${STOCK_END_PRICE} 元`
            : `达到 ${s.config.rounds} 轮上限`;
        logEvent(s, `🏁 游戏结束 — ${reason}`);
        return finishGame(s);
    }

    // 下一轮
    logEvent(s, `➡️ 进入第${s.round + 1}轮`);
    return startNextRound(s);
}

function startNextRound(s: GameState): GameState {
    s.round++;
    s.investments = [];
    s.ships = [];
    // diceHistory 不清空 — 保留跨轮日志，每条记录带 round 字段可区分
    s.currentRollIndex = 0;
    s.navigatorsUsed = [];
    s.investSkippedPlayers = [];
    s.pirateDecisions = {};
    s.pirateBoardedSlots = [];
    s.currentStepIndex = 0;
    s.investTurnIndex = 0;

    // 上一轮港务长的下一位开始新一轮拍卖
    const masterIdx = s.players.findIndex(p => p.id === s.harborMasterId);
    s.currentPlayerIndex = (masterIdx + 1) % s.players.length;
    s.harborMasterId = undefined;

    return initAuction(s);
}

function finishGame(s: GameState): GameState {
    s.phase = 'GAME_OVER';

    const rankings: PlayerRanking[] = s.players.map(player => {
        const stockValue = player.stocks.reduce((sum, stock) => {
            return sum + stock.quantity * s.stockPrices[stock.cargo];
        }, 0);
        const mortgagePenalty = player.stocks.reduce((sum, stock) => {
            return sum + stock.mortgaged * STOCK_REDEEM_COST;
        }, 0);

        return {
            playerId: player.id,
            name: player.name,
            cash: player.cash,
            stockValue,
            mortgagePenalty,
            totalScore: player.cash + stockValue - mortgagePenalty,
            rank: 0,
        };
    });

    // 排名
    rankings.sort((a, b) => b.totalScore - a.totalScore);
    rankings.forEach((r, idx) => { r.rank = idx + 1; });

    s.gameResult = { rankings, totalRounds: s.round };
    s.pendingAction = null;
    return s;
}

// ==================== 工具函数 ====================

function findPlayer(s: GameState, playerId: string): PlayerState {
    const player = s.players.find(p => p.id === playerId);
    if (!player) throw new Error(`找不到玩家: ${playerId}`);
    return player;
}

function addStock(player: PlayerState, cargo: CargoType): void {
    const existing = player.stocks.find(s => s.cargo === cargo);
    if (existing) {
        existing.quantity++;
    } else {
        player.stocks.push({ cargo, quantity: 1, mortgaged: 0 });
    }
}

function getTotalMortgageValue(player: PlayerState): number {
    return player.stocks.reduce((sum, stock) => {
        const available = stock.quantity - stock.mortgaged;
        return sum + available * STOCK_MORTGAGE_VALUE;
    }, 0);
}

/**
 * 自动抵押股票直到现金 >= targetCash, 或无股可抵
 * 用于竞拍获胜扣款和保险赔付
 */
function autoMortgageUntil(player: PlayerState, targetCash: number): void {
    while (player.cash < targetCash) {
        const stock = player.stocks.find(s => s.quantity - s.mortgaged > 0);
        if (!stock) return; // 无股可抵
        stock.mortgaged++;
        player.cash += STOCK_MORTGAGE_VALUE;
    }
}

// ==================== 导出的查询函数 ====================

export function getValidActions(state: GameState): Action[] {
    return state.pendingAction?.validActions ?? [];
}

export function isGameOver(state: GameState): boolean {
    return state.phase === 'GAME_OVER';
}

export function getGameResult(state: GameState): GameResult | null {
    return state.gameResult ?? null;
}
