import React from 'react';

interface InvestmentSlotProps {
  slot: {
    id: string;
    type: string;
    name: string;
    cost: number;
    reward: number;
    requirements?: string;
    seats?: number;
    cargoType?: string;
    isOccupied: boolean;
  };
  isSelectable: boolean;
  onSelect: () => void;
}

const SLOT_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  CREW: { border: 'border-ocean-500/20', bg: 'bg-ocean-500/5', icon: '👥' },
  HARBOR_OFFICE: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', icon: '🏢' },
  SHIPYARD_OFFICE: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', icon: '🔧' },
  PIRATE: { border: 'border-red-500/20', bg: 'bg-red-500/5', icon: '🏴‍☠️' },
  NAVIGATOR: { border: 'border-violet-500/20', bg: 'bg-violet-500/5', icon: '🧭' },
  INSURANCE: { border: 'border-gold-400/20', bg: 'bg-gold-400/5', icon: '🛡️' },
};

export const InvestmentSlot: React.FC<InvestmentSlotProps> = ({
  slot,
  isSelectable,
  onSelect
}) => {
  const style = SLOT_STYLES[slot.type] || { border: 'border-white/10', bg: 'bg-white/3', icon: '📋' };

  return (
    <div
      className={[
        'rounded-xl p-3 border transition-all duration-200',
        style.bg,
        style.border,
        isSelectable && !slot.isOccupied
          ? 'hover:scale-[1.02] hover:shadow-glow-sm cursor-pointer'
          : slot.isOccupied
            ? 'opacity-40 cursor-not-allowed'
            : 'opacity-50 cursor-not-allowed',
      ].join(' ')}
      onClick={isSelectable && !slot.isOccupied ? onSelect : undefined}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{style.icon}</span>
          <h4 className="font-medium text-xs text-slate-200">{slot.name}</h4>
        </div>
        {slot.isOccupied && (
          <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">
            已占用
          </span>
        )}
      </div>

      {/* 信息 */}
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">成本</span>
          <span className="font-medium text-amber-400">{slot.cost}</span>
        </div>

        {slot.reward > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">奖励</span>
            <span className="font-medium text-emerald-400">{slot.reward}</span>
          </div>
        )}

        {slot.requirements && (
          <div className="mt-1">
            <span className="text-[10px] text-slate-600">{slot.requirements}</span>
          </div>
        )}
      </div>

      {/* 选择按钮 */}
      {isSelectable && !slot.isOccupied && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <button
            className="w-full text-[10px] font-medium bg-ocean-500/20 text-ocean-400 py-1.5 px-3 rounded-lg hover:bg-ocean-500/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            选择投资
          </button>
        </div>
      )}
    </div>
  );
};
