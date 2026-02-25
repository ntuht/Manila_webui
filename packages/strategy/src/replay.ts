/**
 * 单局复盘报告生成器 — 输出完整的 Markdown 对局记录
 *
 * 用法: npx tsx src/replay.ts [--seed 42]
 *
 * 输出: training_records/replay_seed_42.md (UTF-8 Markdown)
 */

import {
    createGame, applyAction, getValidActions, isGameOver, getGameResult,
    createSeededRNG,
    type GameState, type GameConfig, type Action, type CargoType,
} from '@manila/engine';
import { SHIPS, SHIP_DOCK_POSITION } from '@manila/engine';
import { expectedValueStrategy } from './strategies/ev.js';
import { createTunedStrategy, type StrategyWeights } from './strategies/tuned.js';
import { adversarialStrategy } from './strategies/adversarial.js';
import type { Strategy } from './strategy.js';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 参数 ====================

const args = process.argv.slice(2);
function getArg(name: string, defaultVal: number): number {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? parseInt(args[idx + 1]) : defaultVal;
}
const SEED = getArg('seed', 42);
const MAX_ITER = 500;

// ==================== 加载权重 ====================

let trainedWeights: StrategyWeights | null = null;
const weightsPath = path.resolve(process.cwd(), 'trained_weights.json');
try {
    trainedWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf-8'));
} catch {
    console.log('⚠ 未找到训练权重，使用默认权重');
}

// ==================== 策略配置 ====================

const strategies: Strategy[] = [
    trainedWeights ? createTunedStrategy(trainedWeights, 'trained') : expectedValueStrategy,
    expectedValueStrategy,
    expectedValueStrategy,
];

const STRAT_LABEL: Record<string, string> = {
    p0: `P0 (${strategies[0].name})`,
    p1: `P1 (${strategies[1].name})`,
    p2: `P2 (${strategies[2].name})`,
};
const STRAT_EMOJI: Record<string, string> = { p0: '🟢', p1: '🔵', p2: '🟠' };
function label(id: string): string { return `${STRAT_EMOJI[id] || ''} ${STRAT_LABEL[id] ?? id}`; }

const CARGO_NAME: Record<string, string> = { JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻' };
const CARGO_EMOJI: Record<string, string> = { JADE: '🟩', SILK: '🟪', GINSENG: '🟫', NUTMEG: '🟧' };
function cargoFull(c: string): string { return `${CARGO_EMOJI[c] || ''}${CARGO_NAME[c] || c}`; }

function progressBar(pos: number, max: number = 14): string {
    const filled = Math.min(max, Math.max(0, pos));
    return '▓'.repeat(filled) + '░'.repeat(max - filled);
}

// ==================== 事件类型 ====================

type RoundEvent =
    | { kind: 'phase'; name: string; stepIndex: number }
    | { kind: 'bid'; player: string; action: 'bid' | 'pass'; amount?: number }
    | { kind: 'stockBuy'; player: string; cargo: string; price: number }
    | { kind: 'stockSkip'; player: string }
    | { kind: 'placement'; player: string; cargos: string[]; positions: Record<string, number> }
    | { kind: 'invest'; player: string; slotId: string; cost: number; alternatives: string[]; investPhase: number }
    | { kind: 'dice'; values: number[]; sum: number; ships: ShipState[] }
    | { kind: 'navigator'; player: string; cargo: string; delta: number }
    | { kind: 'navigatorSkip'; player: string };

interface ShipState { cargo: string; position: number; arrived: boolean; }
interface PlayerSnapshot {
    id: string;
    cash: number;
    stocks: { cargo: string; qty: number; mortgaged: number }[];
}

interface RoundRecord {
    round: number;
    events: RoundEvent[];
    startState: PlayerSnapshot[];
    endState: PlayerSnapshot[];
}

function snapshotPlayers(s: GameState): PlayerSnapshot[] {
    return s.players.map(p => ({
        id: p.id,
        cash: p.cash,
        stocks: p.stocks.filter(st => st.quantity > 0).map(st => ({
            cargo: st.cargo, qty: st.quantity, mortgaged: st.mortgaged,
        })),
    }));
}

function snapshotShips(s: GameState): ShipState[] {
    return s.ships.map(ship => ({
        cargo: ship.cargo,
        position: ship.position,
        arrived: ship.position >= SHIP_DOCK_POSITION,
    }));
}

// ==================== Markdown 生成器 ====================

const md: string[] = [];
function L(s: string = '') { md.push(s); }

// ==================== 模拟执行 ====================

const gameConfig: GameConfig = {
    playerCount: 3,
    rounds: 20,
    playerNames: strategies.map(s => s.name),
};

const rng = createSeededRNG(SEED);
let state = createGame(gameConfig, rng);
let iterations = 0;
let lastRound = 0;

const roundRecords: RoundRecord[] = [];
let currentRound: RoundRecord | null = null;
let lastStepIndex = -1;

while (!isGameOver(state) && iterations < MAX_ITER) {
    const pending = state.pendingAction;
    if (!pending) break;

    // 新轮次
    if (state.round !== lastRound) {
        if (currentRound) {
            currentRound.endState = snapshotPlayers(state);
            roundRecords.push(currentRound);
        }
        lastRound = state.round;
        lastStepIndex = -1;
        currentRound = {
            round: state.round,
            events: [],
            startState: snapshotPlayers(state),
            endState: [],
        };
    }

    // 跟踪 INVEST/DICE 阶段变化
    if (currentRound && state.currentStepIndex !== lastStepIndex && state.phase !== 'AUCTION' && state.phase !== 'PLACEMENT') {
        lastStepIndex = state.currentStepIndex;
        const step = state.roundSteps?.[state.currentStepIndex];
        if (step) {
            currentRound.events.push({
                kind: 'phase',
                name: step.type === 'INVEST'
                    ? `投资阶段 ${step.index + 1}`
                    : `掷骰阶段 ${step.index + 1}`,
                stepIndex: state.currentStepIndex,
            });
        }
    }

    const playerIndex = parseInt(pending.playerId.slice(1));
    const strategy = strategies[playerIndex];
    const validActions = getValidActions(state);
    if (validActions.length === 0) break;

    let action = strategy.chooseAction(state, validActions);

    // BID fix
    if (action.type === 'BID' && action.data.amount === undefined) {
        action = { ...action, data: { ...action.data, amount: (action.data.minBid as number) ?? 1 } };
    }

    // 记录事件
    if (currentRound) {
        switch (action.type) {
            case 'BID':
                currentRound.events.push({
                    kind: 'bid', player: pending.playerId,
                    action: 'bid', amount: action.data.amount as number,
                });
                break;
            case 'PASS_AUCTION':
                currentRound.events.push({
                    kind: 'bid', player: pending.playerId, action: 'pass',
                });
                break;
            case 'BUY_STOCK':
                currentRound.events.push({
                    kind: 'stockBuy', player: pending.playerId,
                    cargo: action.data.cargo as string, price: action.data.price as number,
                });
                break;
            case 'SKIP_BUY_STOCK':
                currentRound.events.push({ kind: 'stockSkip', player: pending.playerId });
                break;
            case 'PLACE_SHIPS':
                currentRound.events.push({
                    kind: 'placement', player: pending.playerId,
                    cargos: (action.data.cargos as string[]) || [],
                    positions: (action.data.positions as Record<string, number>) || {},
                });
                break;
            case 'SELECT_INVESTMENT': {
                const alts = validActions
                    .filter(a => a.type === 'SELECT_INVESTMENT' && a.data.slotId !== action.data.slotId)
                    .slice(0, 5)
                    .map(a => `${a.data.slotId}(${a.data.cost})`);
                const step = state.roundSteps?.[state.currentStepIndex];
                currentRound.events.push({
                    kind: 'invest', player: pending.playerId,
                    slotId: action.data.slotId as string,
                    cost: action.data.cost as number,
                    alternatives: alts,
                    investPhase: step?.index ?? 0,
                });
                break;
            }
            case 'USE_NAVIGATOR':
                currentRound.events.push({
                    kind: 'navigator', player: pending.playerId,
                    cargo: action.data.cargo as string,
                    delta: action.data.delta as number,
                });
                break;
            case 'SKIP_NAVIGATOR':
                currentRound.events.push({ kind: 'navigatorSkip', player: pending.playerId });
                break;
        }
    }

    // 骰子特殊处理 —
    // 注意: 引擎的 startNextRound() 会清空 ships，但 diceHistory 保留。
    // 对于 round-ending dice，从 diceHistory 读取真实值并用 shipsBefore 推算最终位置。
    if (action.type === 'ROLL_DICE') {
        const shipsBefore = state.ships.map(ship => ({
            cargo: ship.cargo,
            position: ship.position,
        }));
        state = applyAction(state, action, rng);
        iterations++;

        // 计算骰子值: 如果进入新轮次，ships 被清空，用 shipsBefore 的到港进度推算
        if (currentRound) {
            const shipsAfterRound = state.ships; // 可能已是新轮的空数组
            let diceValues: number[];
            let shipSnapshots: ShipState[];

            if (shipsAfterRound.length > 0 && shipsAfterRound[0].cargo === shipsBefore[0].cargo) {
                // 同一轮 — 直接算差值
                diceValues = shipsBefore.map((sb, i) => {
                    const after = shipsAfterRound[i].position;
                    return Math.min(after - sb.position, 6); // cap at dock position
                });
                shipSnapshots = snapshotShips(state);
            } else {
                // 轮次已切换 — ships 已重置，但 diceHistory 保留了真实骰子值
                const lastDice = state.diceHistory[state.diceHistory.length - 1];
                if (lastDice) {
                    diceValues = [...lastDice.values];
                } else {
                    // fallback: 无法获取骰子值
                    diceValues = [0, 0, 0];
                }
                // 从 shipsBefore + 真实骰子值 推算最终位置
                shipSnapshots = shipsBefore.map((sb, i) => {
                    const finalPos = Math.min(sb.position + diceValues[i], SHIP_DOCK_POSITION);
                    return {
                        cargo: sb.cargo,
                        position: finalPos,
                        arrived: finalPos >= SHIP_DOCK_POSITION,
                    };
                });
            }

            const sum = diceValues.reduce((a, b) => a + b, 0);
            currentRound.events.push({
                kind: 'dice',
                values: diceValues,
                sum,
                ships: shipSnapshots,
            });
        }
        continue;
    }

    state = applyAction(state, action, rng);
    iterations++;
}

// 最后一轮
if (currentRound) {
    currentRound.endState = snapshotPlayers(state);
    roundRecords.push(currentRound);
}

const result = getGameResult(state);

// ==================== 生成 Markdown ====================

const initState = createGame(gameConfig, createSeededRNG(SEED));

L(`# Manila 单局复盘 — Seed #${SEED}`);
L();
L(`> 生成时间: ${new Date().toLocaleString('zh-CN')}`);
L();

// 对局总览
L(`## 对局信息`);
L();
L(`| 项目 | 值 |`);
L(`|------|-----|`);
L(`| 种子 | ${SEED} |`);
L(`| 轮数 | ${gameConfig.rounds} |`);
L(`| 玩家 | ${strategies.map((s, i) => `P${i}=${s.name}`).join(', ')} |`);
L(`| 迭代 | ${iterations} 步 |`);
L();

// 初始状态
L(`### 初始状态`);
L();
L(`| 玩家 | 初始现金 | 初始股票 |`);
L(`|------|---------|---------| `);
for (const p of initState.players) {
    const stockStr = p.stocks.filter(s => s.quantity > 0).map(s => `${CARGO_NAME[s.cargo] || s.cargo}×${s.quantity}`).join(', ');
    L(`| ${label(p.id)} | 💰${p.cash} | ${stockStr || '无'} |`);
}
L();

L(`### 初始股价`);
L();
L(`| 货物 | 股价 |`);
L(`|------|------|`);
for (const cargo of ['JADE', 'SILK', 'GINSENG', 'NUTMEG'] as const) {
    L(`| ${cargoFull(cargo)} | ${initState.stockPrices[cargo]} |`);
}
L();

// ==================== 每轮详情 ====================

for (const rr of roundRecords) {
    L(`---`);
    L();
    L(`## 第 ${rr.round} 轮`);
    L();

    // 轮初状态
    L(`**轮初状态**:`);
    for (const p of rr.startState) {
        const stockStr = p.stocks.map(s => `${CARGO_NAME[s.cargo] || s.cargo}×${s.qty}`).join(', ') || '无';
        L(`- ${label(p.id)}: 💰${p.cash} | ${stockStr}`);
    }
    L();

    // 处理事件
    const events = rr.events;

    // --- 拍卖 ---
    const bids = events.filter(e => e.kind === 'bid') as Extract<RoundEvent, { kind: 'bid' }>[];
    if (bids.length > 0) {
        L(`### 📯 拍卖阶段`);
        L();

        // 找出赢家 — 最后一个 bid 的人
        const lastBidIdx = bids.map((b, i) => b.action === 'bid' ? i : -1).filter(i => i >= 0).pop() ?? -1;

        L(`| # | 玩家 | 行动 | 出价 |`);
        L(`|---|------|------|------|`);
        for (let i = 0; i < bids.length; i++) {
            const b = bids[i];
            if (b.action === 'bid') {
                const isWinner = i === lastBidIdx;
                if (isWinner) {
                    L(`| ${i + 1} | ${label(b.player)} | **赢得拍卖** 🏆 | **${b.amount}** |`);
                } else {
                    L(`| ${i + 1} | ${label(b.player)} | 出价 | ${b.amount} |`);
                }
            } else {
                L(`| ${i + 1} | ${label(b.player)} | 放弃 ❌ | — |`);
            }
        }
        L();
    }

    // --- 买股票 ---
    const stockEvents = events.filter(e => e.kind === 'stockBuy' || e.kind === 'stockSkip');
    for (const ev of stockEvents) {
        L(`### 📈 港务长买股票`);
        L();
        if (ev.kind === 'stockBuy') {
            L(`${label(ev.player)}: 买入 **${cargoFull(ev.cargo)}** 股票, 价格 **${ev.price}**`);
        } else if (ev.kind === 'stockSkip') {
            L(`${label(ev.player)}: **跳过买股**`);
        }
        L();
    }

    // --- 放置船只 ---
    const placements = events.filter(e => e.kind === 'placement') as Extract<RoundEvent, { kind: 'placement' }>[];
    for (const pl of placements) {
        L(`### ⚓ 船只布置`);
        L();
        L(`${label(pl.player)} 作为港务长布置船只:`);
        L();
        L(`| 货物 | 起始位置 | 说明 |`);
        L(`|------|---------|------|`);
        for (const cargo of pl.cargos) {
            const pos = pl.positions[cargo] ?? 0;
            const shipConfig = SHIPS[cargo as CargoType];
            const note = pos >= 4 ? '⬆️ 高位' : pos >= 3 ? '中位' : pos >= 2 ? '中低位' : '⬇️ 低位';
            L(`| ${cargoFull(cargo)} | **${pos}** / 14 | ${note} (${shipConfig.seats}座, 奖池${shipConfig.totalReward}) |`);
        }
        const excluded = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'].filter(c => !pl.cargos.includes(c));
        if (excluded.length > 0) {
            L(`| ${cargoFull(excluded[0])} | — | 未参加本轮 |`);
        }
        L();
        L(`> 起始位置总和: ${Object.values(pl.positions).filter(v => v > 0).reduce((a, b) => a + b, 0)} (规则要求 = 9)`);
        L();
    }

    // --- 投资 + 掷骰 交替展示 ---
    // 按阶段分组
    const investDiceEvents = events.filter(e =>
        e.kind === 'invest' || e.kind === 'dice' || e.kind === 'phase' || e.kind === 'navigator' || e.kind === 'navigatorSkip'
    );

    if (investDiceEvents.length > 0) {
        L(`### 💰🎲 投资与航行`);
        L();

        let investCount = 0;

        for (const ev of investDiceEvents) {
            if (ev.kind === 'phase') {
                L(`#### ${ev.name}`);
                L();
                investCount = 0;
            } else if (ev.kind === 'invest') {
                investCount++;
                const slotDesc = describeSlot(ev.slotId);
                const altStr = ev.alternatives.length > 0
                    ? ev.alternatives.slice(0, 3).map(a => describeSlotShort(a)).join(', ')
                    : '—';
                L(`${investCount}. ${label(ev.player)}: **${slotDesc}** (花费 ${ev.cost})`);
                if (ev.alternatives.length > 0) {
                    L(`   - 备选: ${altStr}`);
                }
            } else if (ev.kind === 'dice') {
                L();
                L(`**🎲 掷骰**: \`[${ev.values.join(', ')}]\` = **${ev.sum}**`);
                L();
                L(`| 货物 | 位置 | 进度 | 状态 |`);
                L(`|------|------|------|------|`);
                for (const ship of ev.ships) {
                    const bar = `\`${progressBar(ship.position)}\``;
                    const status = ship.arrived ? '✅ 到港' : `🚢 差 ${SHIP_DOCK_POSITION - ship.position}`;
                    L(`| ${cargoFull(ship.cargo)} | ${ship.position}/${SHIP_DOCK_POSITION} | ${bar} | ${status} |`);
                }
                L();
            } else if (ev.kind === 'navigator') {
                L(`- 🧭 ${label(ev.player)}: 领航员 — ${cargoFull(ev.cargo)} ${ev.delta > 0 ? `+${ev.delta}` : ev.delta}`);
            } else if (ev.kind === 'navigatorSkip') {
                L(`- 🧭 ${label(ev.player)}: 跳过领航员`);
            }
        }
    }

    // --- 轮末状态 ---
    if (rr.endState.length > 0) {
        L(`### 📊 轮末状态`);
        L();
        L(`| 玩家 | 现金 | 持股 |`);
        L(`|------|------|------|`);
        for (const p of rr.endState) {
            const stockStr = p.stocks.map(s => {
                let label_ = `${CARGO_NAME[s.cargo] || s.cargo}×${s.qty}`;
                if (s.mortgaged > 0) label_ += `(抵${s.mortgaged})`;
                return label_;
            }).join(', ') || '无';
            L(`| ${label(p.id)} | 💰${p.cash} | ${stockStr} |`);
        }
        L();

        // --- 资金变化明细 ---
        L(`### 💹 资金变化明细`);
        L();
        L(`| 玩家 | 期初 | 竞拍 | 买股 | 投资 | 抵押 | 结算收入 | 期末 |`);
        L(`|------|------|------|------|------|------|----------|------|`);

        for (const p of rr.endState) {
            const startSnap = rr.startState.find(s => s.id === p.id);
            const startCash = startSnap?.cash ?? 0;

            // 竞拍花费: 找最后一个 action='bid' 的事件 = 赢得拍卖的出价
            const actualBids = events.filter(
                e => e.kind === 'bid' && e.action === 'bid'
            );
            const winningBid = actualBids.length > 0 ? actualBids[actualBids.length - 1] : null;
            let auctionCost = 0;
            if (winningBid && winningBid.kind === 'bid' && winningBid.player === p.id) {
                auctionCost = winningBid.amount ?? 0;
            }

            // 买股花费
            const stockBuyEv = events.find(e => e.kind === 'stockBuy' && e.player === p.id);
            const stockCost = stockBuyEv && stockBuyEv.kind === 'stockBuy' ? stockBuyEv.price : 0;

            // 投资花费合计
            const investCost = events
                .filter(e => e.kind === 'invest' && e.player === p.id)
                .reduce((sum, e) => sum + (e.kind === 'invest' ? e.cost : 0), 0);

            // 抵押收入: 比较期初和期末的 mortgaged 数
            const startMortgaged = (startSnap?.stocks ?? []).reduce((s, st) => s + (st.mortgaged ?? 0), 0);
            const endMortgaged = p.stocks.reduce((s, st) => s + (st.mortgaged ?? 0), 0);
            const newMortgages = endMortgaged - startMortgaged;
            const mortgageIncome = newMortgages * 12; // STOCK_MORTGAGE_VALUE

            // 结算收入 = 期末 - (期初 - 竞拍 - 买股 - 投资 + 抵押)
            const settlement = p.cash - (startCash - auctionCost - stockCost - investCost + mortgageIncome);

            const fmt = (n: number) => n > 0 ? `+${n}` : n < 0 ? `${n}` : '—';
            const fmtNeg = (n: number) => n > 0 ? `-${n}` : '—';

            L(`| ${label(p.id)} | ${startCash} | ${fmtNeg(auctionCost)} | ${fmtNeg(stockCost)} | ${fmtNeg(investCost)} | ${mortgageIncome > 0 ? `+${mortgageIncome}` : '—'} | ${fmt(settlement)} | **${p.cash}** |`);
        }
        L();
    }
}

// ==================== 最终结果 ====================

L(`---`);
L();
L(`## 🏆 最终结果`);
L();

if (result) {
    // 最终股价
    L(`### 最终股价`);
    L();
    L(`| 货物 | 股价 | 初始价 | 变化 |`);
    L(`|------|------|--------|------|`);
    for (const cargo of ['JADE', 'SILK', 'GINSENG', 'NUTMEG'] as const) {
        const finalPrice = state.stockPrices[cargo];
        const initPrice = initState.stockPrices[cargo];
        const delta = finalPrice - initPrice;
        const arrow = delta > 0 ? `📈+${delta}` : delta < 0 ? `📉${delta}` : '→ 0';
        L(`| ${cargoFull(cargo)} | **${finalPrice}** | ${initPrice} | ${arrow} |`);
    }
    L();

    // 排名
    L(`### 最终排名`);
    L();
    L(`| 名次 | 玩家 | 现金 | 股票价值 | 抵押罚款 | **总分** |`);
    L(`|------|------|------|---------|---------|---------|`);
    for (const r of result.rankings) {
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉';
        L(`| ${medal} ${r.rank} | ${label(r.playerId)} | ${r.cash} | ${r.stockValue} | ${r.mortgagePenalty > 0 ? `-${r.mortgagePenalty}` : '0'} | **${r.totalScore}** |`);
    }
    L();

    // 胜负分析
    const winner = result.rankings[0];
    const runnerUp = result.rankings[1];
    const margin = winner.totalScore - runnerUp.totalScore;
    L(`### 胜负分析`);
    L();
    L(`- **冠军**: ${label(winner.playerId)}, 总分 **${winner.totalScore}**`);
    L(`- **领先幅度**: ${margin} 分 (${margin > 10 ? '大胜' : margin > 5 ? '中等优势' : '险胜'})`);
    L(`- **现金占比**: ${winner.cash}/${winner.totalScore} = ${(winner.cash / winner.totalScore * 100).toFixed(0)}%`);
    L(`- **股票占比**: ${winner.stockValue}/${winner.totalScore} = ${(winner.stockValue / winner.totalScore * 100).toFixed(0)}%`);
    L();
}

// ==================== 辅助函数 ====================

function describeSlot(slotId: string): string {
    if (slotId.startsWith('crew-')) {
        const parts = slotId.split('-');
        return `🚢 船员 ${cargoFull(parts[1].toUpperCase())} 座${parts[2]}`;
    }
    if (slotId.startsWith('harbor-')) return `🏢 港口办事处 ${slotId.split('-')[1]}`;
    if (slotId.startsWith('shipyard-')) return `🔧 修船厂 ${slotId.split('-')[1]}`;
    if (slotId === 'insurance') return '🛡️ 保险';
    if (slotId.startsWith('navigator-')) return `🧭 领航员 ${slotId.includes('big') ? '大' : '小'}`;
    if (slotId.startsWith('pirate-')) return `☠️ 海盗 ${slotId.includes('captain') ? '船长' : '船员'}`;
    return slotId;
}

function describeSlotShort(slotStr: string): string {
    // Parse "crew-JADE-1(4)" format
    const match = slotStr.match(/^(.+)\((\d+)\)$/);
    if (!match) return slotStr;
    const [, id, cost] = match;
    if (id.startsWith('crew-')) {
        const parts = id.split('-');
        return `${CARGO_NAME[parts[1].toUpperCase()] || parts[1]}座${parts[2]}(${cost})`;
    }
    if (id.startsWith('harbor-')) return `港口${id.split('-')[1]}(${cost})`;
    if (id.startsWith('shipyard-')) return `修船厂${id.split('-')[1]}(${cost})`;
    if (id === 'insurance') return `保险(0)`;
    return slotStr;
}

// ==================== 写入文件 ====================

const recordDir = path.resolve('training_records');
if (!fs.existsSync(recordDir)) fs.mkdirSync(recordDir, { recursive: true });

const outPath = path.join(recordDir, `replay_seed_${SEED}.md`);
fs.writeFileSync(outPath, md.join('\n'), 'utf-8');
console.log(md.join('\n'));
console.log(`\n💾 复盘报告已保存: ${outPath}`);
