import React from 'react';
import { useGameStore } from '../../stores';
import { PlayerCard } from './PlayerCard';

export const PlayerList: React.FC = () => {
  const { players, getCurrentPlayer } = useGameStore();
  const currentPlayer = getCurrentPlayer();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">玩家</h3>
      <div className="space-y-2">
        {players.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrentPlayer={currentPlayer?.id === player.id}
            isActive={player.isActive}
          />
        ))}
      </div>
    </div>
  );
};
