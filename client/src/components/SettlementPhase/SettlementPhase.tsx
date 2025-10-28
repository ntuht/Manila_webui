import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import { Button } from '../Shared/Button';

export const SettlementPhase: React.FC = () => {
  const { gameState, nextPhase } = useGameStore();

  if (!gameState) return null;

  const dockedShips = gameState.ships.filter(ship => ship.isDocked);
  const shipyardShips = gameState.ships.filter(ship => ship.isInShipyard);
  const hijackedShips = gameState.ships.filter(ship => ship.isHijacked);

  const getCargoName = (cargoType: string): string => {
    const names = {
      'JADE': '翡翠',
      'SILK': '丝绸',
      'GINSENG': '人参',
      'NUTMEG': '肉豆蔻'
    };
    return names[cargoType as keyof typeof names] || cargoType;
  };

  const getCargoColor = (cargoType: string): string => {
    const colors = {
      'JADE': 'bg-cargo-jade',
      'SILK': 'bg-cargo-silk',
      'GINSENG': 'bg-cargo-ginseng',
      'NUTMEG': 'bg-cargo-nutmeg'
    };
    return colors[cargoType as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <Card title="结算阶段" className="p-6">
        <div className="space-y-6">
          {/* 船只状态总结 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">到港船只</h4>
              <div className="space-y-2">
                {dockedShips.length > 0 ? (
                  dockedShips.map(ship => (
                    <div key={ship.id} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${getCargoColor(ship.cargoType)}`}></div>
                      <span className="text-sm">{getCargoName(ship.cargoType)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">无船只到港</p>
                )}
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2">修船厂船只</h4>
              <div className="space-y-2">
                {shipyardShips.length > 0 ? (
                  shipyardShips.map(ship => (
                    <div key={ship.id} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${getCargoColor(ship.cargoType)}`}></div>
                      <span className="text-sm">{getCargoName(ship.cargoType)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">无船只进厂</p>
                )}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">被劫持船只</h4>
              <div className="space-y-2">
                {hijackedShips.length > 0 ? (
                  hijackedShips.map(ship => (
                    <div key={ship.id} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${getCargoColor(ship.cargoType)}`}></div>
                      <span className="text-sm">{getCargoName(ship.cargoType)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">无船只被劫持</p>
                )}
              </div>
            </div>
          </div>

          {/* 股价变化 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3">股价变化</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['JADE', 'SILK', 'GINSENG', 'NUTMEG'] as const).map(cargoType => {
                const ship = gameState.ships.find(s => s.cargoType === cargoType);
                const priceChange = ship?.isDocked ? '+1' : ship?.isInShipyard ? '-1' : '0';
                const changeColor = ship?.isDocked ? 'text-green-600' : ship?.isInShipyard ? 'text-red-600' : 'text-gray-600';
                
                return (
                  <div key={cargoType} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${getCargoColor(cargoType)}`}></div>
                      <span className="text-sm font-medium">{getCargoName(cargoType)}</span>
                    </div>
                    <span className={`text-sm font-bold ${changeColor}`}>
                      {priceChange}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 玩家收益总结 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-3">玩家收益总结</h4>
            <div className="space-y-2">
              {gameState.players.map(player => (
                <div key={player.id} className="flex items-center justify-between">
                  <span className="font-medium">{player.name}</span>
                  <span className="text-sm text-gray-600">
                    现金: {player.cash}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-center">
            <Button onClick={nextPhase} className="px-8 py-3">
              {gameState.round >= gameState.gameConfig.rounds ? '结束游戏' : '下一轮'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
