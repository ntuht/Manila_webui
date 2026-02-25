import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';

export const BidHistory: React.FC = () => {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const bidHistory = gameState.history.filter(entry =>
    entry.action === 'BID'
  ).slice(-5); // 显示最近5次出价

  if (bidHistory.length === 0) {
    return (
      <Card title="出价历史" className="p-4">
        <p className="text-sm text-gray-500">暂无出价记录</p>
      </Card>
    );
  }

  return (
    <Card title="出价历史" className="p-4">
      <div className="space-y-2">
        {bidHistory.map((entry) => {
          const player = gameState.players.find(p => p.id === entry.playerId);
          return (
            <div key={entry.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {player?.name}
              </span>
              <span className="font-medium text-blue-600">
                {entry.detail}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
