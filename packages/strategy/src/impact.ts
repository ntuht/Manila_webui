/**
 * 对手影响计算器 — 系统性分析每个行动对所有对手的影响
 *
 * 8 个维度：
 * 1. 船员稀释  — 加入对手的船，拆分其奖励
 * 2. 保险损害  — 使船失败，增加对手保险赔付
 * 3. 港口办事处干扰  — 减少到港船只数，降低对手办事处奖励
 * 4. 修船厂收益  — 增加失败船只数，提升自己修船厂办事处
 * 5. 领航员剥夺  — 占据领航员位，剥夺对手操纵能力
 * 6. 槽位封锁   — 抢占对手需要的高价值位置
 * 7. 现金压迫   — 限制对手后续购买力
 * 8. 股票损害   — 降低到港概率，压低对手持有货物的股价
 */

import type { GameState, CargoType, Investment } from '@manila/engine';
import {
    SHIPS, SHIP_DOCK_POSITION, INSURANCE_PENALTIES,
    HARBOR_OFFICES, SHIPYARD_OFFICES,
    STOCK_PRICE_INCREASE, getStockPriceIncrease,
} from '@manila/engine';

/**
 * 精确计算 P(n颗骰子之和 >= target)
 * 每颗骰子取值 1-6, 用 DP 精确计算
 * n 最大 3, sum 最大 18 — 计算量极小
 */
export function arrivalProbability(position: number, rollsRemaining: number): number {
    if (position >= SHIP_DOCK_POSITION) return 1;
    if (rollsRemaining <= 0) return 0;

    const distNeeded = SHIP_DOCK_POSITION - position;
    const n = rollsRemaining;

    // 不可能: 即使全掷 6 也到不了
    if (distNeeded > n * 6) return 0;
    // 必定到达: 即使全掷 1 也够
    if (distNeeded <= n) return 1;

    // DP: dp[s] = 用 i 颗骰子掷出总和恰好为 s 的方式数
    const maxSum = n * 6;
    let dp = new Array(maxSum + 1).fill(0);
    dp[0] = 1; // 0 颗骰子, 总和 0

    for (let die = 0; die < n; die++) {
        const next = new Array(maxSum + 1).fill(0);
        for (let s = 0; s <= die * 6; s++) {
            if (dp[s] === 0) continue;
            for (let face = 1; face <= 6; face++) {
                next[s + face] += dp[s];
            }
        }
        dp = next;
    }

    // P(sum >= distNeeded) = Σ dp[s] for s >= distNeeded / 6^n
    const totalOutcomes = Math.pow(6, n);
    let favorable = 0;
    for (let s = distNeeded; s <= maxSum; s++) {
        favorable += dp[s];
    }

    return favorable / totalOutcomes;
}

export function probExactlyK(probs: number[], k: number): number {
    const n = probs.length;
    if (k < 0 || k > n) return 0;
    let dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 0; i < n; i++) {
        const newDp = new Array(n + 1).fill(0);
        for (let j = 0; j <= i; j++) {
            newDp[j] += dp[j] * (1 - probs[i]);
            newDp[j + 1] += dp[j] * probs[i];
        }
        dp = newDp;
    }
    return dp[k];
}

export function probAtLeastK(probs: number[], k: number): number {
    let sum = 0;
    for (let j = k; j <= probs.length; j++) sum += probExactlyK(probs, j);
    return sum;
}

export function estimateRollsRemaining(state: GameState): number {
    const diceSteps = state.roundSteps.filter(s => s.type === 'DICE');
    return Math.max(0, diceSteps.length - state.diceHistory.length);
}

// ==================== 影响维度 ====================

export interface ImpactVector {
    selfEV: number;         // 自身期望收益
    crewDilution: number;   // 船员稀释损害
    shipyardBoost: number;  // 修船厂办事处收益
    navDenial: number;      // 领航员剥夺
    slotBlock: number;      // 槽位封锁
    cashPressure: number;   // 现金压迫
}

export function emptyImpact(): ImpactVector {
    return {
        selfEV: 0, crewDilution: 0,
        shipyardBoost: 0, navDenial: 0, slotBlock: 0, cashPressure: 0,
    };
}

// ==================== 投资影响计算 ====================

/**
 * 计算投资行动的完整影响向量
 */
export function calcInvestmentImpact(
    state: GameState, slotId: string, cost: number, myId: string
): ImpactVector {
    const impact = emptyImpact();
    const rollsLeft = estimateRollsRemaining(state);

    if (slotId.startsWith('crew-')) {
        return calcCrewImpact(state, slotId, cost, myId, rollsLeft);
    }
    if (slotId.startsWith('harbor-')) {
        return calcHarborOfficeImpact(state, slotId, cost, myId, rollsLeft);
    }
    if (slotId.startsWith('shipyard-')) {
        return calcShipyardOfficeImpact(state, slotId, cost, myId, rollsLeft);
    }
    if (slotId === 'insurance') {
        return calcInsuranceImpact(state, cost, myId, rollsLeft);
    }
    if (slotId.startsWith('navigator-')) {
        return calcNavigatorSlotImpact(state, slotId, cost, myId);
    }
    if (slotId.startsWith('pirate-')) {
        return calcPirateImpact(state, slotId, cost, myId, rollsLeft);
    }

    impact.selfEV = -cost;
    return impact;
}

function calcCrewImpact(
    state: GameState, slotId: string, cost: number, myId: string, rollsLeft: number
): ImpactVector {
    const impact = emptyImpact();
    const parts = slotId.split('-');
    const cargo = parts[1] as CargoType;
    const ship = state.ships.find(s => s.cargo === cargo);
    if (!ship) return impact;

    const prob = arrivalProbability(ship.position, rollsLeft);
    const currentCrew = ship.crew.length;
    const newCrew = currentCrew + 1;

    // 预测最终船员数 — 综合判断对手行动能力和船的吸引力
    const predictedFinal = estimateFinalCrew(state, cargo, newCrew, prob, myId);

    // 自身收益 — 用预测的最终人数来算每人分成
    const rewardIfArrive = SHIPS[cargo].totalReward / predictedFinal;

    // + 持股增值: 到港时所有持股的该货物都升值
    const myPlayer = state.players.find(p => p.id === myId)!;
    const myHolding = myPlayer.stocks
        .filter(s => s.cargo === cargo)
        .reduce((sum, s) => sum + s.quantity, 0);
    const stockValueGain = myHolding * getStockPriceIncrease(state.stockPrices[cargo]);

    impact.selfEV = prob * (rewardIfArrive + stockValueGain) - cost;

    // — 船员稀释（边际影响）—
    // 关键：计算 MY action 导致的边际稀释，而非总稀释
    // 如果我不上船，对手也会来分蛋糕 → 基准线不是 "只有对手一个人"
    // 而是 "我不上船时的预测最终人数"
    const opponentCrew = ship.crew.filter(c => c.playerId !== myId);
    if (opponentCrew.length > 0 && currentCrew > 0) {
        // 我不上船时，对手的预测最终每人奖励
        const predictedWithoutMe = estimateFinalCrew(state, cargo, currentCrew, prob, myId);
        const baselineRewardPer = SHIPS[cargo].totalReward / predictedWithoutMe;
        // 我上船后的预测每人奖励
        const withMeRewardPer = SHIPS[cargo].totalReward / predictedFinal;
        // 边际稀释 = 基准线 - 我上船后
        const marginalDilution = (baselineRewardPer - withMeRewardPer) * prob;
        impact.crewDilution = Math.max(0, marginalDilution) * opponentCrew.length;
    }

    // — 槽位封锁 —
    // 如果这是最后一个座位，对手无法再上船
    const nextSeatIdx = parseInt(parts[2]) + 1;
    if (nextSeatIdx >= SHIPS[cargo].seats) {
        const maxOpponentEV = prob * (SHIPS[cargo].totalReward / (newCrew + 1)) * 0.3;
        impact.slotBlock = maxOpponentEV;
    }

    // — 现金压迫 —
    impact.cashPressure = calcCashPressureValue(state, cost, myId);

    return impact;
}

function calcHarborOfficeImpact(
    state: GameState, slotId: string, cost: number, myId: string, rollsLeft: number
): ImpactVector {
    const impact = emptyImpact();
    const office = HARBOR_OFFICES.find(o => o.id === slotId);
    if (!office) return impact;

    const arrivalProbs = state.ships.map(s => arrivalProbability(s.position, rollsLeft));
    const probTrigger = probAtLeastK(arrivalProbs, office.minShips);
    impact.selfEV = probTrigger * office.reward - cost;

    // — 槽位封锁 —
    impact.slotBlock = probTrigger * office.reward * 0.5;

    impact.cashPressure = calcCashPressureValue(state, cost, myId);
    return impact;
}

function calcShipyardOfficeImpact(
    state: GameState, slotId: string, cost: number, myId: string, rollsLeft: number
): ImpactVector {
    const impact = emptyImpact();
    const office = SHIPYARD_OFFICES.find(o => o.id === slotId);
    if (!office) return impact;

    const failProbs = state.ships.map(s => 1 - arrivalProbability(s.position, rollsLeft));
    const probTrigger = probAtLeastK(failProbs, office.minShips);

    // 投资阶段越早，不确定性越大 → 折扣
    const earlyDiscount = state.currentRollIndex === 0 ? 0.5 : 1.0;
    impact.selfEV = probTrigger * office.reward * earlyDiscount - cost;
    // opponent-impact 维度: 与 harbor 办事处保持一致，不额外乘 probTrigger
    impact.shipyardBoost = probTrigger * office.reward;
    impact.slotBlock = probTrigger * office.reward * 0.5;
    impact.cashPressure = calcCashPressureValue(state, cost, myId);
    return impact;
}

function calcInsuranceImpact(
    state: GameState, cost: number, myId: string, rollsLeft: number
): ImpactVector {
    const impact = emptyImpact();

    const failProbs = state.ships.map(s => 1 - arrivalProbability(s.position, rollsLeft));
    let expectedPenalty = 0;
    for (let k = 0; k <= 3; k++) {
        expectedPenalty += probExactlyK(failProbs, k) * INSURANCE_PENALTIES[k];
    }
    impact.selfEV = 10 - expectedPenalty - cost;
    impact.slotBlock = 10 - expectedPenalty;

    return impact;
}

function calcNavigatorSlotImpact(
    state: GameState, slotId: string, cost: number, myId: string
): ImpactVector {
    const impact = emptyImpact();
    const isBig = slotId === 'navigator-big';
    const movePower = isBig ? 2 : 1;

    // 检查自己是否有船员在船上 — 没有自己人的话领航员几乎无用
    const myCrewShips = state.ships.filter(sh =>
        sh.crew.some(c => c.playerId === myId));
    const utilityFactor = myCrewShips.length > 0 ? 1.0 : 0.1;

    impact.selfEV = movePower * 1.5 * utilityFactor - cost;
    impact.navDenial = movePower * 3;
    impact.cashPressure = calcCashPressureValue(state, cost, myId);
    return impact;
}

function calcPirateImpact(
    state: GameState, slotId: string, cost: number, myId: string, rollsLeft: number
): ImpactVector {
    const impact = emptyImpact();

    // 海盗在船到达 position 13 时劫持 — 获得该船全部奖池，船员不分
    // EV = SUM of (prob_reach_13 × reward) 对所有船求和
    let totalHijackEV = 0;
    for (const ship of state.ships) {
        // 到达 position 13+ 的概率 (海盗触发位置)
        // 技巧: arrivalProbability 计算到 pos 14 的概率
        // 传入 pos+1 使 distNeeded = 14-(pos+1) = 13-pos
        const probReach13 = ship.position >= 13
            ? 1.0
            : arrivalProbability(ship.position + 1, rollsLeft);
        const hijackReward = SHIPS[ship.cargo].totalReward;

        // 如果我有船员在这艘船上，劫持会让我失去船员分成
        const myCrew = ship.crew.filter(c => c.playerId === myId);
        const myCrewLoss = myCrew.length > 0
            ? hijackReward / Math.max(1, ship.crew.length) * myCrew.length
            : 0;

        totalHijackEV += probReach13 * (hijackReward - myCrewLoss);
    }

    // 海盗 selfEV = 总劫持收益 - 成本
    const isCaptain = slotId === 'pirate-captain';
    const hasPairSlot = state.investments.some(
        inv => inv.slotId === (isCaptain ? 'pirate-crew' : 'pirate-captain')
    );
    // 单人海盗只有 30% 概率配对成功（需要另一个人也买）
    const pairFactor = hasPairSlot ? 1.0 : 0.3;
    impact.selfEV = totalHijackEV * pairFactor - cost;

    // 对手损害: 劫持从对手手中抢走船员分成
    const opponentCrewInvestments = state.investments.filter(
        inv => inv.type === 'CREW' && inv.playerId !== myId
    );
    if (opponentCrewInvestments.length > 0) {
        let totalDamage = 0;
        for (const inv of opponentCrewInvestments) {
            const parts = inv.slotId.split('-');
            const cargo = parts[1] as CargoType;
            const ship = state.ships.find(s => s.cargo === cargo);
            if (ship) {
                const probReach13 = ship.position >= 13
                    ? 1.0
                    : arrivalProbability(ship.position + 1, rollsLeft);
                const rewardPer = SHIPS[cargo].totalReward / Math.max(1, ship.crew.length);
                totalDamage += probReach13 * rewardPer;
            }
        }
        impact.crewDilution = totalDamage * pairFactor * 0.3;
    }

    impact.cashPressure = calcCashPressureValue(state, cost, myId);
    return impact;
}

// ==================== 领航员使用影响 ====================

/**
 * 计算领航员操作（推/拉船）的完整影响向量
 */
export function calcNavigatorMoveImpact(
    state: GameState, cargo: CargoType, delta: number, myId: string
): ImpactVector {
    const impact = emptyImpact();
    const ship = state.ships.find(s => s.cargo === cargo);
    if (!ship) return impact;

    const rollsLeft = estimateRollsRemaining(state);
    const probBefore = arrivalProbability(ship.position, rollsLeft);
    const probAfter = arrivalProbability(ship.position + delta, rollsLeft);
    const probDelta = probAfter - probBefore;

    const myCrew = ship.crew.filter(c => c.playerId === myId);
    const oppCrew = ship.crew.filter(c => c.playerId !== myId);

    // === 自身收益 ===
    if (myCrew.length > 0) {
        const rewardPer = SHIPS[cargo].totalReward / ship.crew.length;
        impact.selfEV = probDelta * rewardPer * myCrew.length;
    }

    // === 1. 船员稀释/损害 ===
    if (oppCrew.length > 0) {
        const rewardPer = SHIPS[cargo].totalReward / ship.crew.length;
        if (delta < 0) {
            impact.crewDilution = -probDelta * rewardPer * oppCrew.length;
        }
    }

    // === 2. 保险损害 ===
    const oppInsurance = state.investments.filter(
        inv => inv.slotId === 'insurance' && inv.playerId !== myId
    );
    if (oppInsurance.length > 0 && delta < 0) {
        const failProbsBefore = state.ships.map(s => {
            if (s.cargo === cargo) return 1 - probBefore;
            return 1 - arrivalProbability(s.position, rollsLeft);
        });
        const failProbsAfter = state.ships.map(s => {
            if (s.cargo === cargo) return 1 - probAfter;
            return 1 - arrivalProbability(s.position, rollsLeft);
        });

        let penaltyBefore = 0, penaltyAfter = 0;
        for (let k = 0; k <= 3; k++) {
            penaltyBefore += probExactlyK(failProbsBefore, k) * INSURANCE_PENALTIES[k];
            penaltyAfter += probExactlyK(failProbsAfter, k) * INSURANCE_PENALTIES[k];
        }
        // 折叠到 selfEV — 拉后船增加对手保险赔付 (有利于我)
        impact.selfEV += (penaltyAfter - penaltyBefore) * oppInsurance.length * 0.5;
    }

    // === 3. 港口办事处干扰 ===
    const oppHarborInv = state.investments.filter(
        inv => inv.type === 'HARBOR_OFFICE' && inv.playerId !== myId
    );
    if (oppHarborInv.length > 0 && delta < 0) {
        for (const inv of oppHarborInv) {
            const office = HARBOR_OFFICES.find(o => o.id === inv.slotId);
            if (!office) continue;

            const arrProbsBefore = state.ships.map(s => {
                if (s.cargo === cargo) return probBefore;
                return arrivalProbability(s.position, rollsLeft);
            });
            const arrProbsAfter = state.ships.map(s => {
                if (s.cargo === cargo) return probAfter;
                return arrivalProbability(s.position, rollsLeft);
            });

            const triggerBefore = probAtLeastK(arrProbsBefore, office.minShips);
            const triggerAfter = probAtLeastK(arrProbsAfter, office.minShips);
            // 折叠到 selfEV — 干扰对手港口办事处收益
            impact.selfEV += (triggerBefore - triggerAfter) * office.reward * 0.3;
        }
    }

    // === 4. 修船厂收益 ===
    const myShipyardInv = state.investments.filter(
        inv => inv.type === 'SHIPYARD_OFFICE' && inv.playerId === myId
    );
    if (myShipyardInv.length > 0 && delta < 0) {
        for (const inv of myShipyardInv) {
            const office = SHIPYARD_OFFICES.find(o => o.id === inv.slotId);
            if (!office) continue;

            const failBefore = state.ships.map(s => {
                if (s.cargo === cargo) return 1 - probBefore;
                return 1 - arrivalProbability(s.position, rollsLeft);
            });
            const failAfter = state.ships.map(s => {
                if (s.cargo === cargo) return 1 - probAfter;
                return 1 - arrivalProbability(s.position, rollsLeft);
            });

            const triggerBefore = probAtLeastK(failBefore, office.minShips);
            const triggerAfter = probAtLeastK(failAfter, office.minShips);
            impact.shipyardBoost += (triggerAfter - triggerBefore) * office.reward;
        }
    }

    // === 8. 股票损害 → 折叠到 selfEV ===
    if (delta < 0) {
        const opponents = state.players.filter(p => p.id !== myId);
        for (const opp of opponents) {
            const holding = opp.stocks.find(s => s.cargo === cargo);
            if (holding && holding.quantity > 0) {
                const actualIncrease = getStockPriceIncrease(state.stockPrices[cargo]);
                const priceDelta = -probDelta * actualIncrease;
                // 折叠到 selfEV — 对手股票贬值等效于我的收益
                impact.selfEV += priceDelta * holding.quantity * 0.3;
            }
        }
    }

    return impact;
}


/**
 * 预测船只最终船员数 — 综合判断:
 * 1. 对手剩余投资行动次数
 * 2. 每个空座的对手 EV（是否值得上船）
 * 3. 可选投资槽位总数（对手有多少选择）
 * 初始时偏向坐满，后期根据实际剩余情况调整
 */
function estimateFinalCrew(
    state: GameState, cargo: CargoType,
    myNewCrew: number, arrivalProb: number, myId: string
): number {
    const shipConfig = SHIPS[cargo];
    const totalSeats = shipConfig.seats;
    if (myNewCrew >= totalSeats) return myNewCrew;

    // 1. 剩余对手投资行动数
    const investStepsLeft = state.roundSteps
        .slice(state.currentStepIndex)
        .filter(s => s.type === 'INVEST').length;
    const playersCount = state.players.length;
    const actedThisStep = state.investTurnIndex ?? 0;
    const opponentActionsLeft = Math.max(0,
        investStepsLeft * (playersCount - 1) - actedThisStep
    );

    // 2. 统计可用槽位
    const availableSlots = countAvailableSlots(state);
    const remainingSeats = totalSeats - myNewCrew;

    // 3. 逐座预测：对手是否会上这个座位
    // 核心思想：对手是理性的，会优先选 EV > 0 的座位
    // 初始时（行动多）→ 接近坐满，后期（行动少）→ 按比例
    let expectedAdditional = 0;
    for (let seatIdx = myNewCrew; seatIdx < totalSeats; seatIdx++) {
        const seatCost = shipConfig.costs[seatIdx];
        const crewAtThatPoint = seatIdx + 1;
        const perPersonReward = shipConfig.totalReward / crewAtThatPoint;
        const opponentEV = arrivalProb * perPersonReward - seatCost;

        if (opponentEV > 0) {
            // 正 EV 座位 — 对手会想上
            // 行动覆盖率：剩余行动够不够分配到这个座位
            // opponentActionsLeft 个行动分配到 availableSlots 个槽位
            // 每个行动选到本船的概率 ≈ remainingSeats / availableSlots
            // 至少 1 个行动选中此座 = 1 - (1 - p)^n
            const perActionProb = remainingSeats / Math.max(1, availableSlots);
            const nonePickThis = Math.pow(1 - perActionProb, opponentActionsLeft);
            const someonePicks = 1 - nonePickThis;

            // 用 EV 吸引力加权：EV 越高越可能被优先选
            const evBoost = Math.min(1.0, 0.5 + opponentEV * 0.05);
            expectedAdditional += someonePicks * evBoost;
        } else {
            // 负 EV — 很少有人会选，但不是零
            expectedAdditional += 0.05;
        }
    }

    const predicted = myNewCrew + expectedAdditional;
    return Math.min(totalSeats, Math.max(myNewCrew, predicted));
}

/** 统计当前可用的（未被占的）投资槽位数 */
function countAvailableSlots(state: GameState): number {
    const takenSlots = new Set(state.investments.map(inv => inv.slotId));
    let count = 0;

    for (const ship of state.ships) {
        const config = SHIPS[ship.cargo];
        for (let i = 0; i < config.seats; i++) {
            if (!takenSlots.has(`crew-${ship.cargo}-${i}`)) count++;
        }
    }

    for (const office of HARBOR_OFFICES) {
        if (!takenSlots.has(office.id)) count++;
    }
    for (const office of SHIPYARD_OFFICES) {
        if (!takenSlots.has(office.id)) count++;
    }

    if (!takenSlots.has('navigator-big')) count++;
    if (!takenSlots.has('navigator-small')) count++;
    if (!takenSlots.has('pirate-captain')) count++;
    if (!takenSlots.has('pirate-crew')) count++;
    if (!takenSlots.has('insurance')) count++;

    return count;
}

function calcCashPressureValue(state: GameState, cost: number, myId: string): number {
    const myPlayer = state.players.find(p => p.id === myId)!;
    const opponents = state.players.filter(p => p.id !== myId);

    const myRemaining = myPlayer.cash - cost;
    const avgOppCash = opponents.reduce((s, p) => s + p.cash, 0) / opponents.length;

    // 如果花钱后仍比对手有钱 → 正向；如果变穷 → 负向
    if (myRemaining > avgOppCash * 1.2) return 1;
    if (myRemaining < avgOppCash * 0.5) return -2;
    return 0;
}
