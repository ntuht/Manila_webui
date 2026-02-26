import React from 'react';
import type { PlayerState } from '../../types';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

const CARGO_DOTS: Record<string, string> = {
  JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
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
    if (onSelect) onSelect(player.id);
  };

  return (
    <div
      className={[
        'card transition-all duration-200',
        isCurrentPlayer ? 'ring-2 ring-gold-400/50 border-gold-400/20 animate-pulse-glow' : '',
        !isActive ? 'opacity-50' : '',
        onSelect ? 'hover:scale-[1.02] cursor-pointer' : '',
      ].join(' ')}
      onClick={onSelect ? handleClick : undefined}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm text-slate-100">{player.name}</h4>
          {player.isAI && (
            <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">AI</span>
          )}
          {isCurrentPlayer && (
            <span className="text-[10px] bg-gold-400/15 text-gold-400 px-1.5 py-0.5 rounded font-medium">当前</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-gold-400">{player.cash}</div>
          <div className="text-[10px] text-slate-500">现金</div>
        </div>
      </div>

      {/* 股票 */}
      {player.stocks.length > 0 && (
        <div className="mb-2.5">
          <h5 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">股票</h5>
          <div className="space-y-1">
            {player.stocks.map((stock, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${CARGO_DOTS[stock.cargoType] || 'bg-gray-500'}`} />
                  <span className="text-slate-300">{CARGO_NAMES[stock.cargoType] || stock.cargoType}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-200">{stock.quantity}</span>
                  {stock.isMortgaged && (
                    <span className="text-[10px] text-red-400">(抵押)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 投资 */}
      {player.investments.length > 0 && (
        <div>
          <h5 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">投资</h5>
          <div className="flex flex-wrap gap-1">
            {player.investments.map((investment, index) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-ocean-500/10 text-ocean-400 border border-ocean-500/10"
              >
                {formatSlotName(investment.slotId)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {player.stocks.length === 0 && player.investments.length === 0 && (
        <div className="text-center text-slate-600 text-xs py-2">
          暂无股票和投资
        </div>
      )}
    </div>
  );
};
