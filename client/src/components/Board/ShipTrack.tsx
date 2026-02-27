import React from 'react';
import type { ShipState } from '../../types';
import type { PlayerColor } from '../../types/uiTypes';
import { ShipVisual } from './ShipVisual';
import { useGameStore } from '../../stores';

interface ShipTrackProps {
  ship: ShipState;
  /** Optional invest-phase props for interactive ship seats */
  seatInvestments?: { slotId: string; playerId: string }[];
  playerColorMap?: Record<string, PlayerColor>;
  selectableSlotIds?: Set<string>;
  isInvestPhase?: boolean;
  currentPlayerCash?: number;
  onSeatClick?: (slotId: string, label: string, cost: number, event: React.MouseEvent) => void;
}

const CARGO_CONFIG: Record<string, { name: string; emoji: string; color: string; bg: string; ring: string; dot: string; glow: string }> = {
  JADE: { name: '翡翠', emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/20', ring: 'ring-emerald-500/40', dot: 'bg-emerald-500', glow: 'rgba(16,185,129,0.4)' },
  SILK: { name: '丝绸', emoji: '🟣', color: 'text-indigo-400', bg: 'bg-indigo-500/20', ring: 'ring-indigo-500/40', dot: 'bg-indigo-500', glow: 'rgba(99,102,241,0.4)' },
  GINSENG: { name: '人参', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/20', ring: 'ring-amber-500/40', dot: 'bg-amber-500', glow: 'rgba(245,158,11,0.4)' },
  NUTMEG: { name: '肉豆蔻', emoji: '🟤', color: 'text-violet-400', bg: 'bg-violet-500/20', ring: 'ring-violet-500/40', dot: 'bg-violet-500', glow: 'rgba(139,92,246,0.4)' },
};

export const ShipTrack: React.FC<ShipTrackProps> = ({
  ship,
  seatInvestments,
  playerColorMap,
  selectableSlotIds,
  isInvestPhase,
  currentPlayerCash,
  onSeatClick,
}) => {
  const positions = Array.from({ length: 14 }, (_, i) => i);
  const cfg = CARGO_CONFIG[ship.cargoType] || CARGO_CONFIG.JADE;
  const storeColors = useGameStore.getState().playerColors;
  const colors = playerColorMap ?? storeColors;

  // Calculate total ship visual width for position alignment
  // ShipVisual: seatCount * 36px (cell) + 12px (bow) + 4px (border)
  const shipSeats = ({ JADE: 4, SILK: 3, GINSENG: 3, NUTMEG: 3 } as Record<string, number>)[ship.cargoType] ?? 3;
  const totalShipWidth = shipSeats * 36 + 12 + 4;

  const getStatusLabel = () => {
    if (ship.isDocked) return <span className="text-emerald-400 text-[10px] font-medium">✅ 到港</span>;
    if (ship.isInShipyard) return <span className="text-amber-400 text-[10px] font-medium">🔧 修船厂</span>;
    if (ship.isHijacked) return <span className="text-red-400 text-[10px] font-medium">☠️ 被劫</span>;
    return <span className="text-ocean-400 text-[10px] font-medium">🚢 航行中</span>;
  };

  return (
    <div className="ship-track">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <h4 className={`font-semibold text-xs ${cfg.color}`}>{cfg.name}</h4>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="t-text-3">位置 <span className="t-text font-medium">{ship.position}</span></span>
          {getStatusLabel()}
        </div>
      </div>

      {/* 轨道 — 海洋航道 */}
      <div className="relative">
        {/* 波浪线背景 */}
        <svg className="absolute top-1/2 left-2 right-8 h-3 -translate-y-1/2 overflow-visible" style={{ width: 'calc(100% - 2.5rem)' }} preserveAspectRatio="none">
          <path
            d="M0,6 Q8,2 16,6 T32,6 T48,6 T64,6 T80,6 T96,6 T112,6 T128,6 T144,6 T160,6 T176,6 T192,6 T208,6 T224,6 T240,6 T256,6 T272,6 T288,6 T304,6 T320,6 T336,6 T352,6 T368,6 T384,6 T400,6 T416,6 T432,6 T448,6 T464,6 T480,6"
            fill="none"
            stroke="var(--color-dot-border)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            className="wave-line"
          />
        </svg>

        <div className="flex justify-between items-center relative">
          {positions.map(pos => {
            const isCurrent = pos === ship.position;
            const isPassed = pos < ship.position;
            const isPirate = pos === 13;

            if (isCurrent) {
              // 当前位置 — 船只图标 + 脉冲光晕
              return (
                <div key={pos} className="relative flex items-center justify-center" style={{ zIndex: 10 }}>
                  {/* 脉冲光晕 */}
                  <div
                    className="absolute w-8 h-8 rounded-full animate-ping opacity-20"
                    style={{ background: cfg.glow }}
                  />
                  <div
                    className="absolute w-7 h-7 rounded-full animate-pulse opacity-30"
                    style={{ background: cfg.glow }}
                  />
                  {/* 船只 */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${cfg.bg} ring-2 ${cfg.ring} shadow-lg ship-move`}
                    style={{ boxShadow: `0 0 12px ${cfg.glow}` }}
                  >
                    ⛵
                  </div>
                </div>
              );
            }

            const base = 'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium transition-all duration-500 ';
            let cls = base;
            let style: React.CSSProperties = {};

            if (isPassed) {
              // 已经过的位置 — 淡化 + 航迹标记
              cls += 'opacity-50 ';
              style = { background: 'var(--color-dot-passed)', color: 'var(--color-dot-text-passed)', border: '1px solid var(--color-dot-border)' };
            } else if (isPirate) {
              // 海盗区 — 红色骷髅
              return (
                <div key={pos} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] bg-red-500/10 border border-red-500/20 relative">
                  <span className="relative z-10">☠</span>
                </div>
              );
            } else {
              // 未到达的位置
              style = { background: 'var(--color-dot-future)', color: 'var(--color-dot-text-future)', border: '1px solid var(--color-dot-border)' };
            }

            return (
              <div key={pos} className={cls} style={style}>
                <span className="relative z-10">{pos}</span>
              </div>
            );
          })}

          {/* 港口 — 目的地 */}
          <div className="ml-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${ship.position >= 14
              ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 scale-110 shadow-lg'
              : ''
              }`}
              style={ship.position < 14 ? { background: 'var(--color-dot-future)', border: '1px solid var(--color-dot-border)' } : { boxShadow: '0 0 12px rgba(16,185,129,0.3)' }}
            >
              🏠
            </div>
          </div>
        </div>

        {/* 标注 */}
        <div className="flex items-center mt-0.5 text-[8px]">
          <span className="t-text-3">起点</span>
          <span className="flex-1" />
          <span className="text-red-400/60 mr-5">☠ 海盗</span>
          <span className="text-emerald-400/60">港口</span>
        </div>
      </div>

      {/* 船体可视化 — 对齐航道但保证全船可见 */}
      <div className="mt-1.5 pt-1.5 relative overflow-hidden" style={{ borderTop: '1px solid var(--color-card-border)' }}>
        <div
          style={{
            // Align bow with track position, but never go negative (ship stern stays at left edge)
            marginLeft: `max(0px, calc(${(Math.min(ship.position, 14) / 14) * 100}% - ${totalShipWidth}px))`,
            transition: 'margin-left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'inline-block',
          }}
        >
          <ShipVisual
            cargo={ship.cargoType}
            crew={ship.crew}
            playerColors={colors}
            isDocked={ship.isDocked}
            seatInvestments={seatInvestments}
            selectableSlotIds={selectableSlotIds}
            isInvestPhase={isInvestPhase}
            currentPlayerCash={currentPlayerCash}
            onSeatClick={onSeatClick}
          />
        </div>
      </div>
    </div>
  );
};
