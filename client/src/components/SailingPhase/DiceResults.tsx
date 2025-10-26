import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import type { DiceResult } from '../../types';

interface DiceResultsProps {
  diceResults: DiceResult[];
}

export const DiceResults: React.FC<DiceResultsProps> = ({ diceResults }) => {
  if (diceResults.length === 0) {
    return null;
  }
  
  const latestResult = diceResults[diceResults.length - 1];
  
  return (
    <Card title="骰子结果" className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-2xl">🎲</div>
          <div className="text-2xl font-bold text-blue-600">
            {latestResult.dice1}
          </div>
          <div className="text-2xl">🎲</div>
          <div className="text-2xl font-bold text-blue-600">
            {latestResult.dice2}
          </div>
          <div className="text-2xl">🎲</div>
          <div className="text-2xl font-bold text-blue-600">
            {latestResult.dice3}
          </div>
          <div className="text-2xl">=</div>
          <div className="text-3xl font-bold text-green-600">
            {latestResult.total}
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-600">
          船只移动 {latestResult.total} 格
        </div>
        
        {diceResults.length > 1 && (
          <div className="text-xs text-gray-500 text-center">
            第 {latestResult.phase} 阶段
          </div>
        )}
      </div>
    </Card>
  );
};
