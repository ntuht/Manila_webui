import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

export const PositionSettingStep: React.FC = () => {
  const { gameState, setShipPositions } = useGameStore();
  const [positions, setPositions] = useState<Record<CargoType, number>>({});
  
  const harborMaster = gameState?.harborMaster;
  
  useEffect(() => {
    if (harborMaster?.selectedCargos) {
      const initialPositions: Record<CargoType, number> = {};
      harborMaster.selectedCargos.forEach(cargo => {
        initialPositions[cargo] = 0;
      });
      setPositions(initialPositions);
    }
  }, [harborMaster?.selectedCargos]);

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

  const handlePositionChange = (cargo: CargoType, position: number) => {
    setPositions(prev => ({
      ...prev,
      [cargo]: position
    }));
  };

  const submitPositions = () => {
    setShipPositions(positions);
  };

  const total = Object.values(positions).reduce((a, b) => a + b, 0);
  const remaining = 9 - total;
  const isValid = total === 9;

  if (!harborMaster?.selectedCargos) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">设置船只起始位置</h3>
        <p className="text-sm text-gray-600">
          总和必须为9，剩余: <span className={`font-medium ${remaining === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {remaining}
          </span>
        </p>
      </div>
      
      <div className="space-y-4">
        {harborMaster.selectedCargos.map(cargo => (
          <div key={cargo} className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full ${getCargoColor(cargo)}`}></div>
              <label className="font-medium text-gray-900">{getCargoName(cargo)}</label>
              <span className="text-sm text-gray-600">位置: {positions[cargo] || 0}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              value={positions[cargo] || 0}
              onChange={(e) => handlePositionChange(cargo, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">总位置: {total}/9</span>
          <div className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
            {isValid ? '✓ 位置设置正确' : '✗ 位置总和必须为9'}
          </div>
        </div>
        
        <Button
          onClick={submitPositions}
          disabled={!isValid}
          className="w-full"
        >
          确认位置设置
        </Button>
      </div>
    </div>
  );
};
