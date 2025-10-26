import React from 'react';
import { useGameStore } from '../../stores';

export const GameLog: React.FC = () => {
  const { getGameHistory } = useGameStore();
  const history = getGameHistory();

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">游戏日志</h3>
      
      <div className="max-h-64 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            暂无游戏记录
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((entry, index) => (
              <div
                key={entry.id || index}
                className="text-sm border-l-2 border-gray-200 pl-3 py-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {entry.playerId} - {entry.action.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {entry.result.error && (
                  <div className="text-xs text-red-600 mt-1">
                    错误: {entry.result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
