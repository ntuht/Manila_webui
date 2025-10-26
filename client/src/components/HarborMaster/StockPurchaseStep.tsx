import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

export const StockPurchaseStep: React.FC = () => {
  const { gameState, buyHarborMasterStock, skipStockPurchase } = useGameStore();
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  
  if (!gameState) return null;

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">选择购买股票（可选）</h3>
        <p className="text-sm text-gray-600">
          您可以按 max(5, 当前股价) 购买一股货物
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {(['JADE', 'SILK', 'GINSENG', 'NUTMEG'] as CargoType[]).map(cargo => {
          const price = Math.max(5, gameState.stockPrices[cargo]);
          const isSelected = selectedCargo === cargo;
          
          return (
            <div
              key={cargo}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedCargo(cargo)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full ${getCargoColor(cargo)}`}></div>
                <div>
                  <div className="font-medium text-gray-900">{getCargoName(cargo)}</div>
                  <div className="text-sm text-gray-600">价格: {price}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex space-x-3">
        <Button 
          onClick={() => selectedCargo && buyHarborMasterStock(selectedCargo)}
          disabled={!selectedCargo}
        >
          购买股票
        </Button>
        <Button 
          variant="secondary" 
          onClick={skipStockPurchase}
        >
          跳过
        </Button>
      </div>
    </div>
  );
};
