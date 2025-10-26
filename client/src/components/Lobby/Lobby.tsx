import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button, Card } from '../Shared';
import { GameConfig } from '../../types';

export const Lobby: React.FC = () => {
  const { startGame } = useGameStore();
  const [config, setConfig] = useState<GameConfig>({
    players: 3,
    rounds: 3,
    aiStrategies: ['greedy', 'risk_aware']
  });

  const handleStartGame = () => {
    startGame(config);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Manila</h1>
          <p className="text-lg text-gray-600">策略桌游的现代化体验</p>
        </div>

        <Card title="游戏设置" className="mb-6">
          <div className="space-y-6">
            {/* 玩家数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                玩家数量
              </label>
              <select
                value={config.players}
                onChange={(e) => setConfig({ ...config, players: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 人</option>
                <option value={4}>4 人</option>
              </select>
            </div>

            {/* 游戏轮数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                游戏轮数
              </label>
              <select
                value={config.rounds}
                onChange={(e) => setConfig({ ...config, rounds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 轮</option>
                <option value={5}>5 轮</option>
                <option value={7}>7 轮</option>
              </select>
            </div>

            {/* AI 策略 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI 策略
              </label>
              <div className="space-y-2">
                {config.aiStrategies.map((strategy, index) => (
                  <select
                    key={index}
                    value={strategy}
                    onChange={(e) => {
                      const newStrategies = [...config.aiStrategies];
                      newStrategies[index] = e.target.value;
                      setConfig({ ...config, aiStrategies: newStrategies });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="greedy">贪婪策略</option>
                    <option value="risk_aware">风险感知</option>
                    <option value="hybrid">混合策略</option>
                    <option value="aggressive">激进策略</option>
                    <option value="conservative">保守策略</option>
                  </select>
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
          <p>Manila Web UI - Phase 1 MVP</p>
          <p>基于 Manila 桌游规则实现</p>
        </div>
      </div>
    </div>
  );
};
