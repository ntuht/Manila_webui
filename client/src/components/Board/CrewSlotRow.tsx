import React from 'react';
import { SlotToken } from './SlotToken';
import type { PlayerColor, CargoType } from '../../types/uiTypes';
import { SHIPS } from '@manila/engine';

interface CrewSlotRowProps {
    cargo: CargoType;
    investments: { slotId: string; playerId: string }[];
    playerColorMap: Record<string, PlayerColor>;
    playerNameMap: Record<string, string>;
    isInvestPhase: boolean;
    selectableSlotIds: Set<string>;
    currentPlayerCash: number;
    onSlotClick: (slotId: string, label: string, cost: number, event: React.MouseEvent) => void;
}

const CARGO_NAMES: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

export const CrewSlotRow: React.FC<CrewSlotRowProps> = ({
    cargo,
    investments,
    playerColorMap,
    playerNameMap,
    isInvestPhase,
    selectableSlotIds,
    currentPlayerCash,
    onSlotClick,
}) => {
    const ship = SHIPS[cargo];
    if (!ship) return null;

    const cargoName = CARGO_NAMES[cargo] || cargo;

    return (
        <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[9px] t-text-3 shrink-0 w-8">船员:</span>
            <div className="flex items-center gap-1">
                {ship.costs.map((cost, seatIdx) => {
                    const slotId = `crew-${cargo}-${seatIdx}`;
                    const inv = investments.find(i => i.slotId === slotId);
                    const isSelectable = selectableSlotIds.has(slotId);
                    const isAffordable = currentPlayerCash >= cost;
                    const occupantColor = inv ? playerColorMap[inv.playerId] : undefined;
                    const occupantLabel = inv ? playerNameMap[inv.playerId] : undefined;

                    return (
                        <SlotToken
                            key={slotId}
                            slotId={slotId}
                            label={`${cost}`}
                            cost={cost}
                            occupantColor={occupantColor}
                            occupantLabel={occupantLabel}
                            isSelectable={isSelectable}
                            isAffordable={isAffordable}
                            isInvestPhase={isInvestPhase}
                            onClick={(e: React.MouseEvent) => onSlotClick(slotId, `${cargoName}船员 ${seatIdx + 1}`, cost, e)}
                            size="sm"
                            shape="circle"
                        />
                    );
                })}
            </div>
        </div>
    );
};
