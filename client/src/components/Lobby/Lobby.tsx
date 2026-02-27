import React, { useState } from 'react';
import { useGameStore, useMultiplayerStore } from '../../stores';
import { Button } from '../Shared';
import { AI_STRATEGY_OPTIONS } from '../../ai';
import type { UIGameConfig, UIAIPlayerConfig, PlayerColor } from '../../types/uiTypes';
import { PLAYER_COLORS, PLAYER_COLOR_CONFIG } from '../../types/uiTypes';

type LobbyMode = 'select' | 'solo' | 'multi-create' | 'multi-join' | 'multi-room';

export const Lobby: React.FC = () => {
  const { startGame } = useGameStore();
  const mpStore = useMultiplayerStore();
  const [mode, setMode] = useState<LobbyMode>('select');

  // Solo settings
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const rounds = 99;
  const [playerName, setPlayerName] = useState('你');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('red');
  const [aiPlayers, setAiPlayers] = useState<UIAIPlayerConfig[]>([
    { name: 'AI 1', strategy: 'onnx' },
    { name: 'AI 2', strategy: 'onnx' },
  ]);

  // Multiplayer settings
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<3 | 4>(3);
  const [isConnecting, setIsConnecting] = useState(false);

  // Solo helpers
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

  const handleStartSoloGame = () => {
    const config: UIGameConfig = {
      players: playerCount,
      rounds,
      aiPlayers,
      playerColor,
    };
    startGame(config);
  };

  // Multiplayer helpers
  const handleCreateRoom = async () => {
    setIsConnecting(true);
    try {
      await mpStore.createRoom(playerName || '玩家', playerColor, maxPlayers);
      setMode('multi-room');
    } catch (e) {
      console.error('Failed to create room:', e);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (joinCode.length !== 4) return;
    setIsConnecting(true);
    try {
      await mpStore.joinRoom(joinCode, playerName || '玩家', playerColor);
      setMode('multi-room');
    } catch (e) {
      console.error('Failed to join room:', e);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartMultiplayerGame = () => {
    mpStore.startMultiplayerGame();
  };

  // ==================== Render Helpers ====================

  const renderHeader = () => (
    <div className="text-center mb-8">
      <h1 className="text-4xl sm:text-6xl font-black font-display text-gold-gradient mb-3 tracking-tight">
        Manila
      </h1>
      <p className="text-lg t-text-2 font-medium">
        ⛵ 航海商贸 · 策略桌游
      </p>
    </div>
  );

  const renderThemeToggle = () => (
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
  );

  const renderColorPicker = () => (
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
              <span className="block text-center text-[10px] t-text-3 mt-1">{cfg.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderNameInput = () => (
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
  );

  const renderBackButton = (target: LobbyMode = 'select') => (
    <button
      onClick={() => {
        if (mode === 'multi-room') {
          mpStore.leaveRoom();
        }
        setMode(target);
      }}
      className="text-sm t-text-2 hover:t-text transition-colors mb-4 flex items-center gap-1"
    >
      ← 返回
    </button>
  );

  // ==================== Mode Select ====================

  if (mode === 'select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {renderThemeToggle()}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-ocean-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-md w-full relative z-10 animate-fade-in">
          {renderHeader()}

          <div className="space-y-4">
            <button
              onClick={() => setMode('solo')}
              className="w-full card-light rounded-2xl p-6 text-left hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🎮</span>
                <div>
                  <h2 className="text-lg font-bold font-display t-text">单机对战</h2>
                  <p className="text-sm t-text-2 mt-0.5">与 AI 对手进行对战</p>
                </div>
                <span className="ml-auto text-lg t-text-3 group-hover:t-text-2 transition-colors">→</span>
              </div>
            </button>

            <button
              onClick={() => setMode('multi-create')}
              className="w-full card-light rounded-2xl p-6 text-left hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🌐</span>
                <div>
                  <h2 className="text-lg font-bold font-display t-text">创建房间</h2>
                  <p className="text-sm t-text-2 mt-0.5">建立多人联机房间，邀请朋友加入</p>
                </div>
                <span className="ml-auto text-lg t-text-3 group-hover:t-text-2 transition-colors">→</span>
              </div>
            </button>

            <button
              onClick={() => setMode('multi-join')}
              className="w-full card-light rounded-2xl p-6 text-left hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🔗</span>
                <div>
                  <h2 className="text-lg font-bold font-display t-text">加入房间</h2>
                  <p className="text-sm t-text-2 mt-0.5">输入房间码加入已有的游戏</p>
                </div>
                <span className="ml-auto text-lg t-text-3 group-hover:t-text-2 transition-colors">→</span>
              </div>
            </button>
          </div>

          <div className="text-center text-xs t-text-3 space-y-1 mt-8">
            <p>Manila Web UI</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== Solo Mode ====================

  if (mode === 'solo') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {renderThemeToggle()}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-ocean-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl w-full relative z-10 animate-fade-in">
          {renderBackButton()}
          {renderHeader()}

          <div className="card-light rounded-2xl p-6 mb-6 space-y-5">
            <h2 className="text-base font-semibold t-text font-display flex items-center gap-2">
              <span className="text-lg">🎮</span> 单机对战
            </h2>

            {renderNameInput()}
            {renderColorPicker()}

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

            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gold-400/5 border border-gold-400/10 rounded-lg text-sm text-gold-300">
              <span>📈</span>
              <span>任一股票价格达到 <strong className="text-gold-400">30 元</strong> 时游戏结束</span>
            </div>

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

          <div className="text-center mb-8">
            <button
              onClick={handleStartSoloGame}
              className="w-full sm:w-auto px-10 py-3.5 text-lg font-bold font-display rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 hover:shadow-glow-gold transition-all duration-300 active:scale-[0.97]"
            >
              ⚓ 开始游戏
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== Multi: Create Room ====================

  if (mode === 'multi-create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {renderThemeToggle()}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-ocean-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl w-full relative z-10 animate-fade-in">
          {renderBackButton()}
          {renderHeader()}

          <div className="card-light rounded-2xl p-6 mb-6 space-y-5">
            <h2 className="text-base font-semibold t-text font-display flex items-center gap-2">
              <span className="text-lg">🌐</span> 创建联机房间
            </h2>

            {renderNameInput()}
            {renderColorPicker()}

            <div>
              <label className="block text-sm font-medium t-text-2 mb-1.5">总玩家数</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) as 3 | 4)}
                className="w-full px-3.5 py-2.5 border rounded-lg t-text focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500/30 transition-all appearance-none cursor-pointer"
                style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
              >
                <option value={3}>3 人</option>
                <option value={4}>4 人</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-ocean-500/5 border border-ocean-500/10 rounded-lg text-sm t-text-2">
              <span>💡</span>
              <span>未被人类玩家占据的位置将由 AI 自动填充</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <button
              onClick={handleCreateRoom}
              disabled={isConnecting}
              className="w-full sm:w-auto px-10 py-3.5 text-lg font-bold font-display rounded-xl bg-gradient-to-r from-ocean-400 to-ocean-600 text-white hover:shadow-glow-ocean transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
            >
              {isConnecting ? '连接中...' : '🌐 创建房间'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== Multi: Join Room ====================

  if (mode === 'multi-join') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {renderThemeToggle()}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-ocean-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl w-full relative z-10 animate-fade-in">
          {renderBackButton()}
          {renderHeader()}

          <div className="card-light rounded-2xl p-6 mb-6 space-y-5">
            <h2 className="text-base font-semibold t-text font-display flex items-center gap-2">
              <span className="text-lg">🔗</span> 加入房间
            </h2>

            {renderNameInput()}
            {renderColorPicker()}

            <div>
              <label className="block text-sm font-medium t-text-2 mb-1.5">房间码</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                className="w-full px-3.5 py-2.5 border rounded-lg t-text text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500/30 transition-all"
                style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
                placeholder="XXXX"
                maxLength={4}
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <button
              onClick={handleJoinRoom}
              disabled={joinCode.length !== 4 || isConnecting}
              className="w-full sm:w-auto px-10 py-3.5 text-lg font-bold font-display rounded-xl bg-gradient-to-r from-ocean-400 to-ocean-600 text-white hover:shadow-glow-ocean transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
            >
              {isConnecting ? '连接中...' : '🔗 加入房间'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== Multi: Room (Waiting / Playing) ====================

  if (mode === 'multi-room') {
    const room = mpStore.roomState;
    if (!room) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center animate-pulse">
            <p className="t-text-2">连接中...</p>
          </div>
        </div>
      );
    }

    const humanPlayers = room.players;
    const totalHumans = humanPlayers.filter(p => p.isConnected).length;
    const totalAI = room.aiSlots.length;
    const totalPlayers = totalHumans + totalAI;
    const allReady = humanPlayers.every(p => p.isHost || p.isReady);
    const canStart = mpStore.isHost && allReady && totalPlayers >= 3;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {renderThemeToggle()}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-ocean-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-xl w-full relative z-10 animate-fade-in">
          {renderBackButton()}
          {renderHeader()}

          <div className="card-light rounded-2xl p-6 mb-6 space-y-5">
            {/* Room Code */}
            <div className="text-center">
              <p className="text-sm t-text-2 mb-2">房间码</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-mono font-black tracking-[0.3em] t-text">
                  {room.roomCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(room.roomCode);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg t-text-2 hover:t-text transition-colors"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-card-border)' }}
                  title="复制房间码"
                >
                  📋 复制
                </button>
              </div>
              <p className="text-xs t-text-3 mt-2">
                {totalHumans}/{room.maxPlayers} 位玩家已连接
                {totalAI > 0 && ` · ${totalAI} AI`}
              </p>
            </div>

            {/* Player List */}
            <div>
              <label className="block text-sm font-medium t-text-2 mb-2">玩家列表</label>
              <div className="space-y-2">
                {humanPlayers.map((p) => {
                  const colorCfg = PLAYER_COLOR_CONFIG[p.color];
                  return (
                    <div
                      key={p.peerId}
                      className="flex items-center gap-3 rounded-lg p-3"
                      style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-card-border)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorCfg.fill }}
                      />
                      <span className="flex-1 font-medium t-text text-sm">{p.name}</span>
                      <div className="flex items-center gap-2">
                        {p.isHost && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-400 font-medium">
                            房主
                          </span>
                        )}
                        {!p.isConnected ? (
                          <span className="text-xs text-red-400">断开</span>
                        ) : p.isReady ? (
                          <span className="text-xs text-green-400">✓ 就绪</span>
                        ) : (
                          <span className="text-xs t-text-3">等待中</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* AI Slots */}
                {room.aiSlots.map((ai) => (
                  <div
                    key={`ai-${ai.slotIndex}`}
                    className="flex items-center gap-3 rounded-lg p-3 opacity-60"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-card-border)' }}
                  >
                    <span className="text-lg flex-shrink-0">🤖</span>
                    <span className="flex-1 font-medium t-text text-sm">{ai.name}</span>
                    <span className="text-xs t-text-3">{ai.strategy}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready button (for non-host) */}
            {!mpStore.isHost && (
              <div className="text-center">
                <button
                  onClick={() => {
                    const me = humanPlayers.find(p => p.peerId === mpStore.localPeerId);
                    mpStore.setReady(!me?.isReady);
                  }}
                  className="px-6 py-2.5 text-sm font-bold font-display rounded-xl transition-all duration-300 active:scale-[0.97]"
                  style={{
                    background: humanPlayers.find(p => p.peerId === mpStore.localPeerId)?.isReady
                      ? 'linear-gradient(to right, #22c55e, #16a34a)'
                      : 'var(--color-input-bg)',
                    color: humanPlayers.find(p => p.peerId === mpStore.localPeerId)?.isReady
                      ? 'white'
                      : 'var(--color-text-primary)',
                    border: '1px solid var(--color-card-border)',
                  }}
                >
                  {humanPlayers.find(p => p.peerId === mpStore.localPeerId)?.isReady
                    ? '✓ 已就绪'
                    : '点击就绪'}
                </button>
              </div>
            )}
          </div>

          {/* Start Game (host only) */}
          {mpStore.isHost && (
            <div className="text-center mb-8">
              <button
                onClick={handleStartMultiplayerGame}
                disabled={!canStart}
                className="w-full sm:w-auto px-10 py-3.5 text-lg font-bold font-display rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 hover:shadow-glow-gold transition-all duration-300 active:scale-[0.97] disabled:opacity-50"
              >
                ⚓ 开始游戏 ({totalPlayers}人)
              </button>
              {!canStart && (
                <p className="text-xs t-text-3 mt-2">
                  {totalPlayers < 3 ? '需要至少 3 人' : '等待所有玩家就绪'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};