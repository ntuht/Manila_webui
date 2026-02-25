import React from 'react';
import type { PlayerState } from '../../types';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

const SLOT_NAMES: Record<string, string> = {
  'pirate-captain': '海盗船长',
  'pirate-crew': '海盗船员',
  'navigator-big': '大领航员',
  'navigator-small': '小领航员',
  'harbor-A': '港口A',
  'harbor-B': '港口B',
  'harbor-C': '港口C',
  'shipyard-A': '修船厂A',
  'shipyard-B': '修船厂B',
  'shipyard-C': '修船厂C',
  'insurance': '保险',
};

function formatSlotName(slotId: string): string {
  if (SLOT_NAMES[slotId]) return SLOT_NAMES[slotId];
  // crew-JADE-0 → 翡翠船员1
  const crewMatch = slotId.match(/^crew-(\w+)-(\d+)$/);
  if (crewMatch) {
    const cargo = crewMatch[1].toUpperCase();
    const seat = parseInt(crewMatch[2]) + 1;
    return `${CARGO_NAMES[cargo] || cargo}船员${seat}`;
  }
  return slotId;
}

interface PlayerCardProps {
  player: PlayerState;
  isCurrentPlayer?: boolean;
  isActive?: boolean;
  onSelect?: (id: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentPlayer = false,
  isActive = true,
  onSelect
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(player.id);
    }
  };

  return (
    <div
      className={`card cursor-pointer transition-all ${isCurrentPlayer ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } ${!isActive ? 'opacity-60' : 'hover:shadow-md'} ${onSelect ? 'hover:scale-105' : ''
        }`}
      onClick={onSelect ? handleClick : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="font-semibold text-lg">{player.name}</h4>
          {player.isAI && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              AI
            </span>
          )}
          {isCurrentPlayer && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              当前玩家
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">
            {player.cash}
          </div>
          <div className="text-xs text-gray-500">现金</div>
        </div>
      </div>

      {/* 股票信息 */}
      {player.stocks.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">股票</h5>
          <div className="space-y-1">
            {player.stocks.map((stock, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${stock.cargoType === 'JADE' ? 'bg-cargo-jade' :
                      stock.cargoType === 'SILK' ? 'bg-cargo-silk' :
                        stock.cargoType === 'GINSENG' ? 'bg-cargo-ginseng' :
                          'bg-cargo-nutmeg'
                    }`}></div>
                  <span className="text-gray-600">{CARGO_NAMES[stock.cargoType] || stock.cargoType}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{stock.quantity}</span>
                  {stock.isMortgaged && (
                    <span className="text-xs text-red-600">(抵押)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 投资信息 */}
      {player.investments.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">投资</h5>
          <div className="flex flex-wrap gap-1">
            {player.investments.map((investment, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
              >
                {formatSlotName(investment.slotId)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {player.stocks.length === 0 && player.investments.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-2">
          暂无股票和投资
        </div>
      )}
    </div>
  );
};
