/**
 * ActionBanner — Prominent action area at the top of the center column.
 *
 * Shows phase-appropriate controls with a colored banner.
 * Human turn → shows buttons. AI turn → animated waiting.
 */

import React from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import { NavigatorPanel } from './NavigatorPanel';

const CARGO_CN: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

const SLOT_CN: Record<string, string> = {
    'pirate-captain': '海盗船长', 'pirate-crew': '海盗船员',
    'navigator-big': '大领航员', 'navigator-small': '小领航员',
    'harbor-A': '港口A', 'harbor-B': '港口B', 'harbor-C': '港口C',
    'shipyard-A': '修船厂A', 'shipyard-B': '修船厂B', 'shipyard-C': '修船厂C',
    'insurance': '保险',
};

function slotName(slotId: string): string {
    if (SLOT_CN[slotId]) return SLOT_CN[slotId];
    const m = slotId.match(/^crew-(\w+)-(\d+)$/);
    if (m) return `${CARGO_CN[m[1].toUpperCase()] || m[1]}船员${parseInt(m[2]) + 1}`;
    return slotId;
}

interface PhaseStyle {
    bg: string;
    border: string;
    accent: string;
    icon: string;
    label: string;
}

const PHASE_STYLES: Record<string, PhaseStyle> = {
    AUCTION: { bg: 'bg-ocean-500/8', border: 'border-ocean-500/20', accent: 'text-ocean-400', icon: '⚡', label: '拍卖阶段' },
    HARBOR_MASTER: { bg: 'bg-indigo-500/8', border: 'border-indigo-500/20', accent: 'text-indigo-400', icon: '🎯', label: '港务长行动' },
    INVESTMENT: { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', accent: 'text-emerald-400', icon: '💰', label: '投资阶段' },
    SAILING: { bg: 'bg-violet-500/8', border: 'border-violet-500/20', accent: 'text-violet-400', icon: '⛵', label: '航行阶段' },
    SETTLEMENT: { bg: 'bg-amber-500/8', border: 'border-amber-500/20', accent: 'text-amber-400', icon: '📊', label: '结算阶段' },
    GAME_END: { bg: 'bg-gold-400/8', border: 'border-gold-400/20', accent: 'text-gold-400', icon: '🏆', label: '游戏结束' },
};

export const ActionBanner: React.FC = () => {
    const { currentPhase, gameState, rollDice, selectInvestment, nextPhase, getEngineState } = useGameStore();
    const engineState = getEngineState();
    const pendingAction = engineState?.pendingAction;
    const pendingPlayer = engineState?.players.find(p => p.id === pendingAction?.playerId);
    const isHumanTurn = pendingPlayer && !pendingPlayer.isAI;
    const isAITurn = pendingPlayer?.isAI;

    const style = PHASE_STYLES[currentPhase] || PHASE_STYLES.AUCTION;

    if (!gameState || !engineState) {
        return null;
    }

    // AI turn — show waiting animation
    if (isAITurn && currentPhase !== 'SETTLEMENT' && currentPhase !== 'GAME_END') {
        return (
            <div className={`rounded-xl p-4 ${style.bg} border ${style.border} transition-colors duration-300`}>
                <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm t-text-2">
                        🤖 <strong>{pendingPlayer?.name}</strong> 正在思考...
                    </span>
                </div>
                <p className="text-[10px] t-text-m text-center mt-1">
                    {pendingAction?.message || pendingAction?.actionType}
                </p>
            </div>
        );
    }

    // Render phase-specific actions
    const renderActions = () => {
        switch (currentPhase) {
            case 'AUCTION':
                return (
                    <p className="text-xs t-text-2 text-center">在下方拍卖面板中出价或放弃竞拍</p>
                );

            case 'HARBOR_MASTER':
                return (
                    <p className="text-xs t-text-2 text-center">在港务长向导中完成操作</p>
                );

            case 'INVESTMENT':
                if (!isHumanTurn) {
                    return <p className="text-xs t-text-3 text-center">等待 AI 投资...</p>;
                }
                return <InvestmentActions pendingAction={pendingAction} pendingPlayer={pendingPlayer} selectInvestment={selectInvestment} />;

            case 'SAILING':
                if (!pendingAction) {
                    return <p className="text-xs text-slate-500 text-center">航行中...</p>;
                }

                if (pendingAction.actionType === 'ROLL_DICE') {
                    return (
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-xs text-slate-400">
                                第 {(engineState.currentRollIndex || 0) + 1} 次骰子
                            </span>
                            <Button onClick={() => { const r = rollDice(); if (!r.success) alert(r.error); }} size="sm">
                                🎲 投掷骰子
                            </Button>
                        </div>
                    );
                }

                if (pendingAction.actionType === 'USE_NAVIGATOR' || pendingAction.actionType === 'SKIP_NAVIGATOR') {
                    return <NavigatorPanel pendingAction={pendingAction} />;
                }

                if (pendingAction.actionType === 'PIRATE_BOARD') {
                    return (
                        <div className="space-y-2">
                            <p className="text-xs text-amber-400 text-center font-medium">☠️ 海盗上船决策</p>
                            <p className="text-[10px] text-slate-500 text-center">{pendingAction.message}</p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {pendingAction.validActions.map((action, idx) => {
                                    let label = '';
                                    if (action.type === 'PIRATE_BOARD') {
                                        label = `⚓ 上船: ${String(action.data.cargo)}`;
                                    } else if (action.type === 'PIRATE_KICK') {
                                        const kickedName = engineState.players.find(
                                            (p: { id: string }) => p.id === action.data.kickPlayerId
                                        )?.name || action.data.kickPlayerId;
                                        label = `👊 踢掉 ${kickedName}，上 ${String(action.data.cargo)} 船`;
                                    } else if (action.type === 'PIRATE_PASS') {
                                        label = '🚫 放弃上船';
                                    }
                                    return (
                                        <Button
                                            key={idx}
                                            variant={action.type === 'PIRATE_PASS' ? 'ghost' : 'primary'}
                                            size="sm"
                                            onClick={() => useGameStore.getState().dispatchAction(action)}
                                            className="text-xs"
                                        >
                                            {label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                if (pendingAction.actionType === 'PIRATE_HIJACK') {
                    return (
                        <div className="space-y-2">
                            <p className="text-xs text-red-400 text-center font-medium">☠️ 海盗劫船决策</p>
                            <p className="text-[10px] text-slate-500 text-center">{pendingAction.message}</p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {pendingAction.validActions.map((action, idx) => {
                                    const cargo = String(action.data.cargo);
                                    const decision = action.data.decision;
                                    const label = decision === 'dock'
                                        ? `🚢 ${cargo} 送往港口`
                                        : `🔧 ${cargo} 送入修船厂`;
                                    return (
                                        <Button
                                            key={idx}
                                            variant={decision === 'dock' ? 'primary' : 'secondary'}
                                            size="sm"
                                            onClick={() => useGameStore.getState().dispatchAction(action)}
                                            className="text-xs"
                                        >
                                            {label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                return <p className="text-xs text-slate-500 text-center">{pendingAction.message || '等待...'}</p>;

            case 'SETTLEMENT':
                return (
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-xs text-slate-400">结算完成</span>
                        {pendingAction && pendingAction.validActions.length > 0 ? (
                            <Button
                                onClick={() => useGameStore.getState().dispatchAction(pendingAction.validActions[0])}
                                size="sm"
                            >
                                {gameState.round >= gameState.gameConfig.rounds ? '🏁 查看结果' : '➡️ 下一轮'}
                            </Button>
                        ) : (
                            <Button onClick={nextPhase} size="sm">继续</Button>
                        )}
                    </div>
                );

            case 'GAME_END':
                return (
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-xs text-gold-400 font-medium">🏆 游戏结束！</span>
                        <Button onClick={() => useGameStore.getState().endGame()} size="sm">🏠 返回大厅</Button>
                    </div>
                );

            default:
                return <p className="text-xs text-slate-500 text-center">等待游戏开始</p>;
        }
    };

    return (
        <div className={`rounded-xl p-4 ${style.bg} border ${style.border} transition-colors duration-300`}>
            {renderActions()}
        </div>
    );
};

/* ================================================================
   Investment Actions — grouped by category
   ================================================================ */

// Category classification for slot IDs
function getSlotCategory(slotId: string): string {
    if (slotId.startsWith('crew-')) return '🚣 船员';
    if (slotId.startsWith('harbor-')) return '🏠 港口';
    if (slotId.startsWith('shipyard-')) return '🔧 修船厂';
    if (slotId === 'pirate-captain' || slotId === 'pirate-crew') return '☠️ 海盗';
    if (slotId === 'navigator-big' || slotId === 'navigator-small') return '🧭 领航员';
    if (slotId === 'insurance') return '🛡️ 保险';
    return '其他';
}

const CATEGORY_ORDER = ['🚣 船员', '🏠 港口', '🔧 修船厂', '☠️ 海盗', '🧭 领航员', '🛡️ 保险'];

interface InvestmentActionsProps {
    pendingAction: any;
    pendingPlayer: any;
    selectInvestment: (playerId: string, slotId: string) => any;
}

const InvestmentActions: React.FC<InvestmentActionsProps> = ({ pendingAction, pendingPlayer, selectInvestment }) => {
    const { getEngineState } = useGameStore();
    const engineState = getEngineState();

    if (!pendingAction?.validActions) return null;

    const investActions = pendingAction.validActions.filter((a: any) => a.type === 'SELECT_INVESTMENT');
    const mortgageActions = pendingAction.validActions.filter((a: any) => a.type === 'MORTGAGE_STOCK');
    const skipAction = pendingAction.validActions.find((a: any) => a.type === 'SKIP_INVEST');

    // Build map of affordable actions: slotId -> action
    const affordableMap = new Map<string, any>();
    for (const a of investActions) {
        affordableMap.set(String(a.data.slotId), a);
    }

    // Build map of slot occupants from engine's flat investments array
    const slotOccupants = new Map<string, string>();
    if (engineState?.investments) {
        for (const inv of engineState.investments) {
            const playerName = engineState.players?.find((p: any) => p.id === inv.playerId)?.name || inv.playerId;
            slotOccupants.set(inv.slotId, playerName);
        }
    }

    // Build complete slot list with costs
    const FIXED_SLOTS: { id: string; cost: number }[] = [
        { id: 'harbor-A', cost: 5 }, { id: 'harbor-B', cost: 5 }, { id: 'harbor-C', cost: 5 },
        { id: 'shipyard-A', cost: 5 }, { id: 'shipyard-B', cost: 5 }, { id: 'shipyard-C', cost: 5 },
        { id: 'pirate-captain', cost: 5 }, { id: 'pirate-crew', cost: 5 },
        { id: 'navigator-big', cost: 5 }, { id: 'navigator-small', cost: 2 },
        { id: 'insurance', cost: 0 },
    ];

    // Crew slots from ships (engine stores selected cargos as ships)
    const crewSlots: { id: string; cost: number }[] = [];
    const ships = engineState?.ships || [];
    if (ships.length > 0) {
        const CREW_COSTS: Record<string, number[]> = {
            JADE: [2, 3, 4, 5], SILK: [3, 4, 5], GINSENG: [2, 3, 4], NUTMEG: [2, 3, 4],
        };
        for (const ship of ships) {
            const cargo = ship.cargo;
            const costs = CREW_COSTS[cargo] || [3, 4, 5];
            for (let i = 0; i < costs.length; i++) {
                crewSlots.push({ id: `crew-${cargo}-${i}`, cost: costs[i] });
            }
        }
    }

    const allSlots = [...crewSlots, ...FIXED_SLOTS];

    // Classify each slot
    type SlotState = 'affordable' | 'unaffordable' | 'occupied';
    const classifiedSlots = allSlots.map(slot => {
        const action = affordableMap.get(slot.id);
        const occupant = slotOccupants.get(slot.id);
        let state: SlotState;
        let actualCost = action ? Number(action.data.cost) : slot.cost;

        if (occupant) {
            state = 'occupied';
        } else if (action) {
            state = 'affordable';
            actualCost = Number(action.data.cost);
        } else {
            state = 'unaffordable';
        }

        return { ...slot, state, actualCost, occupant, action };
    });

    // Group by category
    const groups = new Map<string, typeof classifiedSlots>();
    for (const slot of classifiedSlots) {
        const cat = getSlotCategory(slot.id);
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat)!.push(slot);
    }

    const sortedGroups = [...groups.entries()].sort(
        (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
    );

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-xs t-text-2 font-medium">选择投资槽位</p>
                <span className="text-xs text-gold-400 font-medium">💰 {pendingPlayer?.cash}</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[9px] t-text-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ocean-500/30" /> 可投资</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/30" /> 资金不足</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/20" /> 已占据</span>
            </div>

            {/* Grouped slots — responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {sortedGroups.map(([category, slots]) => (
                    <div key={category} className="rounded-lg p-2" style={{ background: 'var(--color-input-bg)' }}>
                        <div className="text-[9px] t-text-3 mb-1.5 font-medium">{category}</div>
                        <div className="flex flex-wrap gap-1">
                            {slots.map((slot, idx) => {
                                if (slot.state === 'affordable') {
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => selectInvestment(pendingAction.playerId, slot.id)}
                                            className="px-2 py-1 rounded-md text-[11px] font-semibold border border-ocean-500/30 bg-ocean-500/10 text-ocean-400 hover:bg-ocean-500/20 transition-colors cursor-pointer"
                                        >
                                            {slotName(slot.id)} <span className="text-gold-400 ml-0.5">💰{slot.actualCost}</span>
                                        </button>
                                    );
                                }
                                if (slot.state === 'unaffordable') {
                                    return (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 rounded-md text-[11px] border border-amber-500/20 bg-amber-500/5 text-amber-400/60 cursor-not-allowed"
                                            title={`需要 ${slot.actualCost} 元 — 可抵押股票后购买`}
                                        >
                                            {slotName(slot.id)} <span className="opacity-60">💰{slot.actualCost}</span>
                                        </span>
                                    );
                                }
                                // occupied
                                return (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 rounded-md text-[11px] border border-red-500/15 bg-red-500/5 t-text-m line-through cursor-not-allowed"
                                        title={`已被 ${slot.occupant} 占据`}
                                    >
                                        🔒 {slotName(slot.id)} <span className="text-[9px] no-underline">({slot.occupant})</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary actions: mortgage + skip */}
            {(mortgageActions.length > 0 || skipAction) && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5" style={{ borderTop: '1px solid var(--color-card-border)' }}>
                    {mortgageActions.map((action: any, idx: number) => (
                        <Button
                            key={`m-${idx}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => useGameStore.getState().dispatchAction(action)}
                            className="text-xs text-amber-400"
                        >
                            📜 抵押 {CARGO_CN[String(action.data.cargo)] || String(action.data.cargo)} (+12💰)
                        </Button>
                    ))}
                    {skipAction && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => useGameStore.getState().dispatchAction(skipAction)}
                            className="text-xs ml-auto"
                        >
                            ⏭️ 跳过投资
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
