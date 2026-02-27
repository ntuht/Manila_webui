import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../stores';
import { SlotToken } from './SlotToken';
import { InvestConfirmPopover } from './InvestConfirmPopover';
import { ShipTrack } from './ShipTrack';
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

// ==================== Slot Definitions ====================

interface SlotDef {
    slotId: string;
    label: string;
    icon: string;
    cost: number;
    shape: 'circle' | 'square';
}

const HARBOR_SLOTS: SlotDef[] = HARBOR_OFFICES.map(o => ({
    slotId: o.id,
    label: `港口${o.id.split('-')[1].toUpperCase()}`,
    icon: '🏠',
    cost: o.cost,
    shape: 'square' as const,
}));

const SHIPYARD_SLOTS: SlotDef[] = SHIPYARD_OFFICES.map(o => ({
    slotId: o.id,
    label: `修船厂${o.id.split('-')[1].toUpperCase()}`,
    icon: '🔧',
    cost: o.cost,
    shape: 'square' as const,
}));

const ROLE_SLOTS: SlotDef[] = [
    { slotId: 'navigator-big', label: '大领航', icon: '🧭', cost: NAVIGATOR_BIG_COST, shape: 'square' },
    { slotId: 'navigator-small', label: '小领航', icon: '🧭', cost: NAVIGATOR_SMALL_COST, shape: 'square' },
    { slotId: 'pirate-captain', label: '船长', icon: '☠️', cost: PIRATE_CAPTAIN_COST, shape: 'square' },
    { slotId: 'pirate-crew', label: '船员', icon: '☠️', cost: PIRATE_CREW_COST, shape: 'square' },
];

const INSURANCE_SLOT: SlotDef = {
    slotId: 'insurance', label: '保险', icon: '🛡️', cost: INSURANCE_COST, shape: 'square',
};

// ==================== Component ====================

export const BoardLayout: React.FC = () => {
    const { gameState, getEngineState, selectInvestment, playerColors } = useGameStore();
    const engineState = getEngineState();

    // Popover state
    const [popover, setPopover] = useState<{
        slotId: string;
        slotName: string;
        cost: number;
        anchorRect: DOMRect | null;
    } | null>(null);

    // Build lookup maps
    const investments = engineState?.investments ?? [];
    const players = engineState?.players ?? [];
    const pendingAction = engineState?.pendingAction;
    const isInvestPhase = engineState?.phase === 'INVEST';
    const isHumanTurn = isInvestPhase && pendingAction && !players.find(p => p.id === pendingAction.playerId)?.isAI;

    // Current player info
    const currentPlayerId = pendingAction?.playerId ?? '';
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const currentPlayerCash = currentPlayer?.cash ?? 0;

    // Build valid investment slot IDs and their engine-provided costs
    const selectableSlotIds = new Set<string>();
    const slotCostMap = new Map<string, number>(); // slotId -> engine-provided cost
    if (isHumanTurn && pendingAction) {
        for (const a of pendingAction.validActions) {
            if (a.type === 'SELECT_INVESTMENT' && a.data.slotId) {
                const slotId = a.data.slotId as string;
                selectableSlotIds.add(slotId);
                slotCostMap.set(slotId, (a.data.cost as number) ?? 0);
            }
        }
    }

    // Investment occupant maps
    const investmentMap = new Map<string, { playerId: string }>();
    for (const inv of investments) {
        investmentMap.set(inv.slotId, { playerId: inv.playerId });
    }

    const playerColorMap: Record<string, PlayerColor> = playerColors ?? {};
    const playerNameMap: Record<string, string> = {};
    for (const p of players) {
        playerNameMap[p.id] = p.name;
    }

    // Slot click handler
    const handleSlotClick = useCallback((slotId: string, label: string, cost: number, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setPopover({ slotId, slotName: label, cost, anchorRect: rect });
    }, []);

    // Confirm investment
    const handleConfirm = useCallback(() => {
        if (!popover || !currentPlayerId) return;
        selectInvestment(currentPlayerId, popover.slotId);
        setPopover(null);
    }, [popover, currentPlayerId, selectInvestment]);

    const handleCancel = useCallback(() => {
        setPopover(null);
    }, []);

    // Helper: render a slot def
    const renderSlot = (def: SlotDef) => {
        const inv = investmentMap.get(def.slotId);
        // Use engine-provided cost (handles bankruptcy: cost=0) or fallback to definition cost
        const effectiveCost = slotCostMap.has(def.slotId) ? slotCostMap.get(def.slotId)! : def.cost;
        return (
            <SlotToken
                key={def.slotId}
                slotId={def.slotId}
                label={def.label}
                cost={effectiveCost}
                icon={def.icon}
                occupantColor={inv ? playerColorMap[inv.playerId] : undefined}
                occupantLabel={inv ? playerNameMap[inv.playerId] : undefined}
                isSelectable={selectableSlotIds.has(def.slotId)}
                isAffordable={currentPlayerCash >= effectiveCost}
                isInvestPhase={isInvestPhase}
                onClick={(e: React.MouseEvent) => handleSlotClick(def.slotId, def.label, effectiveCost, e)}
                shape={def.shape}
            />
        );
    };

    if (!gameState) return null;

    return (
        <div className="board-layout hidden lg:block">
            {/* ===== Top Row: Harbor | Navigator | Pirate — evenly spaced ===== */}
            <div className="flex items-start justify-between mb-4 px-2">
                {/* Harbor offices */}
                <div className="flex items-start gap-2">
                    {HARBOR_SLOTS.map(renderSlot)}
                </div>

                {/* Navigator */}
                <div className="flex items-start gap-2">
                    {ROLE_SLOTS.filter(s => s.slotId.startsWith('navigator')).map(renderSlot)}
                </div>

                {/* Pirate */}
                <div className="flex items-start gap-2">
                    {ROLE_SLOTS.filter(s => s.slotId.startsWith('pirate')).map(renderSlot)}
                </div>
            </div>

            {/* ===== Ship Tracks with interactive crew seats ===== */}
            <div className="space-y-1.5">
                {gameState.ships.map(ship => (
                    <ShipTrack
                        key={ship.id}
                        ship={ship}
                        seatInvestments={investments.map(inv => ({ slotId: inv.slotId, playerId: inv.playerId }))}
                        playerColorMap={playerColorMap}
                        selectableSlotIds={selectableSlotIds}
                        isInvestPhase={isInvestPhase}
                        currentPlayerCash={currentPlayerCash}
                        onSeatClick={handleSlotClick}
                    />
                ))}
            </div>

            {/* ===== Bottom Row: Shipyard + Insurance ===== */}
            <div className="flex items-start justify-between mt-4 px-2">
                {/* Shipyard offices */}
                <div className="flex items-start gap-2">
                    {SHIPYARD_SLOTS.map(renderSlot)}
                </div>

                {/* Insurance */}
                <div className="flex items-start gap-2">
                    {renderSlot(INSURANCE_SLOT)}
                </div>
            </div>

            {/* ===== Confirm Popover ===== */}
            {popover && (
                <InvestConfirmPopover
                    slotName={popover.slotName}
                    cost={popover.cost}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    anchorRect={popover.anchorRect}
                />
            )}
        </div>
    );
};
