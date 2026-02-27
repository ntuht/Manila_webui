import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared';
import { AI_STRATEGY_OPTIONS } from '../../ai';
import type { UIGameConfig, UIAIPlayerConfig, PlayerColor } from '../../types/uiTypes';
import { PLAYER_COLORS, PLAYER_COLOR_CONFIG } from '../../types/uiTypes';

export const Lobby: React.FC = () => {
  const { startGame } = useGameStore();
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const rounds = 99; // Safety cap; game ends when any stock hits 30
  const [playerName, setPlayerName] = useState('你');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('red');
  const [aiPlayers, setAiPlayers] = useState<UIAIPlayerConfig[]>([
    { name: 'AI 1', strategy: 'onnx' },
    { name: 'AI 2', strategy: 'onnx' },
  ]);

  const updatePlayerCount = (count: 3 | 4) => {
    setPlayerCount(count);
    const newAi = [...aiPlayers];
    while (newAi.length < count - 1) {
      newAi.push({ name: `AI ${newAi.length + 1}`, strategy: 'onnx' });
    }
    while (newAi.length > count - 1) {
      newAi.pop();
    }
    setAiPlayers(newAi);
  };

  const updateAiStrategy = (index: number, strategy: string) => {
    const newAi = [...aiPlayers];
    newAi[index] = { ...newAi[index], strategy };
    setAiPlayers(newAi);
  };

  const updateAiName = (index: number, name: string) => {
    const newAi = [...aiPlayers];
    newAi[index] = { ...newAi[index], name };
    setAiPlayers(newAi);
  };

  const handleStartGame = () => {
    const config: UIGameConfig = {
      players: playerCount,
      rounds,
      aiPlayers,
      playerColor,
    };
    startGame(config);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme toggle */}
      <button
        onClick={() => {
          const html = document.documentElement;
          const isDark = html.classList.contains('dark');
          html.classList.toggle('dark');
          localStorage.setItem('manila-theme', isDark ? 'light' : 'dark');
        }}
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center t-text-2 hover:t-text transition-colors"
        style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
        title="切换主题"
      >
        <span className="dark:hidden">🌙</span>
        <span className="hidden dark:inline">☀️</span>
      </button>
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-ocean-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-cargo-silk/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-xl w-full relative z-10 animate-fade-in">
        {/* 标题区 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-6xl font-black font-display text-gold-gradient mb-3 tracking-tight">
            Manila
          </h1>
          <p className="text-lg t-text-2 font-medium">
            ⛵ 航海商贸 · 策略桌游
          </p>
        </div>

        {/* 游戏设置面板 */}
        <div className="card-light rounded-2xl p-6 mb-6 space-y-5">
          <h2 className="text-base font-semibold t-text font-display flex items-center gap-2">
            <span className="text-lg">⚙️</span> 游戏设置
          </h2>

          {/* 玩家名 */}
          <div>
            <label className="block text-sm font-medium t-text-2 mb-1.5">你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3.5 py-2.5 border rounded-lg t-text focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500/30 transition-all"
              style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
              placeholder="输入你的名字"
            />
          </div>

          {/* 玩家颜色 */}
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">选择颜色</label>
            <div className="flex items-center gap-3">
              {PLAYER_COLORS.map((c) => {
                const cfg = PLAYER_COLOR_CONFIG[c];
                const isSelected = c === playerColor;
                return (
                  <button
                    key={c}
                    onClick={() => setPlayerColor(c)}
                    className="relative group transition-all duration-200"
                    title={cfg.label}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: cfg.fill,
                        border: `3px solid ${isSelected ? cfg.border : 'transparent'}`,
                        boxShadow: isSelected ? `0 0 12px ${cfg.fill}60` : undefined,
                        transform: isSelected ? 'scale(1.15)' : undefined,
                        opacity: isSelected ? 1 : 0.6,
                      }}
                    >
                      {isSelected && (
                        <span className="text-white text-sm font-bold drop-shadow-md">✓</span>
                      )}
                    </div>
                    <span className="block text-center text-[10px] t-text-3 mt-1">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 玩家数量 */}
          <div>
            <label className="block text-sm font-medium t-text-2 mb-1.5">玩家数量</label>
            <select
              value={playerCount}
              onChange={(e) => updatePlayerCount(parseInt(e.target.value) as 3 | 4)}
              className="w-full px-3.5 py-2.5 border rounded-lg t-text focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500/30 transition-all appearance-none cursor-pointer"
              style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
            >
              <option value={3}>3 人 (1 人类 + 2 AI)</option>
              <option value={4}>4 人 (1 人类 + 3 AI)</option>
            </select>
          </div>

          {/* 游戏结束条件 */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gold-400/5 border border-gold-400/10 rounded-lg text-sm text-gold-300">
            <span>📈</span>
            <span>任一股票价格达到 <strong className="text-gold-400">30 元</strong> 时游戏结束</span>
          </div>

          {/* AI 对手 */}
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">AI 对手</label>
            <div className="space-y-2.5">
              {aiPlayers.map((ai, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-card-border)' }}>
                  <span className="text-lg flex-shrink-0">🤖</span>
                  <input
                    type="text"
                    value={ai.name}
                    onChange={(e) => updateAiName(index, e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-md text-sm t-text focus:outline-none focus:ring-2 focus:ring-ocean-500/50 transition-all"
                    style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
                    placeholder={`AI ${index + 1}`}
                  />
                  <select
                    value={ai.strategy}
                    onChange={(e) => updateAiStrategy(index, e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-md text-sm t-text focus:outline-none focus:ring-2 focus:ring-ocean-500/50 transition-all appearance-none cursor-pointer"
                    style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
                  >
                    {AI_STRATEGY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 开始按钮 */}
        <div className="text-center mb-8">
          <button
            onClick={handleStartGame}
            className="w-full sm:w-auto px-10 py-3.5 text-lg font-bold font-display rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 hover:shadow-glow-gold transition-all duration-300 active:scale-[0.97]"
          >
            ⚓ 开始游戏
          </button>
        </div>

        {/* 底部信息 */}
        <div className="text-center text-xs t-text-3 space-y-1">
          <p>Manila Web UI</p>
          <p>AI 模型经过 500K+ 局自对弈训练</p>
        </div>
      </div>
    </div>
  );
};