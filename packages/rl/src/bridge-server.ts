/**
 * 桥接服务 — Node.js 进程通过 stdin/stdout 与 Python 训练器通信
 *
 * 协议（JSON 行，每行一个 JSON 对象）:
 *
 * Python → Node:
 *   {"cmd":"reset", "seed":42, "playerCount":3}
 *   {"cmd":"step", "action":67}
 *   {"cmd":"info"}
 *   {"cmd":"quit"}
 *
 * Node → Python:
 *   {"obs":[...], "mask":[...], "playerId":"p0", "done":false, "rewards":null, "potential":0.12}
 *   {"done":true, "rewards":{"p0":1,"p1":0,"p2":-1}, "potential":0}
 *   {"error":"..."}
 *
 * 设计:
 *   - 非决策性动作（如 ROLL_DICE、ACKNOWLEDGE）由引擎自动执行
 *   - 只有需要 AI 决策的动作点才发送给 Python
 *   - 每个 step 返回 potential = Φ(s, player) 用于 PBRS
 */

import * as readline from 'node:readline';
import {
    createGame, applyAction, getValidActions, isGameOver, getGameResult,
    createSeededRNG,
    SHIPS, SHIP_DOCK_POSITION, INSURANCE_PENALTIES, ALL_CARGO,
    HARBOR_OFFICES, SHIPYARD_OFFICES,
    STOCK_REDEEM_COST,
    getStockPriceIncrease,
    type GameState, type Action, type RNG, type GameResult, type CargoType,
} from '@manila/engine';
import {
    arrivalProbability, estimateRollsRemaining,
    probExactlyK, probAtLeastK,
    expectedValueStrategy,
} from '@manila/strategy';
import { encodeState, OBS_DIM } from './encoder.js';
import { buildActionMask, idToAction, ACTION_DIM } from './action-map.js';

// ==================== 全局状态 ====================

let state: GameState | null = null;
let rng: RNG | null = null;
let opponentMode: 'neural' | 'ev' = 'neural';

// 每步最大自动动作数（防止无限循环）
const MAX_AUTO_STEPS = 100;

// 海关长特权估值（通过历史统计，海关长平均多赚 ~10-12 块）
const HARBOR_MASTER_PRIVILEGE_EV = 10;

// 势能归一化因子
const PHI_SCALE = 100;

// ==================== 命令处理 ====================

interface ResetCmd {
    cmd: 'reset';
    seed?: number;
    playerCount?: 3 | 4;
    opponentMode?: 'neural' | 'ev';
}

interface StepCmd {
    cmd: 'step';
    action: number;
}

interface InfoCmd {
    cmd: 'info';
}

interface QuitCmd {
    cmd: 'quit';
}

type Command = ResetCmd | StepCmd | InfoCmd | QuitCmd;

interface StepResponse {
    obs: number[];       // OBS_DIM 维 float
    mask: number[];      // ACTION_DIM 维 int8
    playerId: string;    // 当前需要决策的玩家 ID
    done: boolean;
    rewards: Record<string, number> | null;
    potential: number;   // Φ(s, player) 用于 PBRS
    rankings?: Array<{ playerId: string; totalScore: number; rank: number }>;
}

interface ErrorResponse {
    error: string;
}

function handleCommand(cmd: Command): StepResponse | ErrorResponse | null {
    try {
        switch (cmd.cmd) {
            case 'reset':
                return handleReset(cmd);
            case 'step':
                return handleStep(cmd);
            case 'info':
                return {
                    obs: [], mask: [], playerId: '',
                    done: false, rewards: null, potential: 0,
                    // @ts-ignore — 扩展信息
                    obsDim: OBS_DIM, actionDim: ACTION_DIM,
                };
            case 'quit':
                process.exit(0);
            default:
                return { error: `Unknown command: ${(cmd as { cmd: string }).cmd}` };
        }
    } catch (e) {
        return { error: (e as Error).message };
    }
}

function handleReset(cmd: ResetCmd): StepResponse {
    const seed = cmd.seed ?? Math.floor(Math.random() * 1000000);
    const playerCount = cmd.playerCount ?? 3;
    opponentMode = cmd.opponentMode ?? 'neural';
    rng = createSeededRNG(seed);
    state = createGame({ playerCount, rounds: 20 }, rng);

    // 推进到第一个需要决策的点
    return advanceToDecision();
}

function handleStep(cmd: StepCmd): StepResponse {
    if (!state || !rng) {
        throw new Error('Game not initialized. Call reset first.');
    }
    if (isGameOver(state)) {
        throw new Error('Game is already over.');
    }

    const pending = state.pendingAction;
    if (!pending) {
        throw new Error('No pending action.');
    }

    const validActions = getValidActions(state);
    const action = idToAction(cmd.action, state, validActions);
    state = applyAction(state, action, rng);

    return advanceToDecision();
}

/**
 * 自动执行不需要 AI 决策的动作，直到遇到需要决策的点或游戏结束
 */
function advanceToDecision(): StepResponse {
    if (!state || !rng) throw new Error('State not initialized');

    let autoSteps = 0;

    while (autoSteps < MAX_AUTO_STEPS) {
        // 游戏结束 — 坑 #3: 终端 Φ 强制为 0
        if (isGameOver(state)) {
            const result = getGameResult(state);
            const rewards = computeRewards(result);
            return {
                obs: Array.from(new Float32Array(OBS_DIM)),
                mask: Array.from(new Int8Array(ACTION_DIM)),
                playerId: '',
                done: true,
                rewards,
                potential: 0,  // 终端状态 Φ = 0
                rankings: result?.rankings.map(r => ({
                    playerId: r.playerId,
                    totalScore: r.totalScore,
                    rank: r.rank,
                })),
            };
        }

        const pending = state.pendingAction;
        if (!pending) {
            throw new Error('No pending action and game not over');
        }

        const validActions = getValidActions(state);

        // 自动处理不需要 AI 决策的动作
        if (isAutoAction(pending.actionType, validActions)) {
            const action = validActions[0]; // 自动动作通常只有一个选择
            state = applyAction(state, action, rng!);
            autoSteps++;
            continue;
        }

        // EV 模式: 非 P0 玩家由内置 EV 策略自动执行
        if (opponentMode === 'ev' && pending.playerId !== 'p0') {
            const action = expectedValueStrategy.chooseAction(state!, validActions);
            state = applyAction(state!, action, rng!);
            autoSteps++;
            continue;
        }

        // 需要 AI 决策
        const obs = encodeState(state, pending.playerId);
        const mask = buildActionMask(validActions, state);
        const potential = computePotential(state, pending.playerId);

        return {
            obs: Array.from(obs),
            mask: Array.from(mask),
            playerId: pending.playerId,
            done: false,
            rewards: null,
            potential,
        };
    }

    throw new Error(`Exceeded ${MAX_AUTO_STEPS} auto steps — possible infinite loop`);
}

/**
 * 判断动作是否可以自动执行（不需要 AI 决策）
 */
function isAutoAction(actionType: string, validActions: Action[]): boolean {
    // ROLL_DICE 总是自动执行（玩家无选择权）
    if (actionType === 'ROLL_DICE') return true;
    // ACKNOWLEDGE / ACKNOWLEDGE_SETTLE 总是自动执行
    if (actionType === 'ACKNOWLEDGE') return true;
    if (actionType === 'ACKNOWLEDGE_SETTLE') return true;
    // 只有唯一选择时也可以自动执行
    if (validActions.length === 1 && actionType === 'ROLL_DICE') return true;
    return false;
}

// ==================== 势能函数 (PBRS) ====================

/**
 * 计算相对势能 Φ(s, playerId)
 *
 * Φ = (self_net_worth - avg_opponent_net_worth) / PHI_SCALE
 *
 * 其中 net_worth = cash + stock_value + investment_EV + privilege_EV
 *
 * 修正:
 *   坑 #1: 海关长特权估值 — 竞标花钱但获得特权, 不应产生巨额负奖励
 *   坑 #2: 相对势能 — 零和博弈中, 只有比对手赚更多才是正向信号
 *   坑 #3: 终端归零 — 在 advanceToDecision 中处理
 */
function computePotential(s: GameState, playerId: string): number {
    const selfNW = computeNetWorth(s, playerId);

    // 对手平均净值
    const opponents = s.players.filter(p => p.id !== playerId);
    const avgOpponentNW = opponents.length > 0
        ? opponents.reduce((sum, p) => sum + computeNetWorth(s, p.id), 0) / opponents.length
        : 0;

    // 坑 #2: 相对差值
    return (selfNW - avgOpponentNW) / PHI_SCALE;
}

// 价格升值阶梯 (查表)
const NEXT_PRICE: Record<number, number> = { 0: 5, 5: 10, 10: 20, 20: 30, 30: 30 };

// 实证校准: 各最高股价水平对应的剩余轮次中位数 (1000 局随机对局统计)
const REMAINING_ROUNDS_BY_MAX_PRICE: Record<number, number> = {
    0: 6, 5: 5, 10: 3, 20: 1, 30: 0,
};

/**
 * 估算剩余游戏轮次 (基于当前最高股价, 实证校准)
 */
function estimateRemainingGameRounds(s: GameState): number {
    const maxPrice = Math.max(...ALL_CARGO.map(c => s.stockPrices[c] ?? 0));
    return REMAINING_ROUNDS_BY_MAX_PRICE[maxPrice] ?? 3;
}

/**
 * DP 计算期望终局价格
 *
 * 给定当前价格(可以是期望值), 走 [0,5,10,20,30] 阶梯
 * 每轮 P_ADVANCE=0.45 概率升 1 级 (=P(被选上船)×P(到港))
 */
function calcExpectedFinalPrice(currentPrice: number, futureRounds: number): number {
    const PRICE_LEVELS = [0, 5, 10, 20, 30];
    const P_ADVANCE = 0.45; // 每轮升级概率 (0.75 × 0.6)

    // 找最近的起始 level
    let startIdx = 0;
    for (let i = PRICE_LEVELS.length - 1; i >= 0; i--) {
        if (currentPrice >= PRICE_LEVELS[i]) { startIdx = i; break; }
    }

    // DP: dp[i] = 在第 i 级的概率
    let dp = new Array(PRICE_LEVELS.length).fill(0);
    dp[startIdx] = 1.0;

    for (let r = 0; r < futureRounds; r++) {
        const newDp = new Array(PRICE_LEVELS.length).fill(0);
        for (let i = 0; i < PRICE_LEVELS.length; i++) {
            if (dp[i] === 0) continue;
            if (i < PRICE_LEVELS.length - 1) {
                newDp[i] += dp[i] * (1 - P_ADVANCE);
                newDp[i + 1] += dp[i] * P_ADVANCE;
            } else {
                newDp[i] += dp[i]; // 已到顶级, 停留
            }
        }
        dp = newDp;
    }

    // 期望价格 = Σ prob × price
    let expected = 0;
    for (let i = 0; i < PRICE_LEVELS.length; i++) {
        expected += dp[i] * PRICE_LEVELS[i];
    }
    return expected;
}

/**
 * 预测海关长的 [5,4,0] 排船策略
 * 理性海关长会把最高位分配给自己持仓最多的船
 * 仅在排船前阶段 (AUCTION/BUY_STOCK/PLACE_SHIPS) 有意义
 */
function predictHMPlacement(s: GameState): Record<string, number> {
    const result: Record<string, number> = {};
    if (!s.harborMasterId) return result;

    const hmPlayer = s.players.find(p => p.id === s.harborMasterId);
    if (!hmPlayer || s.ships.length === 0) return result;

    // 按海关长持仓排序
    const holdings = s.ships.map(ship => {
        const stock = hmPlayer.stocks.find(st => st.cargo === ship.cargo);
        const qty = stock ? (stock.quantity - stock.mortgaged) : 0;
        return { cargo: ship.cargo, qty };
    });
    holdings.sort((a, b) => b.qty - a.qty);

    // [5, 4, 0] 分配 (总和=9, 最大利益化)
    const distribution = [5, 4, 0];
    holdings.forEach((h, i) => {
        if (i < distribution.length) {
            result[h.cargo] = distribution[i];
        }
    });

    return result;
}

/**
 * 计算单个玩家的估算净值 (v2 — 含海关长霸权 EV)
 *
 * net_worth = cash + stock_value_with_expected_increase + Σ(investment_EV)
 *
 * 关键改进:
 *   1. 股票价值 = unmortgaged × (currentPrice + expectedIncrease)
 *   2. expectedIncrease = P(dock) × (nextPrice - currentPrice)
 *   3. 排船前: 用海关长预测位置 [5,4,0] 计算 P(dock)
 *   4. 排船后: 用实际位置计算 P(dock)
 */
function computeNetWorth(s: GameState, playerId: string): number {
    const player = s.players.find(p => p.id === playerId);
    if (!player) return 0;

    let netWorth = 0;
    const rollsLeft = estimateRollsRemaining(s);

    // 1. 现金
    netWorth += player.cash;

    // 2. 海关长排船预测 (仅排船前阶段)
    const isPrePlacement = ['AUCTION', 'BUY_STOCK', 'PLACE_SHIPS'].includes(s.phase);
    const hmPrediction = isPrePlacement ? predictHMPlacement(s) : {};

    // 3. 股票价值 = Σ (全部持股 × 期望终局价) - 抵押赎回成本
    //    期望终局价 = 本轮到港概率修正后, 再用 DP 推算剩余轮次的升值
    const futureRounds = estimateRemainingGameRounds(s);
    for (const stock of player.stocks) {
        if (stock.quantity <= 0) continue;

        const currentPrice = s.stockPrices[stock.cargo];
        const ship = s.ships.find(sh => sh.cargo === stock.cargo);

        // 本轮期望价格 (考虑到港概率)
        let thisRoundExpectedPrice = currentPrice;
        if (ship) {
            let evalPos = ship.position;
            if (evalPos === 0 && hmPrediction[stock.cargo] !== undefined) {
                evalPos = hmPrediction[stock.cargo];
            }
            const probDock = arrivalProbability(evalPos, rollsLeft);
            const nextPrice = NEXT_PRICE[currentPrice] ?? currentPrice;
            thisRoundExpectedPrice = currentPrice + probDock * (nextPrice - currentPrice);
        }

        // 多轮期望终局价 (DP 走价格阶梯)
        const expectedFinalPrice = calcExpectedFinalPrice(thisRoundExpectedPrice, futureRounds);
        netWorth += stock.quantity * expectedFinalPrice;

        // 扣除抵押赎回成本
        netWorth -= stock.mortgaged * STOCK_REDEEM_COST;
    }

    // 4. 投资 EV = Σ 每笔投资的期望收益 (不减成本, 因为成本已从 cash 扣除)
    for (const inv of s.investments) {
        if (inv.playerId !== playerId) continue;
        netWorth += computeInvestmentEV(s, inv, rollsLeft);
    }

    // 5. 海关长特权 (排船前阶段): 扁平估值
    //    特权价值会通过 stock_value 的 hmPrediction 自然反映
    //    但对于刚赢得拍卖、还没买股的时刻, 需要额外补偿
    if (s.harborMasterId === playerId && s.phase === 'AUCTION') {
        netWorth += HARBOR_MASTER_PRIVILEGE_EV;
    }

    return netWorth;
}

/**
 * 计算单笔投资的期望收益 (不减成本)
 */
function computeInvestmentEV(
    s: GameState, inv: { type: string; slotId: string; playerId: string; cost: number },
    rollsLeft: number,
): number {
    const slotId = inv.slotId;
    if (!slotId) return 0;  // 防御: 未知投资条目

    // ---- CREW: P(到港) × 每人分成 ----
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        const cargo = parts[1] as CargoType;
        const ship = s.ships.find(sh => sh.cargo === cargo);
        if (!ship) return 0;

        const prob = arrivalProbability(ship.position, rollsLeft);
        const crewCount = Math.max(1, ship.crew.length);
        const rewardPer = SHIPS[cargo].totalReward / crewCount;

        // 注意: 持股增值已在 computeNetWorth 的股票估值中计算, 此处不重复计入
        return prob * rewardPer;
    }

    // ---- HARBOR_OFFICE: P(≥N 艘到港) × 奖金 ----
    if (slotId.startsWith('harbor-')) {
        const office = HARBOR_OFFICES.find(o => o.id === slotId);
        if (!office) return 0;

        const arrivalProbs = s.ships.map(sh => arrivalProbability(sh.position, rollsLeft));
        const probTrigger = probAtLeastK(arrivalProbs, office.minShips);
        return probTrigger * office.reward;
    }

    // ---- SHIPYARD_OFFICE: P(≥N 艘沉没) × 奖金 ----
    if (slotId.startsWith('shipyard-')) {
        const office = SHIPYARD_OFFICES.find(o => o.id === slotId);
        if (!office) return 0;

        const failProbs = s.ships.map(sh => 1 - arrivalProbability(sh.position, rollsLeft));
        const probTrigger = probAtLeastK(failProbs, office.minShips);
        return probTrigger * office.reward;
    }

    // ---- INSURANCE: 10 - E[罚金] ----
    if (slotId === 'insurance') {
        const failProbs = s.ships.map(sh => 1 - arrivalProbability(sh.position, rollsLeft));
        let expectedPenalty = 0;
        for (let k = 0; k <= 3; k++) {
            expectedPenalty += probExactlyK(failProbs, k) * INSURANCE_PENALTIES[k];
        }
        return 10 - expectedPenalty;
    }

    // ---- NAVIGATOR: 移动力 × 估值 ----
    if (slotId.startsWith('navigator-')) {
        const movePower = slotId === 'navigator-big' ? 2 : 1;
        // 领航员价值 ≈ 它能改变到港概率的边际收益
        return movePower * 1.5;
    }

    // ---- PIRATE: P(恰好=13) × 奖池/2 × 配对概率 ----
    if (slotId.startsWith('pirate-')) {
        const isCaptain = slotId === 'pirate-captain';
        const hasPair = s.investments.some(
            i => i.slotId === (isCaptain ? 'pirate-crew' : 'pirate-captain')
        );
        const pairFactor = hasPair ? 1.0 : 0.3;

        let totalEV = 0;
        for (const ship of s.ships) {
            // 劫船条件: 第3次掷骰后 position 恰好 = 13
            // P(=13) ≈ P(>=13) - P(>=14)
            const probReach13 = ship.position >= 13
                ? 1.0
                : arrivalProbability(ship.position + 1, rollsLeft);
            const probReach14 = arrivalProbability(ship.position, rollsLeft);
            const probExact13 = Math.max(0, probReach13 - probReach14);
            // 劫持奖池按在场海盗数均分, 单人 EV 取一半作为近似
            totalEV += probExact13 * SHIPS[ship.cargo].totalReward * 0.5;
        }
        return totalEV * pairFactor;
    }

    return 0;
}

// ==================== 奖励计算 ====================

/**
 * 根据最终排名 + 分差计算奖励
 * 50% 排名信号 (第1名 +1, 最后 -1)
 * 50% 归一化分差信号 (鼓励大比分赢)
 */
function computeRewards(result: GameResult | null): Record<string, number> {
    if (!result) return {};

    const n = result.rankings.length;
    const rewards: Record<string, number> = {};

    if (n <= 1) {
        for (const r of result.rankings) rewards[r.playerId] = 0;
        return rewards;
    }

    const maxScore = Math.max(...result.rankings.map(r => r.totalScore));
    const minScore = Math.min(...result.rankings.map(r => r.totalScore));
    const scoreRange = Math.max(maxScore - minScore, 1);
    const midScore = (maxScore + minScore) / 2;

    for (const r of result.rankings) {
        const rankReward = 1 - 2 * (r.rank - 1) / (n - 1);
        const scoreReward = (r.totalScore - midScore) / scoreRange;
        rewards[r.playerId] = 0.5 * rankReward + 0.5 * scoreReward;
    }

    return rewards;
}

// ==================== 主循环 ====================

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let cmd: Command;
    try {
        cmd = JSON.parse(trimmed) as Command;
    } catch {
        const errResp: ErrorResponse = { error: `Invalid JSON: ${trimmed}` };
        process.stdout.write(JSON.stringify(errResp) + '\n');
        return;
    }

    const response = handleCommand(cmd);
    if (response) {
        process.stdout.write(JSON.stringify(response) + '\n');
    }
});

rl.on('close', () => {
    process.exit(0);
});

// 通知 Python 桥接已就绪
process.stdout.write(JSON.stringify({ ready: true, obsDim: OBS_DIM, actionDim: ACTION_DIM }) + '\n');
