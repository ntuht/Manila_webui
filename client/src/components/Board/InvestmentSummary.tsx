/**
 * InvestmentSummary — Right sidebar: read-only overview of all investment slots.
 * Shows which slots are occupied and by whom.
 */

import React from 'react';
import { useGameStore } from '../../stores';

const CARGO_NAMES: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

interface SlotInfo {
    id: string;
    label: string;
    group: string;
}

const ALL_SLOTS: SlotInfo[] = [
    { id: 'harbor-A', label: '港口A', group: '港口' },
    { id: 'harbor-B', label: '港口B', group: '港口' },
    { id: 'harbor-C', label: '港口C', group: '港口' },
    { id: 'shipyard-A', label: '修船厂A', group: '修船厂' },
    { id: 'shipyard-B', label: '修船厂B', group: '修船厂' },
    { id: 'shipyard-C', label: '修船厂C', group: '修船厂' },
    { id: 'pirate-captain', label: '海盗船长', group: '海盗' },
    { id: 'pirate-crew', label: '海盗船员', group: '海盗' },
    { id: 'navigator-small', label: '小领航员', group: '领航员' },
    { id: 'navigator-big', label: '大领航员', group: '领航员' },
    { id: 'insurance', label: '保险', group: '其他' },
];

export const InvestmentSummary: React.FC = () => {
    const { getEngineState } = useGameStore();
    const engineState = getEngineState();

    if (!engineState) return null;

    // Build lookup: slotId → occupant name
    const slotOccupants = new Map<string, string>();
    for (const player of engineState.players) {
        if (player.investments) {
            for (const inv of player.investments) {
                slotOccupants.set(inv.slotId, player.name);
            }
        }
    }

    // Crew slots from selected cargos
    const crewSlots: SlotInfo[] = [];
    if (engineState.selectedCargos) {
        const CREW_COUNTS: Record<string, number> = { JADE: 4, SILK: 3, GINSENG: 3, NUTMEG: 3 };
        for (const cargo of engineState.selectedCargos) {
            const count = CREW_COUNTS[cargo] || 3;
            for (let i = 0; i < count; i++) {
                crewSlots.push({
                    id: `crew-${cargo}-${i}`,
                    label: `${CARGO_NAMES[cargo] || cargo}船员${i + 1}`,
                    group: '船员',
                });
            }
        }
    }

    const allSlots = [...crewSlots, ...ALL_SLOTS];
    const occupiedCount = allSlots.filter(s => slotOccupants.has(s.id)).length;

    if (occupiedCount === 0 && crewSlots.length === 0) {
        return (
            <div className="card">
                <h3 className="text-xs font-semibold text-slate-400 mb-2">⚓ 投资情况</h3>
                <p className="text-[10px] t-text-m">暂无投资</p>
            </div>
        );
    }

    // Group by group name
    const groups = new Map<string, SlotInfo[]>();
    for (const slot of allSlots) {
        if (!groups.has(slot.group)) groups.set(slot.group, []);
        groups.get(slot.group)!.push(slot);
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold t-text-2">⚓ 投资情况</h3>
                <span className="text-[9px] t-text-m">{occupiedCount}/{allSlots.length}</span>
            </div>
            <div className="space-y-2">
                {[...groups.entries()].map(([group, slots]) => (
                    <div key={group}>
                        <div className="text-[9px] t-text-m mb-0.5">{group}</div>
                        <div className="flex flex-wrap gap-1">
                            {slots.map(slot => {
                                const occupant = slotOccupants.get(slot.id);
                                return (
                                    <span
                                        key={slot.id}
                                        className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${occupant
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 't-text-m'
                                            }`}
                                        title={occupant ? `${slot.label}: ${occupant}` : slot.label}
                                    >
                                        {slot.label}
                                        {occupant && (
                                            <span className="ml-0.5 text-[8px] t-text-3">({occupant})</span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
