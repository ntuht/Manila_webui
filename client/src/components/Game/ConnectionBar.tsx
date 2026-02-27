/**
 * ConnectionBar — Multiplayer status bar shown during in-game play
 *
 * Shows room code, player connection status, and whose turn it is.
 * Only rendered when isMultiplayer === true.
 */

import React from 'react';
import { useMultiplayerStore } from '../../stores/multiplayerStore';
import { useGameStore } from '../../stores';

const COLOR_DOT: Record<string, string> = {
    red: 'bg-red-400',
    blue: 'bg-blue-400',
    green: 'bg-emerald-400',
    yellow: 'bg-amber-400',
    purple: 'bg-violet-400',
    orange: 'bg-orange-400',
};

export const ConnectionBar: React.FC = () => {
    const { isMultiplayer, roomCode, roomState, connectionStatus } = useMultiplayerStore();
    const { getEngineState } = useGameStore();
    const engineState = getEngineState();

    if (!isMultiplayer || !roomState) return null;

    const pendingPlayerId = engineState?.pendingAction?.playerId;
    const pendingPlayerName = engineState?.players?.find(
        (p: { id: string }) => p.id === pendingPlayerId
    )?.name;

    return (
        <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[11px] mb-2"
            style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
        >
            {/* Room code */}
            <span className="font-mono font-bold text-gold-400 tracking-widest">
                🌐 {roomCode}
            </span>

            <span className="text-white/10">|</span>

            {/* Player status dots */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {roomState.players.map((player) => {
                    const isCurrentTurn = engineState?.players?.find(
                        (ep: { id: string; name: string }) => ep.name === player.name
                    )?.id === pendingPlayerId;

                    return (
                        <div
                            key={player.peerId}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isCurrentTurn ? 'bg-white/10 ring-1 ring-gold-400/30' : ''
                                }`}
                            title={player.isConnected ? '已连接' : '已断开'}
                        >
                            {/* Connection indicator */}
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${player.isConnected ? 'bg-emerald-400' : 'bg-red-500'
                                    }`}
                            />
                            {/* Color dot */}
                            <span className={`w-2 h-2 rounded-full ${COLOR_DOT[player.color] || 'bg-slate-400'}`} />
                            <span className={`truncate max-w-[60px] ${isCurrentTurn ? 'text-gold-400 font-semibold' : 't-text-3'}`}>
                                {player.name}
                            </span>
                            {player.isHost && <span className="text-[8px] text-amber-400/60">👑</span>}
                        </div>
                    );
                })}

                {/* AI players */}
                {roomState.aiSlots.map((ai, i) => (
                    <div key={`ai-${i}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded opacity-50">
                        <span className="text-[9px]">🤖</span>
                        <span className="t-text-m truncate max-w-[50px]">{ai.name}</span>
                    </div>
                ))}
            </div>

            {/* Turn indicator */}
            {pendingPlayerName && (
                <span className="t-text-3 whitespace-nowrap">
                    ⏳ <span className="text-gold-400">{pendingPlayerName}</span>
                </span>
            )}

            {/* Connection status */}
            {connectionStatus !== 'connected' && (
                <span className="text-red-400 animate-pulse">⚠ {connectionStatus === 'connecting' ? '连接中' : '已断开'}</span>
            )}
        </div>
    );
};
