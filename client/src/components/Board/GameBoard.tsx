import React from 'react';
import { useGameStore } from '../../stores';
import { ShipTrack } from './ShipTrack';
import { BoardLayout } from './BoardLayout';
import { MobileSlotBar } from './MobileSlotBar';
import { InvestConfirmPopover } from './InvestConfirmPopover';
import { useInvestState } from './useInvestState';

export const GameBoard: React.FC = () => {
  const { gameState } = useGameStore();
  const invest = useInvestState();

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-200 mb-1">游戏未开始</h2>
          <p className="text-xs text-slate-400">请先开始游戏</p>
        </div>
      </div>
    );
  }

  const seatInvestments = invest.investments.map(inv => ({
    slotId: inv.slotId,
    playerId: inv.playerId,
  }));

  return (
    <div className="game-board">
      {/* Desktop: Full visual board with investment slots */}
      <BoardLayout />

      {/* Mobile: Ship tracks with interactive seats + slot bar */}
      <div className="lg:hidden space-y-2">
        {gameState.ships.map(ship => (
          <ShipTrack
            key={ship.id}
            ship={ship}
            seatInvestments={seatInvestments}
            playerColorMap={invest.playerColorMap}
            selectableSlotIds={invest.selectableSlotIds}
            isInvestPhase={invest.isInvestPhase}
            currentPlayerCash={invest.currentPlayerCash}
            onSeatClick={invest.handleSlotClick}
          />
        ))}

        {/* Non-crew investment slots (horizontal scroll pills) */}
        <MobileSlotBar
          selectableSlotIds={invest.selectableSlotIds}
          slotCostMap={invest.slotCostMap}
          investmentMap={invest.investmentMap}
          playerColorMap={invest.playerColorMap}
          playerNameMap={invest.playerNameMap}
          isInvestPhase={invest.isInvestPhase}
          currentPlayerCash={invest.currentPlayerCash}
          onSlotClick={invest.handleSlotClick}
        />
      </div>

      {/* Popover (shared by desktop + mobile, portaled to body) */}
      {invest.popover && (
        <InvestConfirmPopover
          slotName={invest.popover.slotName}
          cost={invest.popover.cost}
          onConfirm={invest.handleConfirm}
          onCancel={invest.handleCancel}
          anchorRect={invest.popover.anchorRect}
        />
      )}
    </div>
  );
};
