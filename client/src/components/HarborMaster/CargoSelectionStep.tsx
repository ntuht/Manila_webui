import React from 'react';
import { useGameStore } from '../../stores';
import type { CargoType } from '../../types';

export const CargoSelectionStep: React.FC = () => {
  const { selectCargos } = useGameStore();
  
  const cargoPresets = [
    { name: '翡翠+丝绸+人参', cargos: ['JADE', 'SILK', 'GINSENG'] as CargoType[] },
    { name: '翡翠+丝绸+肉豆蔻', cargos: ['JADE', 'SILK', 'NUTMEG'] as CargoType[] },
    { name: '翡翠+人参+肉豆蔻', cargos: ['JADE', 'GINSENG', 'NUTMEG'] as CargoType[] },
    { name: '丝绸+人参+肉豆蔻', cargos: ['SILK', 'GINSENG', 'NUTMEG'] as CargoType[] },
  ];

  const getCargoName = (cargo: CargoType): string => {
    const names = {
      'JADE': '翡翠',
      'SILK': '丝绸',
      'GINSENG': '人参',
      'NUTMEG': '肉豆蔻'
    };
    return names[cargo];
  };

  const getCargoColor = (cargo: CargoType): string => {
    const colors = {
      'JADE': 'bg-cargo-jade',
      'SILK': 'bg-cargo-silk',
      'GINSENG': 'bg-cargo-ginseng',
      'NUTMEG': 'bg-cargo-nutmeg'
    };
    return colors[cargo];
  };

  const handleSelectCargos = (cargos: CargoType[]) => {
    selectCargos(cargos);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">选择三种货物上船</h3>
        <p className="text-sm text-gray-600">
          从四种货物中选择三种上船
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {cargoPresets.map(preset => (
          <div
            key={preset.name}
            className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
            onClick={() => handleSelectCargos(preset.cargos)}
          >
            <div className="font-medium text-gray-900 mb-3">{preset.name}</div>
            <div className="flex space-x-2">
              {preset.cargos.map(cargo => (
                <div key={cargo} className="flex items-center space-x-1">
                  <div className={`w-4 h-4 rounded-full ${getCargoColor(cargo)}`}></div>
                  <span className="text-sm text-gray-600">{getCargoName(cargo)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
