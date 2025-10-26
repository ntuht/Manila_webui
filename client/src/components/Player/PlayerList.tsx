import React from 'react';
import { useGameStore } from '../../stores';
import { PlayerCard } from './PlayerCard';

export const PlayerList: React.FC = () => {
  const { players, getCurrentPlayer } = useGameStore();
  const currentPlayer = getCurrentPlayer();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">玩家</h3>
      <div className="space-y-3">
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
