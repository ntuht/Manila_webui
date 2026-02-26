import React from 'react';
import { useGameStore } from '../../stores';

export const GameStatus: React.FC = () => {
  const { gameState, currentPhase } = useGameStore();

  if (!gameState) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">游戏状态</h3>
        <p className="text-slate-500 text-sm">游戏未开始</p>
      </div>
    );
  }

  const phaseConfig: Record<string, { text: string; color: string; bg: string }> = {
    'AUCTION': { text: '拍卖阶段', color: 'text-ocean-400', bg: 'bg-ocean-500/10' },
    'HARBOR_MASTER': { text: '港务长行动', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    'INVESTMENT': { text: '投资阶段', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    'SAILING': { text: '航行阶段', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    'SETTLEMENT': { text: '结算阶段', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    'GAME_END': { text: '游戏结束', color: 'text-slate-400', bg: 'bg-white/5' },
  };

  const phase = phaseConfig[currentPhase] || { text: currentPhase, color: 'text-slate-400', bg: 'bg-white/5' };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">游戏状态</h3>
      <div className="space-y-2.5">
        {/* 当前阶段 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">阶段</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${phase.bg} ${phase.color}`}>
            {phase.text}
          </span>
        </div>

        {/* 轮数 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">轮次</span>
          <span className="text-sm font-medium text-slate-200">
            {gameState.round}
          </span>
        </div>

        {/* 船只状态 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">船只</span>
          <div className="flex gap-1">
            {gameState.ships.map(ship => (
              <div
                key={ship.id}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${ship.isDocked ? 'bg-emerald-500' :
                    ship.isInShipyard ? 'bg-amber-500' :
                      ship.isHijacked ? 'bg-red-500' :
                        'bg-slate-600'
                  }`}
                title={`${ship.cargoType}: ${ship.isDocked ? '已到港' : ship.isInShipyard ? '修船厂' : ship.isHijacked ? '被劫持' : '航行中'}`}
              />
            ))}
          </div>
        </div>

        {/* 港务长 */}
        {gameState.auctionWinner && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">港务长</span>
            <span className="text-sm font-medium text-ocean-400">
              {gameState.players.find(p => p.id === gameState.auctionWinner)?.name}
            </span>
          </div>
        )}

        {/* 投资进度 */}
        {gameState.investmentRound && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">投资进度</span>
            <span className="text-xs text-slate-300">
              {gameState.investmentRound.currentPlayerIndex + 1}/{gameState.investmentRound.investmentOrder.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
