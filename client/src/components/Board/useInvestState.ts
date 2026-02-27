/**
 * useInvestState — Shared hook for investment phase state.
 * Used by both BoardLayout (desktop) and GameBoard mobile view.
 */

import { useMemo, useState, useCallback } from 'react';
import { useGameStore } from '../../stores';
import type { PlayerColor } from '../../types/uiTypes';

export interface InvestPopover {
    slotId: string;
    slotName: string;
    cost: number;
    anchorRect: DOMRect | null;
}

export function useInvestState() {
    const { gameState, getEngineState, selectInvestment, playerColors } = useGameStore();
    const engineState = getEngineState();

    const [popover, setPopover] = useState<InvestPopover | null>(null);

    const investments = engineState?.investments ?? [];
    const players = engineState?.players ?? [];
    const pendingAction = engineState?.pendingAction;
    const isInvestPhase = engineState?.phase === 'INVEST';
    const isHumanTurn = isInvestPhase && pendingAction && !players.find(p => p.id === pendingAction.playerId)?.isAI;

    const currentPlayerId = pendingAction?.playerId ?? '';
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const currentPlayerCash = currentPlayer?.cash ?? 0;

    // Selectable slots + engine-provided costs
    const { selectableSlotIds, slotCostMap } = useMemo(() => {
        const ids = new Set<string>();
        const costs = new Map<string, number>();
        if (isHumanTurn && pendingAction) {
            for (const a of pendingAction.validActions) {
                if (a.type === 'SELECT_INVESTMENT' && a.data.slotId) {
                    const slotId = a.data.slotId as string;
                    ids.add(slotId);
                    costs.set(slotId, (a.data.cost as number) ?? 0);
                }
            }
        }
        return { selectableSlotIds: ids, slotCostMap: costs };
    }, [isHumanTurn, pendingAction]);

    // Investment occupant maps
    const investmentMap = useMemo(() => {
        const map = new Map<string, { playerId: string }>();
        for (const inv of investments) {
            map.set(inv.slotId, { playerId: inv.playerId });
        }
        return map;
    }, [investments]);

    const playerColorMap: Record<string, PlayerColor> = playerColors ?? {};
    const playerNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of players) {
            map[p.id] = p.name;
        }
        return map;
    }, [players]);

    // Handlers
    const handleSlotClick = useCallback((slotId: string, label: string, cost: number, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setPopover({ slotId, slotName: label, cost, anchorRect: rect });
    }, []);

    const handleConfirm = useCallback(() => {
        if (!popover || !currentPlayerId) return;
        selectInvestment(currentPlayerId, popover.slotId);
        setPopover(null);
    }, [popover, currentPlayerId, selectInvestment]);

    const handleCancel = useCallback(() => {
        setPopover(null);
    }, []);

    return {
        gameState,
        engineState,
        investments,
        players,
        pendingAction,
        isInvestPhase,
        isHumanTurn,
        currentPlayerId,
        currentPlayerCash,
        selectableSlotIds,
        slotCostMap,
        investmentMap,
        playerColorMap,
        playerNameMap,
        popover,
        setPopover,
        handleSlotClick,
        handleConfirm,
        handleCancel,
        selectInvestment,
    };
}
