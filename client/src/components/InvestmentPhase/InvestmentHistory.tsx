import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';

const CARGO_CN: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};

const SLOT_CN: Record<string, string> = {
  'pirate-captain': '海盗船长', 'pirate-crew': '海盗船员',
  'navigator-big': '大领航员', 'navigator-small': '小领航员',
  'harbor-A': '港口A', 'harbor-B': '港口B', 'harbor-C': '港口C',
  'shipyard-A': '修船厂A', 'shipyard-B': '修船厂B', 'shipyard-C': '修船厂C',
  'insurance': '保险',
};

function formatSlot(slotId: string): string {
  if (SLOT_CN[slotId]) return SLOT_CN[slotId];
  const m = slotId.match(/^crew-(\w+)-(\d+)$/);
  if (m) return `${CARGO_CN[m[1].toUpperCase()] || m[1]}船员${parseInt(m[2]) + 1}`;
  return slotId;
}

function formatDetail(detail: string): string {
  try {
    const data = JSON.parse(detail);
    const slot = formatSlot(data.slotId || '');
    return `${slot} (💰${data.cost})`;
  } catch {
    return detail;
  }
}

export const InvestmentHistory: React.FC = () => {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const investmentHistory = gameState.history.filter(entry =>
    entry.action === 'SELECT_INVESTMENT' || entry.action === 'SKIP_INVEST'
  ).slice(-10);

  if (investmentHistory.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 mb-1">📋 投资历史</h3>
        <p className="text-[10px] text-slate-600">暂无记录</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xs font-semibold text-slate-400 mb-2">📋 投资历史</h3>
      <div className="space-y-1">
        {investmentHistory.map((entry) => {
          const player = gameState.players.find(p => p.id === entry.playerId);
          const isSkip = entry.action === 'SKIP_INVEST';
          return (
            <div key={entry.id} className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">
                {player?.isAI ? '🤖' : '👤'} {player?.name}
              </span>
              <span className={`font-medium ${isSkip ? 'text-slate-500' : 'text-emerald-400'}`}>
                {isSkip ? '跳过' : formatDetail(entry.detail)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
