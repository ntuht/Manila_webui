import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Modal } from '../Shared/Modal';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

interface MortgageStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cargoType: CargoType, quantity: number) => void;
}

export const MortgageStockModal: React.FC<MortgageStockModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { gameState } = useGameStore();
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  if (!gameState) return null;
  
  const currentPlayer = gameState.players.find(p => p.id === gameState.harborMaster?.playerId);
  if (!currentPlayer) return null;
  
  const availableStocks = currentPlayer.stocks.filter(stock => 
    stock.quantity > 0 && !stock.isMortgaged
  );
  
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
  
  const selectedStock = selectedCargo ? 
    currentPlayer.stocks.find(s => s.cargoType === selectedCargo) : null;
  
  const maxQuantity = selectedStock ? selectedStock.quantity : 0;
  const mortgageValue = quantity * 12; // 每抵押一股获得12现金
  
  const handleConfirm = () => {
    if (selectedCargo && quantity > 0 && quantity <= maxQuantity) {
      onConfirm(selectedCargo, quantity);
      onClose();
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="抵押股票获取现金" size="md">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            选择要抵押的股票。每抵押一股可获得12现金。
          </p>
        </div>
        
        {/* 选择货物 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择货物
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableStocks.map(stock => (
              <div
                key={stock.cargoType}
                className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  selectedCargo === stock.cargoType
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedCargo(stock.cargoType);
                  setQuantity(1); // 重置数量为1
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full ${getCargoColor(stock.cargoType)}`}></div>
                  <span className="font-medium">{getCargoName(stock.cargoType)}</span>
                  <span className="text-sm text-gray-600">({stock.quantity}股)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 选择数量 */}
        {selectedCargo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              抵押数量
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 text-center">{quantity}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              最多可抵押 {maxQuantity} 股
            </div>
          </div>
        )}
        
        {/* 抵押信息 */}
        {selectedCargo && quantity > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm">
              <div className="flex justify-between">
                <span>抵押股票:</span>
                <span className="font-medium">{getCargoName(selectedCargo)} × {quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>获得现金:</span>
                <span className="font-medium text-green-600">+{mortgageValue}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3">
          <Button
            onClick={handleConfirm}
            disabled={!selectedCargo || quantity <= 0 || quantity > maxQuantity}
            className="flex-1"
          >
            确认抵押
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};
