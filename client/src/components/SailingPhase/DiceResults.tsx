import React from 'react';
import { useGameStore } from '../../stores';
import type { DiceResult } from '../../types';

interface DiceResultsProps {
  diceResults: DiceResult[];
}

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_BG: Record<string, string> = {
  JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};

export const DiceResults: React.FC<DiceResultsProps> = ({ diceResults }) => {
  const { gameState } = useGameStore();

  if (diceResults.length === 0 || !gameState) return null;

  const latestResult = diceResults[diceResults.length - 1];

  return (
    <div className="flex items-center justify-center gap-4">
      {gameState.ships.map((ship, index) => {
        const diceValue = index === 0 ? latestResult.dice1 :
          index === 1 ? latestResult.dice2 :
            latestResult.dice3;
        return (
          <div key={ship.id} className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">
              {CARGO_NAMES[ship.cargoType] || ship.cargoType}
            </span>
            <div className={`w-7 h-7 ${CARGO_BG[ship.cargoType] || 'bg-slate-500'} rounded-md flex items-center justify-center text-white text-sm font-bold shadow-md`}>
              {diceValue}
            </div>
          </div>
        );
      })}
      <span className="text-[9px] text-slate-600">第{latestResult.phase}次</span>
    </div>
  );
};
