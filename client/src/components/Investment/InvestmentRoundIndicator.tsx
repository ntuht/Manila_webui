import React from 'react';
import { useGameStore } from '../../stores';

export const InvestmentRoundIndicator: React.FC = () => {
  const { gameState } = useGameStore();
  const { investmentRound } = gameState || {};
  
  if (!investmentRound) return null;
  
  const currentPlayer = gameState?.players.find(
    p => p.id === investmentRound.investmentOrder[investmentRound.currentPlayerIndex]
  );
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">
            投资轮次 {investmentRound.currentRound}/{investmentRound.totalRounds}
          </h4>
          <p className="text-sm text-gray-600">
            当前玩家: {currentPlayer?.name}
          </p>
        </div>
        <div className="flex space-x-2">
          {investmentRound.investmentOrder.map((playerId, index) => {
            const player = gameState?.players.find(p => p.id === playerId);
            const isActive = index === investmentRound.currentPlayerIndex;
            
            return (
              <div
                key={playerId}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
                title={player?.name}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>投资进度</span>
          <span>
            {investmentRound.currentPlayerIndex + 1} / {investmentRound.investmentOrder.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((investmentRound.currentPlayerIndex + 1) / investmentRound.investmentOrder.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};
