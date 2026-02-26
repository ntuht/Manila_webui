import React from 'react';
import { useGameStore } from '../../stores';
import type { GamePhase } from '../../types';
import { InvestmentSlot } from './InvestmentSlot';

interface InvestmentAreaProps {
  currentPhase: GamePhase;
}

const CREW_COSTS: Record<string, number[]> = {
  JADE: [3, 4, 5, 5],
  SILK: [3, 4, 5],
  GINSENG: [1, 2, 3],
  NUTMEG: [2, 3, 4],
};

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

export const InvestmentArea: React.FC<InvestmentAreaProps> = ({ currentPhase }) => {
  const { gameState, selectInvestment } = useGameStore();

  const currentPlayer = gameState?.investmentRound ?
    gameState.players.find(p => p.id === gameState.investmentRound!.investmentOrder[gameState.investmentRound!.currentPlayerIndex]) :
    null;

  const selectedCargos = (currentPhase === 'INVESTMENT' && gameState?.selectedCargos)
    ? gameState.selectedCargos
    : [];

  const isSlotOccupied = (slotId: string): boolean => {
    if (!gameState) return false;
    return gameState.players.some(player =>
      player.investments.some(inv => inv.slotId === slotId)
    );
  };

  const getOccupant = (slotId: string): string | null => {
    if (!gameState) return null;
    for (const player of gameState.players) {
      if (player.investments.some(inv => inv.slotId === slotId)) {
        return player.name;
      }
    }
    return null;
  };

  const crewSlots: Array<{
    id: string; type: 'CREW'; cargoType: string; name: string; cost: number; isOccupied: boolean; occupant: string | null;
  }> = [];

  for (const cargo of selectedCargos) {
    const costs = CREW_COSTS[cargo];
    if (!costs) continue;
    for (let seatIdx = 0; seatIdx < costs.length; seatIdx++) {
      const engineSlotId = `crew-${cargo}-${seatIdx}`;
      const occupied = isSlotOccupied(engineSlotId);
      crewSlots.push({
        id: engineSlotId,
        type: 'CREW',
        cargoType: cargo,
        name: `${CARGO_NAMES[cargo] || cargo}船员 ${seatIdx + 1}`,
        cost: costs[seatIdx],
        isOccupied: occupied,
        occupant: occupied ? getOccupant(engineSlotId) : null,
      });
    }
  }

  const otherSlots = [
    { id: 'harbor-A', type: 'HARBOR_OFFICE' as const, name: '港口办事处 A', cost: 4, requirements: '≥1艘船到港' },
    { id: 'harbor-B', type: 'HARBOR_OFFICE' as const, name: '港口办事处 B', cost: 3, requirements: '≥2艘船到港' },
    { id: 'harbor-C', type: 'HARBOR_OFFICE' as const, name: '港口办事处 C', cost: 2, requirements: '3艘全部到港' },
    { id: 'shipyard-A', type: 'SHIPYARD_OFFICE' as const, name: '修船厂办事处 A', cost: 4, requirements: '≥1艘进修船厂' },
    { id: 'shipyard-B', type: 'SHIPYARD_OFFICE' as const, name: '修船厂办事处 B', cost: 3, requirements: '≥2艘进修船厂' },
    { id: 'shipyard-C', type: 'SHIPYARD_OFFICE' as const, name: '修船厂办事处 C', cost: 2, requirements: '3艘全部进修船厂' },
    { id: 'pirate-captain', type: 'PIRATE' as const, name: '海盗船长', cost: 5, requirements: '劫持船只' },
    { id: 'pirate-crew', type: 'PIRATE' as const, name: '海盗船员', cost: 5, requirements: '劫持船只' },
    { id: 'navigator-small', type: 'NAVIGATOR' as const, name: '小领航员', cost: 2, requirements: '调整船只位置' },
    { id: 'navigator-big', type: 'NAVIGATOR' as const, name: '大领航员', cost: 5, requirements: '调整船只位置' },
    { id: 'insurance', type: 'INSURANCE' as const, name: '保险', cost: 0, requirements: '立即获得10元' },
  ];

  const isInvestmentPhase = currentPhase === 'INVESTMENT';

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
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">投资区域</h3>
        <p className="text-xs text-slate-500">
          {isInvestmentPhase ?
            `当前: ${currentPlayer?.name || '未知'} — 选择投资槽位` :
            '投资阶段未开始'
          }
        </p>
        {currentPlayer && (
          <p className="text-xs text-gold-400 font-medium mt-0.5">
            💰 现金: {currentPlayer.cash}
          </p>
        )}
        {selectedCargos.length > 0 && (
          <p className="text-xs text-emerald-400 mt-0.5">
            本轮货物: {selectedCargos.map(cargo => CARGO_NAMES[cargo] || cargo).join(', ')}
          </p>
        )}
      </div>

      {/* 船员投资 */}
      {crewSlots.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-slate-400 mb-2">🚢 船员</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {crewSlots.map(slot => {
              const canAfford = currentPlayer ? currentPlayer.cash >= slot.cost : false;
              const canSelect = isInvestmentPhase && canAfford && !slot.isOccupied;
              return (
                <InvestmentSlot
                  key={slot.id}
                  slot={{
                    ...slot,
                    reward: 0,
                    seats: 1,
                  }}
                  isSelectable={canSelect}
                  onSelect={() => handleInvestmentSelect(slot.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 其他投资 */}
      <div>
        <h4 className="text-xs font-medium text-slate-400 mb-2">⚓ 其他投资</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {otherSlots.map(slot => {
            const occupied = isSlotOccupied(slot.id);
            const canAfford = currentPlayer ? currentPlayer.cash >= slot.cost : false;
            const canSelect = isInvestmentPhase && canAfford && !occupied;
            return (
              <InvestmentSlot
                key={slot.id}
                slot={{
                  ...slot,
                  isOccupied: occupied,
                  reward: 0,
                  seats: 1,
                }}
                isSelectable={canSelect}
                onSelect={() => handleInvestmentSelect(slot.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
