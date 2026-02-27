/**
 * MobileSlotBar — Multi-row grid of investment slots for mobile.
 * Grouped by category with color backgrounds. No horizontal scroll.
 * Only shown on mobile (< lg) during INVEST phase.
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

interface SlotGroup {
    title: string;
    icon: string;
    bgColor: string;       // background tint
    borderColor: string;    // subtle border
    slots: SlotDef[];
}

const SLOT_GROUPS: SlotGroup[] = [
    {
        title: '港口',
        icon: '🏠',
        bgColor: 'rgba(16, 185, 129, 0.06)',
        borderColor: 'rgba(16, 185, 129, 0.15)',
        slots: HARBOR_OFFICES.map(o => ({
            slotId: o.id,
            label: o.id.split('-')[1].toUpperCase(),
            icon: '🏠',
            cost: o.cost,
        })),
    },
    {
        title: '修船厂',
        icon: '🔧',
        bgColor: 'rgba(245, 158, 11, 0.06)',
        borderColor: 'rgba(245, 158, 11, 0.15)',
        slots: SHIPYARD_OFFICES.map(o => ({
            slotId: o.id,
            label: o.id.split('-')[1].toUpperCase(),
            icon: '🔧',
            cost: o.cost,
        })),
    },
    {
        title: '海盗',
        icon: '☠️',
        bgColor: 'rgba(239, 68, 68, 0.06)',
        borderColor: 'rgba(239, 68, 68, 0.15)',
        slots: [
            { slotId: 'pirate-captain', label: '船长', icon: '☠️', cost: PIRATE_CAPTAIN_COST },
            { slotId: 'pirate-crew', label: '船员', icon: '☠️', cost: PIRATE_CREW_COST },
        ],
    },
    {
        title: '领航员',
        icon: '🧭',
        bgColor: 'rgba(99, 102, 241, 0.06)',
        borderColor: 'rgba(99, 102, 241, 0.15)',
        slots: [
            { slotId: 'navigator-big', label: '大', icon: '🧭', cost: NAVIGATOR_BIG_COST },
            { slotId: 'navigator-small', label: '小', icon: '🧭', cost: NAVIGATOR_SMALL_COST },
        ],
    },
    {
        title: '保险',
        icon: '🛡️',
        bgColor: 'rgba(14, 165, 233, 0.06)',
        borderColor: 'rgba(14, 165, 233, 0.15)',
        slots: [
            { slotId: 'insurance', label: '保险', icon: '🛡️', cost: INSURANCE_COST },
        ],
    },
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
        <div className="lg:hidden space-y-1.5">
            {SLOT_GROUPS.map(group => (
                <div
                    key={group.title}
                    className="rounded-lg px-2 py-1.5"
                    style={{ background: group.bgColor, border: `1px solid ${group.borderColor}` }}
                >
                    {/* Group header */}
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px]">{group.icon}</span>
                        <span className="text-[10px] t-text-3 font-medium">{group.title}</span>
                    </div>
                    {/* Slot pills in a flex-wrap row */}
                    <div className="flex flex-wrap gap-1.5">
                        {group.slots.map(def => {
                            const inv = investmentMap.get(def.slotId);
                            const isOccupied = !!inv;
                            const isSelectable = selectableSlotIds.has(def.slotId);
                            const effectiveCost = slotCostMap.get(def.slotId) ?? def.cost;
                            const isAffordable = isSelectable || currentPlayerCash >= effectiveCost;

                            return (
                                <button
                                    key={def.slotId}
                                    className={[
                                        'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] transition-all duration-200',
                                        isSelectable && !isOccupied && isAffordable
                                            ? 'ring-1 ring-gold-400/60 shadow-sm shadow-gold-400/20'
                                            : '',
                                    ].join(' ')}
                                    style={{
                                        background: isOccupied
                                            ? 'var(--color-input-bg)'
                                            : 'var(--color-card-bg)',
                                        border: '1px solid var(--color-card-border)',
                                        opacity: isOccupied ? 0.5 : (!isAffordable ? 0.3 : 1),
                                    }}
                                    disabled={!isSelectable || isOccupied || !isAffordable}
                                    onClick={(e) => isSelectable && !isOccupied && onSlotClick(def.slotId, `${group.title}${def.label}`, effectiveCost, e)}
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
                                            <span className="t-text font-medium">{def.label}</span>
                                            {effectiveCost > 0 ? (
                                                <span className="text-gold-400 font-bold">💰{effectiveCost}</span>
                                            ) : (
                                                <span className="text-emerald-400 font-bold text-[10px]">免费</span>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
