import React from 'react';
import { useGameStore } from '../../stores';

function formatBidDetail(detail: string): string {
  try {
    const data = JSON.parse(detail);
    return `出价 💰${data.amount}`;
  } catch {
    return detail;
  }
}

export const BidHistory: React.FC = () => {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  const bidHistory = gameState.history.filter(entry =>
    entry.action === 'BID' || entry.action === 'PASS_AUCTION'
  ).slice(-8);

  if (bidHistory.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 mb-1">📢 出价历史</h3>
        <p className="text-[10px] text-slate-600">暂无记录</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xs font-semibold text-slate-400 mb-2">📢 出价历史</h3>
      <div className="space-y-1">
        {bidHistory.map((entry) => {
          const player = gameState.players.find(p => p.id === entry.playerId);
          const isPass = entry.action === 'PASS_AUCTION';
          return (
            <div key={entry.id} className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">
                {player?.isAI ? '🤖' : '👤'} {player?.name}
              </span>
              <span className={`font-medium ${isPass ? 'text-slate-500' : 'text-ocean-400'}`}>
                {isPass ? '放弃' : formatBidDetail(entry.detail)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
