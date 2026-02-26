import React from 'react';
import { useGameStore } from '../../stores';
import type { CargoType } from '../../types';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_DOTS: Record<string, string> = {
  JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};

export const CargoSelectionStep: React.FC = () => {
  const { selectCargos } = useGameStore();

  const cargoPresets = [
    { name: '翡翠+丝绸+人参', cargos: ['JADE', 'SILK', 'GINSENG'] as CargoType[] },
    { name: '翡翠+丝绸+肉豆蔻', cargos: ['JADE', 'SILK', 'NUTMEG'] as CargoType[] },
    { name: '翡翠+人参+肉豆蔻', cargos: ['JADE', 'GINSENG', 'NUTMEG'] as CargoType[] },
    { name: '丝绸+人参+肉豆蔻', cargos: ['SILK', 'GINSENG', 'NUTMEG'] as CargoType[] },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">选择三种货物上船</h3>
        <p className="text-xs text-slate-400 mt-1">从四种货物中选择三种上船</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cargoPresets.map(preset => (
          <div
            key={preset.name}
            className="border border-white/10 rounded-xl p-3 cursor-pointer hover:border-ocean-500/30 hover:bg-ocean-500/5 transition-all"
            onClick={() => selectCargos(preset.cargos)}
          >
            <div className="text-xs font-medium text-slate-200 mb-2">{preset.name}</div>
            <div className="flex gap-2">
              {preset.cargos.map(cargo => (
                <div key={cargo} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${CARGO_DOTS[cargo]}`} />
                  <span className="text-[10px] text-slate-400">{CARGO_NAMES[cargo]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
