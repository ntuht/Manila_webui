import React from 'react';
import { useGameStore } from '../../stores';
import type { GamePhase } from '../../types';
import { InvestmentSlot } from './InvestmentSlot';

interface InvestmentAreaProps {
  currentPhase: GamePhase;
}

export const InvestmentArea: React.FC<InvestmentAreaProps> = ({ currentPhase }) => {
  const { gameState, selectInvestment } = useGameStore();
  const investmentSlots = [
    {
      id: 'crew-jade',
      type: 'CREW' as const,
      cargoType: 'JADE' as const,
      name: '翡翠船员',
      cost: 3,
      reward: 6,
      seats: 4,
      isOccupied: false
    },
    {
      id: 'crew-silk', 
      type: 'CREW' as const,
      cargoType: 'SILK' as const,
      name: '丝绸船员',
      cost: 3,
      reward: 6,
      seats: 3,
      isOccupied: false
    },
    {
      id: 'crew-ginseng',
      type: 'CREW' as const,
      cargoType: 'GINSENG' as const,
      name: '人参船员',
      cost: 1,
      reward: 3,
      seats: 3,
      isOccupied: false
    },
    {
      id: 'harbor-office-a',
      type: 'HARBOR_OFFICE' as const,
      name: '港口办事处 A',
      cost: 4,
      reward: 6,
      requirements: '≥1艘船到港',
      isOccupied: false
    },
    {
      id: 'harbor-office-b',
      type: 'HARBOR_OFFICE' as const,
      name: '港口办事处 B', 
      cost: 3,
      reward: 8,
      requirements: '≥2艘船到港',
      isOccupied: false
    },
    {
      id: 'harbor-office-c',
      type: 'HARBOR_OFFICE' as const,
      name: '港口办事处 C',
      cost: 2,
      reward: 15,
      requirements: '3艘船全部到港',
      isOccupied: false
    },
    {
      id: 'shipyard-office-a',
      type: 'SHIPYARD_OFFICE' as const,
      name: '修船厂办事处 A',
      cost: 4,
      reward: 6,
      requirements: '≥1艘船进修船厂',
      isOccupied: false
    },
    {
      id: 'shipyard-office-b',
      type: 'SHIPYARD_OFFICE' as const,
      name: '修船厂办事处 B',
      cost: 3,
      reward: 8,
      requirements: '≥2艘船进修船厂',
      isOccupied: false
    },
    {
      id: 'shipyard-office-c',
      type: 'SHIPYARD_OFFICE' as const,
      name: '修船厂办事处 C',
      cost: 2,
      reward: 15,
      requirements: '3艘船全部进修船厂',
      isOccupied: false
    },
    {
      id: 'pirate-captain',
      type: 'PIRATE' as const,
      name: '海盗船长',
      cost: 5,
      reward: 0,
      requirements: '劫持船只',
      isOccupied: false
    },
    {
      id: 'pirate-crew',
      type: 'PIRATE' as const,
      name: '海盗船员',
      cost: 5,
      reward: 0,
      requirements: '劫持船只',
      isOccupied: false
    },
    {
      id: 'navigator-small',
      type: 'NAVIGATOR' as const,
      name: '小领航员',
      cost: 2,
      reward: 0,
      requirements: '调整船只位置',
      isOccupied: false
    },
    {
      id: 'navigator-big',
      type: 'NAVIGATOR' as const,
      name: '大领航员',
      cost: 5,
      reward: 0,
      requirements: '调整船只位置',
      isOccupied: false
    },
    {
      id: 'insurance',
      type: 'INSURANCE' as const,
      name: '保险',
      cost: 0,
      reward: 10,
      requirements: '立即获得现金',
      isOccupied: false
    }
  ];

  const isInvestmentPhase = currentPhase === 'INVESTMENT';
  
  // 获取当前投资玩家
  const currentPlayer = gameState?.investmentRound ? 
    gameState.players.find(p => p.id === gameState.investmentRound!.investmentOrder[gameState.investmentRound!.currentPlayerIndex]) :
    null;

  const handleInvestmentSelect = (slotId: string) => {
    if (isInvestmentPhase && currentPlayer) {
      const result = selectInvestment(currentPlayer.id, slotId);
      if (result.success) {
        console.log('投资成功:', slotId);
      } else {
        alert(result.error || '投资失败');
      }
    }
  };

  return (
    <div className="investment-area">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">投资区域</h3>
        <p className="text-sm text-gray-600">
          {isInvestmentPhase ? 
            `当前玩家: ${currentPlayer?.name || '未知'} - 选择投资槽位` : 
            '投资阶段未开始'
          }
        </p>
        {currentPlayer && (
          <p className="text-sm text-blue-600 font-medium">
            现金: {currentPlayer.cash}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investmentSlots.map(slot => {
          const canAfford = currentPlayer ? currentPlayer.cash >= slot.cost : false;
          const isOccupied = currentPlayer ? 
            currentPlayer.investments.some(inv => inv.slotId === slot.id) : 
            false;
          
          return (
            <InvestmentSlot
              key={slot.id}
              slot={{
                ...slot,
                isOccupied: isOccupied
              }}
              isSelectable={isInvestmentPhase && canAfford && !isOccupied}
              onSelect={() => handleInvestmentSelect(slot.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
