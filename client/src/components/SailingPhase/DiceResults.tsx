import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import type { DiceResult } from '../../types';

interface DiceResultsProps {
  diceResults: DiceResult[];
}

export const DiceResults: React.FC<DiceResultsProps> = ({ diceResults }) => {
  const { gameState } = useGameStore();
  
  if (diceResults.length === 0 || !gameState) {
    return null;
  }
  
  const latestResult = diceResults[diceResults.length - 1];
  
  const getCargoColor = (cargoType: string) => {
    const colors = {
      'JADE': 'bg-cargo-jade',      // 翡翠绿
      'SILK': 'bg-cargo-silk',      // 丝绸蓝
      'GINSENG': 'bg-cargo-ginseng', // 人参黄
      'NUTMEG': 'bg-cargo-nutmeg'   // 肉豆蔻黑
    };
    return colors[cargoType as keyof typeof colors] || 'bg-gray-500';
  };
  
  const getCargoName = (cargoType: string) => {
    const names = {
      'JADE': '翡翠',
      'SILK': '丝绸',
      'GINSENG': '人参',
      'NUTMEG': '肉豆蔻'
    };
    return names[cargoType as keyof typeof names] || cargoType;
  };
  
  return (
    <Card title="骰子结果" className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-4">
          {gameState.ships.map((ship, index) => {
            const diceValue = index === 0 ? latestResult.dice1 : 
                             index === 1 ? latestResult.dice2 : 
                             latestResult.dice3;
            
            return (
              <div key={ship.id} className="flex flex-col items-center space-y-1">
                <div className={`w-10 h-10 ${getCargoColor(ship.cargoType)} rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-md`}>
                  {diceValue}
                </div>
                <span className="text-xs text-gray-600">
                  {getCargoName(ship.cargoType)}
                </span>
              </div>
            );
          })}
          
          <div className="text-xl font-bold text-gray-600">=</div>
          <div className="w-12 h-10 bg-yellow-400 rounded-lg flex items-center justify-center text-black text-xl font-bold shadow-md">
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
