import React from 'react';
import { useGameStore } from '../../stores';
import { ShipTrack } from './ShipTrack';
import { BoardLayout } from './BoardLayout';

export const GameBoard: React.FC = () => {
  const { gameState } = useGameStore();

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

  return (
    <div className="game-board">
      {/* Desktop: Full visual board with investment slots */}
      <BoardLayout />

      {/* Mobile: Simple ship track list (BoardLayout is hidden lg:block) */}
      <div className="lg:hidden space-y-2">
        {gameState.ships.map(ship => (
          <ShipTrack key={ship.id} ship={ship} />
        ))}
      </div>
    </div>
  );
};
