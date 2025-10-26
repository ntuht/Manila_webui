import React from 'react';
import { useGameStore } from '../../stores';

export const GameStatus: React.FC = () => {
  const { gameState, currentPhase } = useGameStore();

  if (!gameState) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">游戏状态</h3>
        <p className="text-gray-600">游戏未开始</p>
      </div>
    );
  }

  const getPhaseStatus = (phase: string) => {
    const statuses = {
      'AUCTION': { text: '拍卖阶段', color: 'text-blue-600', bg: 'bg-blue-100' },
      'INVESTMENT': { text: '投资阶段', color: 'text-green-600', bg: 'bg-green-100' },
      'SAILING': { text: '航行阶段', color: 'text-purple-600', bg: 'bg-purple-100' },
      'SETTLEMENT': { text: '结算阶段', color: 'text-orange-600', bg: 'bg-orange-100' },
      'GAME_END': { text: '游戏结束', color: 'text-gray-600', bg: 'bg-gray-100' }
    };
    return statuses[phase] || { text: phase, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const phaseStatus = getPhaseStatus(currentPhase);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">游戏状态</h3>
      
      <div className="space-y-4">
        {/* 当前阶段 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">当前阶段</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${phaseStatus.bg} ${phaseStatus.color}`}>
              {phaseStatus.text}
            </span>
          </div>
        </div>

        {/* 游戏轮数 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">游戏轮数</span>
            <span className="font-medium text-gray-900">
              {gameState.round} / {gameState.gameConfig.rounds}
            </span>
          </div>
        </div>

        {/* 活跃玩家 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">活跃玩家</span>
            <span className="font-medium text-gray-900">
              {gameState.players.filter(p => p.isActive).length} / {gameState.players.length}
            </span>
          </div>
        </div>

        {/* 船只状态 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">船只状态</span>
            <div className="flex space-x-1">
              {gameState.ships.map(ship => (
                <div
                  key={ship.id}
                  className={`w-3 h-3 rounded-full ${
                    ship.isDocked ? 'bg-green-500' :
                    ship.isInShipyard ? 'bg-orange-500' :
                    ship.isHijacked ? 'bg-red-500' :
                    'bg-gray-300'
                  }`}
                  title={`${ship.cargoType}: ${ship.isDocked ? '已到港' : ship.isInShipyard ? '修船厂' : ship.isHijacked ? '被劫持' : '航行中'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 港务长 */}
        {gameState.auctionWinner && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">港务长</span>
              <span className="font-medium text-blue-600">
                {gameState.players.find(p => p.id === gameState.auctionWinner)?.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
