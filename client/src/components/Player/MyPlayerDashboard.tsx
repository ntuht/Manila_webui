/**
 * MyPlayerDashboard — Left sidebar: human player's detailed dashboard
 * + compact opponent list below.
 */

import React from 'react';
import { useGameStore } from '../../stores';

const CARGO_NAMES: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_TEXT: Record<string, string> = {
    JADE: 'text-emerald-400', SILK: 'text-indigo-400', GINSENG: 'text-amber-400', NUTMEG: 'text-violet-400',
};
const CARGO_DOT: Record<string, string> = {
    JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};

export const MyPlayerDashboard: React.FC = () => {
    const { gameState, getEngineState } = useGameStore();
    const engineState = getEngineState();

    if (!gameState || !engineState) return null;

    const humanPlayer = engineState.players.find((p: { isAI: boolean }) => !p.isAI);
    const aiPlayers = engineState.players.filter((p: { isAI: boolean }) => p.isAI);

    if (!humanPlayer) return null;

    const pendingPlayerId = engineState.pendingAction?.playerId;
    const isMyTurn = pendingPlayerId === humanPlayer.id;

    return (
        <div className="space-y-3">
            {/* 我的信息 */}
            <div className={`card transition-all duration-300 ${isMyTurn ? 'ring-1 ring-gold-400/30 shadow-glow-gold' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-base">👤</span>
                        <span className="text-sm font-semibold t-text">{humanPlayer.name}</span>
                    </div>
                    {isMyTurn && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold-400/15 text-gold-400 font-medium animate-pulse">
                            你的回合
                        </span>
                    )}
                </div>

                {/* 现金 */}
                <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-[10px] t-text-3">💰</span>
                    <span className="text-2xl font-bold text-gold-400 font-display">{humanPlayer.cash}</span>
                    <span className="text-[10px] t-text-m">元</span>
                </div>

                {/* 股票持仓 */}
                {humanPlayer.stocks && humanPlayer.stocks.length > 0 && (
                    <div className="mb-3">
                        <h4 className="text-[10px] t-text-3 mb-1.5">持仓</h4>
                        <div className="grid grid-cols-2 gap-1">
                            {humanPlayer.stocks
                                .filter((s: { quantity: number }) => s.quantity > 0)
                                .map((stock: any) => {
                                    const cargo = stock.cargoType || stock.cargo;
                                    return (
                                        <div key={cargo} className="flex items-center gap-1.5 rounded px-2 py-1" style={{ background: 'var(--color-input-bg)' }}>
                                            <div className={`w-2 h-2 rounded-full ${CARGO_DOT[cargo] || 'bg-slate-500'}`} />
                                            <span className={`text-[10px] ${CARGO_TEXT[cargo] || 't-text-3'}`}>
                                                {CARGO_NAMES[cargo] || cargo}
                                            </span>
                                            <span className="text-[10px] t-text-2 ml-auto">{stock.quantity}</span>
                                            {(stock.mortgagedCount > 0 || stock.mortgaged > 0) && (
                                                <span className="text-[9px] text-red-400">({stock.mortgagedCount || stock.mortgaged}抵)</span>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* 已投资的槽位 */}
                {humanPlayer.investments && humanPlayer.investments.length > 0 && (
                    <div>
                        <h4 className="text-[10px] t-text-3 mb-1">已投资</h4>
                        <div className="flex flex-wrap gap-1">
                            {humanPlayer.investments.map((inv: { slotId: string }, i: number) => (
                                <span key={i} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                                    {inv.slotId}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 对手列表 (紧凑) */}
            <div className="card">
                <h3 className="text-[10px] t-text-3 mb-2">对手</h3>
                <div className="space-y-1.5">
                    {aiPlayers.map((player: any) => {
                        const isTheirTurn = pendingPlayerId === player.id;
                        const stockCount = player.stocks
                            ? player.stocks.reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0)
                            : 0;
                        return (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${isTheirTurn ? 'bg-ocean-500/8 border border-ocean-500/15' : ''
                                    }`}
                                style={!isTheirTurn ? { background: 'var(--color-input-bg)' } : undefined}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px]">🤖</span>
                                    <span className="text-xs t-text-2">{player.name}</span>
                                    {isTheirTurn && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 animate-pulse" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gold-400">💰{player.cash}</span>
                                    {stockCount > 0 && (
                                        <span className="text-[10px] t-text-3">📊{stockCount}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
