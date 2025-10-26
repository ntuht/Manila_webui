import React from 'react';
import { useGameStore } from '../../stores';
import { PlayerList } from '../Player/PlayerList';
import { GameBoard } from '../Board/GameBoard';
import { GameStatus } from './GameStatus';
import { ActionPanel } from './ActionPanel';
import { GameLog } from './GameLog';

export const GameInterface: React.FC = () => {
  const { currentPhase } = useGameStore();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 左侧：玩家信息 */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <PlayerList />
          <StockPrices />
        </div>
      </div>
      
      {/* 中间：游戏棋盘 */}
      <div className="lg:col-span-2">
        <GameBoard />
      </div>
      
      {/* 右侧：游戏信息 */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <GameStatus />
          <ActionPanel />
          <GameLog />
        </div>
      </div>
    </div>
  );
};

const StockPrices: React.FC = () => {
  const { gameState } = useGameStore();
  
  if (!gameState) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">股票价格</h3>
      <div className="space-y-2">
        {Object.entries(gameState.stockPrices).map(([cargo, price]) => (
          <div key={cargo} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{cargo}</span>
            <span className="font-medium text-green-600">{price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
