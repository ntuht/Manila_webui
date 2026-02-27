import React from 'react';
import { PlayerToken } from '../Shared/PlayerToken';
import type { PlayerColor } from '../../types/uiTypes';
import type { UICrewMember } from '../../types/uiTypes';
import type { CargoType } from '@manila/engine';
import { SHIPS } from '@manila/engine';

interface ShipVisualProps {
    cargo: string;
    crew: UICrewMember[];
    playerColors: Record<string, PlayerColor>;
    isDocked?: boolean;
    /** Investment slot data for interactive mode */
    seatInvestments?: { slotId: string; playerId: string }[];
    selectableSlotIds?: Set<string>;
    isInvestPhase?: boolean;
    currentPlayerCash?: number;
    onSeatClick?: (slotId: string, label: string, cost: number, event: React.MouseEvent) => void;
}

const CARGO_SHIP_COLORS: Record<string, { hull: string; deck: string; bow: string }> = {
    JADE: { hull: '#065f46', deck: '#059669', bow: '#10b981' },
    SILK: { hull: '#3730a3', deck: '#4f46e5', bow: '#6366f1' },
    GINSENG: { hull: '#78350f', deck: '#b45309', bow: '#f59e0b' },
    NUTMEG: { hull: '#4c1d95', deck: '#6d28d9', bow: '#8b5cf6' },
};

const CARGO_NAMES: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

/**
 * CSS-drawn ship: rectangular hull divided into seat cells,
 * with a triangular bow on the right.
 * Seats are clickable during invest phase.
 */
export const ShipVisual: React.FC<ShipVisualProps> = ({
    cargo,
    crew,
    playerColors,
    isDocked,
    seatInvestments,
    selectableSlotIds,
    isInvestPhase,
    currentPlayerCash,
    onSeatClick,
}) => {
    const shipConfig = SHIPS[cargo as CargoType];
    const seatCount = shipConfig?.seats ?? 3;
    const costs = shipConfig?.costs ?? [3, 4, 5];
    const colors = CARGO_SHIP_COLORS[cargo] ?? CARGO_SHIP_COLORS.JADE;
    const cargoName = CARGO_NAMES[cargo] || cargo;

    // Build seat data: index 0 = cheapest seat, reversed so seat 0 nearest bow
    const seatData = Array.from({ length: seatCount }, (_, i) => {
        const slotId = `crew-${cargo}-${i}`;
        const member = crew.find(c => c.seatNumber === i + 1);
        const inv = seatInvestments?.find(si => si.slotId === slotId);
        const cost = costs[i] ?? 3;
        const isSelectable = selectableSlotIds?.has(slotId) ?? false;
        // If engine says selectable, it's affordable (handles bankruptcy: cost=0)
        const isAffordable = isSelectable || (currentPlayerCash ?? 0) >= cost;
        return { slotId, member, inv, cost, isSelectable, isAffordable };
    }).reverse();

    const cellWidth = 36;
    const cellHeight = 34;

    return (
        <div
            className="inline-flex items-center shrink-0"
            title={`${cargoName}号 — ${crew.length}/${seatCount} 已占`}
        >
            {/* Ship hull with seats */}
            <div
                className="flex items-stretch rounded-l-md overflow-hidden"
                style={{
                    background: colors.hull,
                    border: `2px solid ${colors.deck}`,
                    borderRight: 'none',
                    height: cellHeight,
                }}
            >
                {seatData.map((seat, idx) => {
                    const isLast = idx === seatCount - 1;
                    const isOccupied = !!seat.member || !!seat.inv;
                    const canClick = isInvestPhase && seat.isSelectable && seat.isAffordable && !isOccupied && !!onSeatClick;

                    // Occupied: show player token
                    if (isOccupied) {
                        const playerId = seat.member?.playerId ?? seat.inv?.playerId ?? '';
                        const playerName = seat.member?.playerName ?? '';
                        return (
                            <div
                                key={idx}
                                className="flex items-center justify-center"
                                style={{
                                    width: cellWidth,
                                    height: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRight: isLast ? 'none' : `1px dashed ${colors.bow}50`,
                                }}
                            >
                                <PlayerToken
                                    color={playerColors[playerId] ?? 'red'}
                                    size="sm"
                                    label={playerName?.charAt(0)}
                                />
                            </div>
                        );
                    }

                    // Empty seat: clickable if selectable
                    return (
                        <button
                            key={idx}
                            className={[
                                'flex flex-col items-center justify-center transition-all duration-200',
                                canClick ? 'cursor-pointer hover:brightness-150' : 'cursor-default',
                            ].join(' ')}
                            style={{
                                width: cellWidth,
                                height: '100%',
                                background: canClick ? 'rgba(255,255,255,0.08)' : 'transparent',
                                borderRight: isLast ? 'none' : `1px dashed ${colors.bow}50`,
                                border: 'none',
                                borderRightStyle: isLast ? 'none' : 'dashed',
                                borderRightWidth: isLast ? 0 : 1,
                                borderRightColor: isLast ? 'transparent' : `${colors.bow}50`,
                                opacity: isInvestPhase && !seat.isAffordable ? 0.3 : 1,
                            }}
                            disabled={!canClick}
                            onClick={canClick ? (e) => onSeatClick!(seat.slotId, `${cargoName}船员${seatCount - idx}`, seat.cost, e) : undefined}
                            title={`${seat.cost}元`}
                        >
                            {canClick ? (
                                <span className="text-[9px] font-bold text-gold-400 animate-pulse">{seat.cost}</span>
                            ) : (
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ border: `1px dashed ${colors.bow}60` }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bow — triangle */}
            <div
                style={{
                    width: 0,
                    height: 0,
                    borderTop: `${cellHeight / 2}px solid transparent`,
                    borderBottom: `${cellHeight / 2}px solid transparent`,
                    borderLeft: `12px solid ${colors.deck}`,
                }}
            />

            {/* Dock flag */}
            {isDocked && (
                <span className="ml-1 text-[10px]">🏁</span>
            )}
        </div>
    );
};
