import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import { Button } from '../Shared/Button';

export const SailingPhase: React.FC = () => {
  const { gameState, rollDice, useNavigator } = useGameStore();
  const [diceRolled, setDiceRolled] = useState(false);
  const [navigatorUsed, setNavigatorUsed] = useState(false);
  
  if (!gameState) return null;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const diceResults = gameState.diceResults?.[0];
  
  const handleRollDice = () => {
    const result = rollDice();
    if (result.success) {
      setDiceRolled(true);
    } else {
      alert(result.error || '投掷骰子失败');
    }
  };
  
  const handleUseNavigator = (action: string) => {
    const result = useNavigator(currentPlayer.id, action);
    if (result.success) {
      setNavigatorUsed(true);
      alert('领航员使用成功！');
    } else {
      alert(result.error || '使用领航员失败');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card title="航行阶段" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                当前玩家: {currentPlayer.name}
              </h3>
              <p className="text-sm text-gray-600">
                现金: {currentPlayer.cash}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              轮次 {gameState.round} / {gameState.gameConfig.rounds}
            </div>
          </div>
          
          {/* 骰子投掷 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">投掷骰子</h4>
            {!diceRolled ? (
              <Button onClick={handleRollDice} className="w-full">
                投掷骰子
              </Button>
            ) : diceResults ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="space-y-4">
                  {/* 骰子结果 - 按船只货物类型显示 */}
                  <div className="flex items-center justify-center space-x-6">
                    {gameState.ships.map((ship, index) => {
                      const diceValue = index === 0 ? diceResults.dice1 : 
                                       index === 1 ? diceResults.dice2 : 
                                       diceResults.dice3;
                      
                      const getCargoColor = (cargoType: string) => {
                        const colors = {
                          'JADE': 'bg-cargo-jade',      // 翡翠绿
                          'SILK': 'bg-cargo-silk',      // 丝绸蓝
                          'GINSENG': 'bg-cargo-ginseng', // 人参黄
                          'NUTMEG': 'bg-cargo-nutmeg'   // 肉豆蔻黑
                        };
                        return colors[cargoType as keyof typeof colors] || 'bg-gray-500';
                      };
                      
                      const getCargoName = (cargoType: string) => {
                        const names = {
                          'JADE': '翡翠',
                          'SILK': '丝绸',
                          'GINSENG': '人参',
                          'NUTMEG': '肉豆蔻'
                        };
                        return names[cargoType as keyof typeof names] || cargoType;
                      };
                      
                      return (
                        <div key={ship.id} className="flex flex-col items-center space-y-2">
                          <div className={`w-12 h-12 ${getCargoColor(ship.cargoType)} rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                            {diceValue}
                          </div>
                          <span className="text-xs text-gray-600 font-medium">
                            {getCargoName(ship.cargoType)}船
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* 等号和总和 */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-2xl font-bold text-gray-600">=</div>
                      <div className="w-16 h-12 bg-yellow-400 rounded-lg flex items-center justify-center text-black text-2xl font-bold shadow-lg">
                        {diceResults.total}
                      </div>
                      <span className="text-xs text-gray-600">总和</span>
                    </div>
                  </div>
                  
                  {/* 移动信息 */}
                  <div className="text-center">
                    <p className="text-gray-700 font-medium">
                      所有船只将移动 <span className="text-green-600 font-bold">{diceResults.total}</span> 格
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-center space-x-4">
                        {gameState.ships.map((ship, index) => {
                          const diceValue = index === 0 ? diceResults.dice1 : 
                                           index === 1 ? diceResults.dice2 : 
                                           diceResults.dice3;
                          const newPosition = ship.position + diceValue;
                          
                          return (
                            <span key={ship.id} className="text-xs">
                              {ship.cargoType}船: {ship.position} → {newPosition}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          
          {/* 领航员选项 */}
          {diceRolled && !navigatorUsed && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">使用领航员（可选）</h4>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="secondary"
                  onClick={() => handleUseNavigator('SMALL_NAVIGATOR')}
                  className="p-4"
                >
                  <div className="text-center">
                    <div className="text-lg">🧭</div>
                    <div className="font-medium">小领航员</div>
                    <div className="text-sm text-gray-600">+1 移动力</div>
                  </div>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleUseNavigator('BIG_NAVIGATOR')}
                  className="p-4"
                >
                  <div className="text-center">
                    <div className="text-lg">🧭🧭</div>
                    <div className="font-medium">大领航员</div>
                    <div className="text-sm text-gray-600">+2 移动力</div>
                  </div>
                </Button>
              </div>
            </div>
          )}
          
          {/* 船只状态 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">船只状态</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gameState.ships.map((ship, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {ship.cargoType} 船
                      </div>
                      <div className="text-sm text-gray-600">
                        位置: {ship.position}
                      </div>
                    </div>
                    <div className="text-right">
                      {ship.isDocked && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          已到港
                        </span>
                      )}
                      {ship.isHijacked && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          被劫持
                        </span>
                      )}
                      {ship.isInShipyard && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          修船厂
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
