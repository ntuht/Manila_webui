import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import { Button } from '../Shared/Button';
import type { InvestmentSlotType } from '../../types';

export const InvestmentPhase: React.FC = () => {
  const { gameState, selectInvestment } = useGameStore();
  const [selectedSlot, setSelectedSlot] = useState<InvestmentSlotType | null>(null);
  
  if (!gameState || !gameState.investmentRound) return null;
  
  const currentPlayer = gameState.players.find(
    p => p.id === gameState.investmentRound!.investmentOrder[gameState.investmentRound!.currentPlayerIndex]
  );
  
  if (!currentPlayer) return null;
  
  const investmentSlots = [
    { type: 'CREW', cost: 3, description: '船员 - 增加船只移动力' },
    { type: 'HARBOR_OFFICE', cost: 4, description: '港口办公室 - 获得港口信息' },
    { type: 'SHIPYARD_OFFICE', cost: 5, description: '造船厂办公室 - 修理船只' },
    { type: 'PIRATE', cost: 6, description: '海盗 - 劫持其他船只' },
    { type: 'NAVIGATOR', cost: 7, description: '领航员 - 控制船只移动' },
    { type: 'INSURANCE', cost: 8, description: '保险 - 保护投资' }
  ] as const;
  
  const handleInvestment = () => {
    if (selectedSlot) {
      const result = selectInvestment(currentPlayer.id, selectedSlot);
      if (result.success) {
        setSelectedSlot(null);
        alert('投资成功！');
      } else {
        alert(result.error || '投资失败');
      }
    }
  };
  
  const canAfford = (cost: number) => currentPlayer.cash >= cost;
  
  return (
    <div className="space-y-6">
      <Card title="投资阶段" className="p-6">
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
              轮次 {gameState.investmentRound.currentRound} / {gameState.investmentRound.totalRounds}
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {investmentSlots.map(slot => {
              const isSelected = selectedSlot === slot.type;
              const canBuy = canAfford(slot.cost);
              
              return (
                <div
                  key={slot.type}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : canBuy
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-red-200 bg-red-50 opacity-50'
                  }`}
                  onClick={() => canBuy && setSelectedSlot(slot.type)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {slot.type}
                      </h4>
                      <span className="text-sm font-medium text-blue-600">
                        {slot.cost}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {slot.description}
                    </p>
                    {!canBuy && (
                      <p className="text-xs text-red-600">
                        资金不足
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleInvestment}
              disabled={!selectedSlot}
              className="flex-1"
            >
              投资 {selectedSlot ? investmentSlots.find(s => s.type === selectedSlot)?.cost : 0}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedSlot(null)}
              disabled={!selectedSlot}
            >
              取消选择
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
