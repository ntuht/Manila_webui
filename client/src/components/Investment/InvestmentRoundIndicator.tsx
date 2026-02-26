import React from 'react';
import { useGameStore } from '../../stores';

export const InvestmentRoundIndicator: React.FC = () => {
  const { gameState } = useGameStore();
  const { investmentRound } = gameState || {};

  if (!investmentRound) return null;

  const currentPlayer = gameState?.players.find(
    p => p.id === investmentRound.investmentOrder[investmentRound.currentPlayerIndex]
  );

  const progress = ((investmentRound.currentPlayerIndex + 1) / investmentRound.investmentOrder.length) * 100;

  return (
    <>
      {/* 桌面: 完整版 */}
      <div className="glass-light rounded-xl p-4 hidden lg:block">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold t-text">
              投资轮次 {investmentRound.currentRound}/{investmentRound.totalRounds}
            </h4>
            <p className="text-xs t-text-2">当前: {currentPlayer?.name}</p>
          </div>
          <div className="flex gap-1.5">
            {investmentRound.investmentOrder.map((playerId, index) => {
              const player = gameState?.players.find(p => p.id === playerId);
              const isActive = index === investmentRound.currentPlayerIndex;
              return (
                <div
                  key={playerId}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium ${isActive
                    ? 'bg-ocean-500/20 text-ocean-400 ring-1 ring-ocean-500/30'
                    : 't-text-m'
                    }`}
                  title={player?.name}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] t-text-3 mb-1">
            <span>投资进度</span>
            <span>{investmentRound.currentPlayerIndex + 1} / {investmentRound.investmentOrder.length}</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-input-bg)' }}>
            <div
              className="bg-ocean-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 移动端: 紧凑单行 banner */}
      <div className="lg:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px]" style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}>
        <span className="t-text-2 font-medium">
          📋 轮次 {investmentRound.currentRound}/{investmentRound.totalRounds}
        </span>
        <span className="t-text-3">·</span>
        <span className="text-ocean-400 font-medium">{currentPlayer?.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-16 rounded-full h-1" style={{ background: 'var(--color-input-bg)' }}>
            <div className="bg-ocean-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="t-text-m">{investmentRound.currentPlayerIndex + 1}/{investmentRound.investmentOrder.length}</span>
        </div>
      </div>
    </>
  );
};
