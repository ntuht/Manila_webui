/**
 * MobileSlotBar — Horizontal scrollable pill bar for non-crew investment slots.
 * Shown only on mobile (< lg). Crew slots are handled via ShipVisual seats.
 */

import React from 'react';
import { PlayerToken } from '../Shared/PlayerToken';
import type { PlayerColor } from '../../types/uiTypes';
import {
    HARBOR_OFFICES,
    SHIPYARD_OFFICES,
    NAVIGATOR_BIG_COST,
    NAVIGATOR_SMALL_COST,
    PIRATE_CAPTAIN_COST,
    PIRATE_CREW_COST,
    INSURANCE_COST,
} from '@manila/engine';

interface SlotDef {
    slotId: string;
    label: string;
    icon: string;
    cost: number;
}

const ALL_SLOTS: SlotDef[] = [
    ...HARBOR_OFFICES.map(o => ({
        slotId: o.id,
        label: `港口${o.id.split('-')[1].toUpperCase()}`,
        icon: '🏠',
        cost: o.cost,
    })),
    { slotId: 'navigator-big', label: '大领航', icon: '🧭', cost: NAVIGATOR_BIG_COST },
    { slotId: 'navigator-small', label: '小领航', icon: '🧭', cost: NAVIGATOR_SMALL_COST },
    { slotId: 'pirate-captain', label: '船长', icon: '☠️', cost: PIRATE_CAPTAIN_COST },
    { slotId: 'pirate-crew', label: '船员', icon: '☠️', cost: PIRATE_CREW_COST },
    ...SHIPYARD_OFFICES.map(o => ({
        slotId: o.id,
        label: `修船厂${o.id.split('-')[1].toUpperCase()}`,
        icon: '🔧',
        cost: o.cost,
    })),
    { slotId: 'insurance', label: '保险', icon: '🛡️', cost: INSURANCE_COST },
];

interface MobileSlotBarProps {
    selectableSlotIds: Set<string>;
    slotCostMap: Map<string, number>;
    investmentMap: Map<string, { playerId: string }>;
    playerColorMap: Record<string, PlayerColor>;
    playerNameMap: Record<string, string>;
    isInvestPhase: boolean;
    currentPlayerCash: number;
    onSlotClick: (slotId: string, label: string, cost: number, event: React.MouseEvent) => void;
}

export const MobileSlotBar: React.FC<MobileSlotBarProps> = ({
    selectableSlotIds,
    slotCostMap,
    investmentMap,
    playerColorMap,
    playerNameMap,
    isInvestPhase,
    currentPlayerCash,
    onSlotClick,
}) => {
    if (!isInvestPhase) return null;

    return (
        <div className="lg:hidden">
            <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-thin"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {ALL_SLOTS.map(def => {
                    const inv = investmentMap.get(def.slotId);
                    const isOccupied = !!inv;
                    const isSelectable = selectableSlotIds.has(def.slotId);
                    const effectiveCost = slotCostMap.get(def.slotId) ?? def.cost;
                    const isAffordable = isSelectable || currentPlayerCash >= effectiveCost;

                    return (
                        <button
                            key={def.slotId}
                            className={[
                                'flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] shrink-0 transition-all duration-200',
                                isOccupied
                                    ? 'opacity-50'
                                    : isSelectable && isAffordable
                                        ? 'ring-1 ring-gold-400/60 shadow-sm shadow-gold-400/20'
                                        : '',
                            ].join(' ')}
                            style={{
                                background: isOccupied
                                    ? 'var(--color-input-bg)'
                                    : isSelectable
                                        ? 'rgba(251, 191, 36, 0.08)'
                                        : 'var(--color-card-bg)',
                                border: '1px solid var(--color-card-border)',
                                opacity: !isOccupied && !isAffordable ? 0.3 : undefined,
                            }}
                            disabled={!isSelectable || isOccupied || !isAffordable}
                            onClick={(e) => isSelectable && !isOccupied && onSlotClick(def.slotId, def.label, effectiveCost, e)}
                        >
                            {isOccupied ? (
                                <>
                                    <PlayerToken
                                        color={playerColorMap[inv!.playerId] ?? 'red'}
                                        size="sm"
                                        label={playerNameMap[inv!.playerId]?.charAt(0)}
                                    />
                                    <span className="t-text-3">{def.label}</span>
                                </>
                            ) : (
                                <>
                                    <span>{def.icon}</span>
                                    <span className="t-text font-medium">{def.label}</span>
                                    {effectiveCost > 0 && (
                                        <span className="text-gold-400 font-bold">{effectiveCost}</span>
                                    )}
                                    {effectiveCost === 0 && def.slotId !== 'insurance' && (
                                        <span className="text-emerald-400 font-bold">免费</span>
                                    )}
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
