import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_DOTS: Record<string, string> = {
  JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};

export const PositionSettingStep: React.FC = () => {
  const { gameState, setShipPositions } = useGameStore();
  const [positions, setPositions] = useState<Record<CargoType, number>>({
    JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0
  });

  const harborMaster = gameState?.harborMaster;

  useEffect(() => {
    if (harborMaster?.selectedCargos) {
      const initial: Record<CargoType, number> = { JADE: 0, SILK: 0, GINSENG: 0, NUTMEG: 0 };
      harborMaster.selectedCargos.forEach(cargo => { initial[cargo] = 0; });
      setPositions(initial);
    }
  }, [harborMaster?.selectedCargos]);

  const handlePositionChange = (cargo: CargoType, position: number) => {
    setPositions(prev => ({ ...prev, [cargo]: position }));
  };

  const total = Object.values(positions).reduce((a, b) => a + b, 0);
  const remaining = 9 - total;
  const isValid = total === 9;

  if (!harborMaster?.selectedCargos) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">设置船只起始位置</h3>
        <p className="text-xs text-slate-400 mt-1">
          总和必须为9，剩余: <span className={`font-medium ${remaining === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {remaining}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {harborMaster.selectedCargos.map(cargo => (
          <div key={cargo} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${CARGO_DOTS[cargo]}`} />
              <label className="text-xs font-medium text-slate-200">{CARGO_NAMES[cargo]}</label>
              <span className="text-xs text-slate-500">位置: {positions[cargo] || 0}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              value={positions[cargo] || 0}
              onChange={(e) => handlePositionChange(cargo, parseInt(e.target.value))}
              className="w-full accent-ocean-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400">总位置: {total}/9</span>
          <div className={`text-xs font-medium ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
            {isValid ? '✓ 位置设置正确' : '✗ 位置总和必须为9'}
          </div>
        </div>
        <Button onClick={() => setShipPositions(positions)} disabled={!isValid} className="w-full" size="sm">
          确认位置设置
        </Button>
      </div>
    </div>
  );
};
