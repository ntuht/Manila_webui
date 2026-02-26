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
      } else {
        alert(result.error || '投资失败');
      }
    }
  };

  const canAfford = (cost: number) => currentPlayer.cash >= cost;

  return (
    <div className="space-y-5">
      <Card title="投资阶段" className="p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">当前: {currentPlayer.name}</h3>
              <p className="text-xs text-gold-400 font-medium">💰 现金: {currentPlayer.cash}</p>
            </div>
            <div className="text-xs text-slate-500">
              轮次 {gameState.investmentRound.currentRound} / {gameState.investmentRound.totalRounds}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {investmentSlots.map(slot => {
              const isSelected = selectedSlot === slot.type;
              const canBuy = canAfford(slot.cost);

              return (
                <div
                  key={slot.type}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${isSelected
                      ? 'border-ocean-500/40 bg-ocean-500/10'
                      : canBuy
                        ? 'border-white/10 bg-white/5 hover:border-white/20'
                        : 'border-red-500/15 bg-red-500/5 opacity-40 cursor-not-allowed'
                    }`}
                  onClick={() => canBuy && setSelectedSlot(slot.type)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-medium text-slate-200">{slot.type}</h4>
                      <span className="text-xs font-medium text-amber-400">{slot.cost}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{slot.description}</p>
                    {!canBuy && <p className="text-[10px] text-red-400">资金不足</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleInvestment} disabled={!selectedSlot} className="flex-1" size="sm">
              投资 {selectedSlot ? investmentSlots.find(s => s.type === selectedSlot)?.cost : 0}
            </Button>
            <Button variant="ghost" onClick={() => setSelectedSlot(null)} disabled={!selectedSlot} size="sm">
              取消
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
