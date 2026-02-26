import React from 'react';
import type { ShipState } from '../../types';

interface ShipTrackProps {
  ship: ShipState;
}

const CARGO_CONFIG: Record<string, { name: string; color: string; bg: string; ring: string; dot: string }> = {
  JADE: { name: '翡翠', color: 'text-emerald-400', bg: 'bg-emerald-500/20', ring: 'ring-emerald-500/40', dot: 'bg-emerald-500' },
  SILK: { name: '丝绸', color: 'text-indigo-400', bg: 'bg-indigo-500/20', ring: 'ring-indigo-500/40', dot: 'bg-indigo-500' },
  GINSENG: { name: '人参', color: 'text-amber-400', bg: 'bg-amber-500/20', ring: 'ring-amber-500/40', dot: 'bg-amber-500' },
  NUTMEG: { name: '肉豆蔻', color: 'text-violet-400', bg: 'bg-violet-500/20', ring: 'ring-violet-500/40', dot: 'bg-violet-500' },
};

export const ShipTrack: React.FC<ShipTrackProps> = ({ ship }) => {
  const positions = Array.from({ length: 14 }, (_, i) => i);
  const cfg = CARGO_CONFIG[ship.cargoType] || CARGO_CONFIG.JADE;

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

      {/* 轨道 */}
      <div className="relative">
        <div className="absolute top-1/2 left-3 right-10 h-0.5 -translate-y-1/2 rounded" style={{ background: 'var(--color-dot-border)' }} />

        <div className="flex justify-between items-center relative">
          {positions.map(pos => {
            const isCurrent = pos === ship.position;
            const isPassed = pos < ship.position;
            const isPirate = pos === 13;

            const base = 'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium transition-all duration-300 relative ';
            let cls = base;
            let style: React.CSSProperties = {};
            if (isCurrent) {
              cls += `${cfg.bg} ${cfg.color} ring-2 ${cfg.ring} scale-110 font-bold shadow-md`;
            } else if (isPassed) {
              style = { background: 'var(--color-dot-passed)', color: 'var(--color-dot-text-passed)', border: '1px solid var(--color-dot-border)' };
            } else if (isPirate) {
              cls += 'bg-red-500/10 text-red-400 border border-red-500/20';
            } else {
              style = { background: 'var(--color-dot-future)', color: 'var(--color-dot-text-future)', border: '1px solid var(--color-dot-border)' };
            }

            return (
              <div key={pos} className={cls} style={style}>
                {isCurrent && (
                  <div className={`absolute inset-0 rounded-full ${cfg.bg} animate-ping opacity-30`} />
                )}
                <span className="relative z-10">{pos}</span>
              </div>
            );
          })}

          {/* 港口 */}
          <div className="ml-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${ship.position >= 14
              ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 scale-110'
              : ''
              }`}
              style={ship.position < 14 ? { background: 'var(--color-dot-future)', color: 'var(--color-dot-text-future)', border: '1px solid var(--color-dot-border)' } : undefined}
            >
              ⚓
            </div>
          </div>
        </div>

        {/* 标注 */}
        <div className="flex items-center mt-0.5 text-[8px]">
          <span className="t-text-3">起点</span>
          <span className="flex-1" />
          <span className="text-red-400/60 mr-6">☠ 海盗区</span>
          <span className="text-emerald-400/60">港口</span>
        </div>
      </div>

      {/* 船员 */}
      {ship.crew.length > 0 && (
        <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--color-card-border)' }}>
          <div className="flex flex-wrap gap-1">
            {ship.crew.map((member, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] t-text-2"
                style={{ background: 'var(--color-crew-bg)', border: '1px solid var(--color-crew-border)' }}
              >
                <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                {member.playerName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
