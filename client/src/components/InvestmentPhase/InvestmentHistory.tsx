import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';

export const InvestmentHistory: React.FC = () => {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const investmentHistory = gameState.history.filter(entry =>
    entry.action === 'SELECT_INVESTMENT'
  ).slice(-10); // 显示最近10次投资

  if (investmentHistory.length === 0) {
    return (
      <Card title="投资历史" className="p-4">
        <p className="text-sm text-gray-500">暂无投资记录</p>
      </Card>
    );
  }

  return (
    <Card title="投资历史" className="p-4">
      <div className="space-y-2">
        {investmentHistory.map((entry) => {
          const player = gameState.players.find(p => p.id === entry.playerId);
          return (
            <div key={entry.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {player?.name}
              </span>
              <span className="font-medium text-green-600">
                {entry.detail}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
