import React from 'react';
import { useGameStore } from '../../stores';
import type { GamePhase } from '../../types';
import { InvestmentSlot } from './InvestmentSlot';

interface InvestmentAreaProps {
  currentPhase: GamePhase;
}

// 船员成本表: 每个座位有固定成本
const CREW_COSTS: Record<string, number[]> = {
  JADE: [3, 4, 5, 5],  // 4 seats
  SILK: [3, 4, 5],      // 3 seats
  GINSENG: [1, 2, 3],      // 3 seats
  NUTMEG: [2, 3, 4],      // 3 seats
};

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

export const InvestmentArea: React.FC<InvestmentAreaProps> = ({ currentPhase }) => {
  const { gameState, selectInvestment } = useGameStore();

  // 获取当前投资玩家
  const currentPlayer = gameState?.investmentRound ?
    gameState.players.find(p => p.id === gameState.investmentRound!.investmentOrder[gameState.investmentRound!.currentPlayerIndex]) :
    null;

  // 获取港务长选择的货物类型
  const selectedCargos = (currentPhase === 'INVESTMENT' && gameState?.selectedCargos)
    ? gameState.selectedCargos
    : [];

  // 检查槽位是否被任何玩家占用 (使用引擎格式 slotId)
  const isSlotOccupied = (slotId: string): boolean => {
    if (!gameState) return false;
    return gameState.players.some(player =>
      player.investments.some(inv => inv.slotId === slotId)
    );
  };

  // 获取占用者名称
  const getOccupant = (slotId: string): string | null => {
    if (!gameState) return null;
    for (const player of gameState.players) {
      if (player.investments.some(inv => inv.slotId === slotId)) {
        return player.name;
      }
    }
    return null;
  };

  // 生成船员投资槽位 — 每个座位独立，使用引擎格式 slotId
  const crewSlots: Array<{
    id: string; type: 'CREW'; cargoType: string; name: string; cost: number; isOccupied: boolean; occupant: string | null;
  }> = [];

  for (const cargo of selectedCargos) {
    const costs = CREW_COSTS[cargo];
    if (!costs) continue;
    for (let seatIdx = 0; seatIdx < costs.length; seatIdx++) {
      // 引擎用: crew-JADE-0, crew-JADE-1, ... (大写、0-based)
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

  // 其他投资槽位
  const otherSlots = [
    { id: 'harbor-A', type: 'HARBOR_OFFICE' as const, name: '港口办事处 A', cost: 4, requirements: '≥1艘船到港' },
    { id: 'harbor-B', type: 'HARBOR_OFFICE' as const, name: '港口办事处 B', cost: 3, requirements: '≥2艘船到港' },
    { id: 'harbor-C', type: 'HARBOR_OFFICE' as const, name: '港口办事处 C', cost: 2, requirements: '3艘船全部到港' },
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
        {selectedCargos.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-green-600 font-medium">
              本轮货物: {selectedCargos.map(cargo => CARGO_NAMES[cargo] || cargo).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* 船员投资 — 按货物分组 */}
      {crewSlots.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">🚢 船员</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {crewSlots.map(slot => {
              const canAfford = currentPlayer ? currentPlayer.cash >= slot.cost : false;
              const canSelect = isInvestmentPhase && canAfford && !slot.isOccupied;
              return (
                <InvestmentSlot
                  key={slot.id}
                  slot={{
                    ...slot,
                    reward: 0, // 收益由船员数量决定，不在此显示
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
        <h4 className="text-sm font-semibold text-gray-700 mb-3">⚓ 其他投资</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  reward: 0,  // 收益条件复杂，不在此显示
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
