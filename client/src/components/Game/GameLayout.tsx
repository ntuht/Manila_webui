import React from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';

interface GameLayoutProps {
  children: React.ReactNode;
}

const PHASE_LABELS: Record<string, { icon: string; text: string; color: string }> = {
  AUCTION: { icon: '⚡', text: '拍卖', color: 'text-ocean-400 bg-ocean-500/10' },
  HARBOR_MASTER: { icon: '🎯', text: '港务长', color: 'text-indigo-400 bg-indigo-500/10' },
  INVESTMENT: { icon: '💰', text: '投资', color: 'text-emerald-400 bg-emerald-500/10' },
  SAILING: { icon: '⛵', text: '航行', color: 'text-violet-400 bg-violet-500/10' },
  SETTLEMENT: { icon: '📊', text: '结算', color: 'text-amber-400 bg-amber-500/10' },
  GAME_END: { icon: '🏆', text: '结束', color: 'text-gold-400 bg-gold-400/10' },
};

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  if (isDark) {
    html.classList.remove('dark');
    localStorage.setItem('manila-theme', 'light');
  } else {
    html.classList.add('dark');
    localStorage.setItem('manila-theme', 'dark');
  }
}

export const GameLayout: React.FC<GameLayoutProps> = ({ children }) => {
  const { gameState, currentPhase, getEngineState } = useGameStore();
  const engineState = getEngineState();
  const pendingPlayer = engineState?.players.find(p => p.id === engineState?.pendingAction?.playerId);
  const phase = PHASE_LABELS[currentPhase] || { icon: '🎮', text: '游戏', color: 't-text-3 bg-white/5' };

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <header className="glass border-b sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* 左: Logo + 轮次 */}
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold font-display text-gold-gradient">Manila</h1>
              {gameState && (
                <div className="flex items-center gap-2">
                  <span className="t-text-m text-[10px]">|</span>
                  <span className="t-text-2 text-xs">第 {gameState.round} 轮</span>
                </div>
              )}
            </div>

            {/* 中: 阶段标签 + 当前操作者 */}
            {gameState && (
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${phase.color}`}>
                  {phase.icon} {phase.text}
                </span>
                {pendingPlayer && (
                  <span className="t-text-3 text-xs">
                    {pendingPlayer.isAI ? '🤖' : '👤'} {pendingPlayer.name}
                  </span>
                )}
              </div>
            )}

            {/* 右: 主题切换 + 退出 */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-lg flex items-center justify-center t-text-2 hover:t-text transition-colors"
                style={{ background: 'var(--color-input-bg)' }}
                title="切换主题"
              >
                <span className="dark:hidden">🌙</span>
                <span className="hidden dark:inline">☀️</span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => useGameStore.getState().endGame()}
              >
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        {children}
      </main>
    </div>
  );
};
