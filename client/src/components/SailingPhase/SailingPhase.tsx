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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-2xl">🎲</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {diceResults.dice1}
                  </div>
                  <div className="text-2xl">🎲</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {diceResults.dice2}
                  </div>
                  <div className="text-2xl">🎲</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {diceResults.dice3}
                  </div>
                  <div className="text-2xl">=</div>
                  <div className="text-3xl font-bold text-green-600">
                    {diceResults.total}
                  </div>
                </div>
                <p className="text-sm text-center text-gray-600 mt-2">
                  船只将移动 {diceResults.total} 格
                </p>
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
