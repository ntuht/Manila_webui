/**
 * MobileInfoBar — Phase-aware compact info strip for mobile.
 * Shows the most relevant info for the current phase so players
 * never need to scroll away from the action area.
 * Only rendered on screens < lg (1024px).
 */

import React from 'react';
import { useGameStore } from '../../stores';

const CARGO_NAMES: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_DOT: Record<string, string> = {
    JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};

export const MobileInfoBar: React.FC = () => {
    const { gameState, getEngineState } = useGameStore();
    const engineState = getEngineState();

    if (!gameState || !engineState) return null;

    const humanPlayer = engineState.players.find((p: any) => !p.isAI);
    if (!humanPlayer) return null;

    const phase = gameState.phase;
    const auctionState = engineState.auctionState;

    return (
        <div className="lg:hidden">
            {/* 始终显示: 玩家现金 + 股票概要 */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px]" style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}>
                <span className="font-medium t-text">👤 {humanPlayer.name}</span>
                <span className="text-gold-400 font-bold">💰{humanPlayer.cash}</span>

                {/* 股票持仓概要 */}
                {humanPlayer.stocks && (
                    <div className="flex items-center gap-1 ml-auto">
                        {humanPlayer.stocks
                            .filter((s: any) => s.quantity > 0)
                            .map((s: any) => {
                                const cargo = s.cargoType || s.cargo;
                                return (
                                    <span key={cargo} className="flex items-center gap-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${CARGO_DOT[cargo]}`} />
                                        <span className="t-text-2">{s.quantity}</span>
                                    </span>
                                );
                            })}
                    </div>
                )}

                {/* 阶段特有信息 */}
                {phase === 'AUCTION' && auctionState && (
                    <span className="text-ocean-400 ml-auto">
                        🏆 最高 {auctionState.highestBid || 0}
                    </span>
                )}
            </div>

            {/* 投资阶段: 股价一行 */}
            {phase === 'INVESTMENT' && (
                <div className="flex items-center justify-between gap-1 mt-1 px-2 py-1 rounded-lg text-[9px]" style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}>
                    <span className="t-text-3 font-medium">📊</span>
                    {Object.entries(gameState.stockPrices).map(([cargo, price]) => (
                        <span key={cargo} className="flex items-center gap-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${CARGO_DOT[cargo]}`} />
                            <span className="t-text-2">{CARGO_NAMES[cargo]}</span>
                            <span className="text-gold-400 font-medium">{price as number}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
