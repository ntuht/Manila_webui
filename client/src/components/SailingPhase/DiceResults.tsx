import React from 'react';
import { useGameStore } from '../../stores';
import type { DiceResult } from '../../types';

interface DiceResultsProps {
  diceResults: DiceResult[];
}

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_GLOW: Record<string, string> = {
  JADE: 'rgba(16,185,129,0.3)', SILK: 'rgba(99,102,241,0.3)', GINSENG: 'rgba(245,158,11,0.3)', NUTMEG: 'rgba(139,92,246,0.3)',
};
const CARGO_COLOR: Record<string, string> = {
  JADE: '#10b981', SILK: '#6366f1', GINSENG: '#f59e0b', NUTMEG: '#8b5cf6',
};

/**
 * CSS-based dice face — shows proper dot patterns for 1-6
 */
const DiceFace: React.FC<{ value: number; color: string; glow: string; delay: number }> = ({ value, color, glow, delay }) => {
  // Dot positions for each face value (3x3 grid positions)
  const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };

  const dots = DOT_POSITIONS[value] || DOT_POSITIONS[1];

  return (
    <div
      className="dice-roll-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="w-10 h-10 rounded-lg relative"
        style={{
          background: `linear-gradient(135deg, ${color}dd, ${color})`,
          boxShadow: `0 4px 12px ${glow}, 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}
      >
        {/* 3x3 dot grid */}
        <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-0">
          {Array.from({ length: 9 }, (_, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const hasDot = dots.some(([r, c]) => r === row && c === col);
            return (
              <div key={i} className="flex items-center justify-center">
                {hasDot && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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
        const color = CARGO_COLOR[ship.cargoType] || '#64748b';
        const glow = CARGO_GLOW[ship.cargoType] || 'rgba(100,116,139,0.3)';

        return (
          <div key={ship.id} className="flex flex-col items-center gap-1">
            <DiceFace value={diceValue} color={color} glow={glow} delay={index * 150} />
            <span className="text-[9px] t-text-3 font-medium">
              {CARGO_NAMES[ship.cargoType] || ship.cargoType}
            </span>
          </div>
        );
      })}
      <span className="text-[9px] t-text-m self-end mb-0.5">第{latestResult.phase}次</span>
    </div>
  );
};
