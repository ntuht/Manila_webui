import React from 'react';
import { useGameStore } from '../../stores';
import { ShipTrack } from './ShipTrack';
import { InvestmentArea } from './InvestmentArea';

export const GameBoard: React.FC = () => {
  const { gameState, currentPhase } = useGameStore();

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">游戏未开始</h2>
          <p className="text-gray-600">请先开始游戏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      {/* 游戏阶段指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <div className="bg-white rounded-lg px-6 py-3 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {getPhaseDisplayName(currentPhase)}
            </h2>
            <p className="text-sm text-gray-600">第 {gameState.round} 轮</p>
          </div>
        </div>
      </div>

      {/* 船只轨道 */}
      <div className="ship-tracks space-y-4 mb-6">
        {gameState.ships.map(ship => (
          <ShipTrack key={ship.id} ship={ship} />
        ))}
      </div>
      
      {/* 投资区域 */}
      <InvestmentArea currentPhase={currentPhase} />
    </div>
  );
};

function getPhaseDisplayName(phase: string): string {
  const phaseNames: Record<string, string> = {
    'AUCTION': '拍卖阶段',
    'INVESTMENT': '投资阶段',
    'SAILING': '航行阶段',
    'SETTLEMENT': '结算阶段',
    'GAME_END': '游戏结束'
  };
  return phaseNames[phase] || phase;
}
