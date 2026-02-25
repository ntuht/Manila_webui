import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button, Card } from '../Shared';
import { AI_STRATEGY_OPTIONS } from '../../ai';
import type { UIGameConfig, UIAIPlayerConfig } from '../../types/uiTypes';

export const Lobby: React.FC = () => {
  const { startGame } = useGameStore();
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const rounds = 99; // Safety cap; game ends when any stock hits 30
  const [playerName, setPlayerName] = useState('你');
  const [aiPlayers, setAiPlayers] = useState<UIAIPlayerConfig[]>([
    { name: 'AI 1', strategy: 'onnx' },
    { name: 'AI 2', strategy: 'onnx' },
  ]);

  // Keep AI player count in sync with player count
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
    };
    startGame(config);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Manila</h1>
          <p className="text-lg text-gray-600">策略桌游的现代化体验</p>
          <p className="text-sm text-indigo-500 mt-1">🤖 搭载 ONNX 神经网络 AI 对手</p>
        </div>

        <Card title="游戏设置" className="mb-6">
          <div className="space-y-6">
            {/* 人类玩家名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                你的名字
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入你的名字"
              />
            </div>

            {/* 玩家数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                玩家数量
              </label>
              <select
                value={playerCount}
                onChange={(e) => updatePlayerCount(parseInt(e.target.value) as 3 | 4)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 人 (1 人类 + 2 AI)</option>
                <option value={4}>4 人 (1 人类 + 3 AI)</option>
              </select>
            </div>

            {/* 游戏结束条件 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                游戏结束条件
              </label>
              <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                📈 任一股票价格达到 <strong>30 元</strong> 时游戏结束
              </p>
            </div>

            {/* AI 对手设置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI 对手
              </label>
              <div className="space-y-3">
                {aiPlayers.map((ai, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <span className="text-lg">🤖</span>
                    </div>
                    <input
                      type="text"
                      value={ai.name}
                      onChange={(e) => updateAiName(index, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`AI ${index + 1}`}
                    />
                    <select
                      value={ai.strategy}
                      onChange={(e) => updateAiStrategy(index, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </Card>

        <div className="text-center">
          <Button
            size="lg"
            onClick={handleStartGame}
            className="px-8 py-4 text-lg"
          >
            开始游戏
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Manila Web UI — 引擎统一 + ONNX 神经网络 AI</p>
          <p>AI 模型经过 200K+ 局自对弈训练</p>
        </div>
      </div>
    </div>
  );
};