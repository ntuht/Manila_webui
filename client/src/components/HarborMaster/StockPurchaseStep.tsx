import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import { MortgageStockModal } from './MortgageStockModal';
import type { CargoType } from '../../types';

export const StockPurchaseStep: React.FC = () => {
  const { gameState, buyHarborMasterStock, skipStockPurchase, mortgageStock } = useGameStore();
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [mortgageSuccess, setMortgageSuccess] = useState(false);
  
  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === gameState.harborMaster?.playerId);
  
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
        {currentPlayer && (
          <p className="text-sm text-blue-600 font-medium">
            当前现金: {currentPlayer.cash}
          </p>
        )}
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
                onClick={() => {
                  setSelectedCargo(cargo);
                  setMortgageSuccess(false); // 清除抵押成功提示
                }}
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
          onClick={() => {
            if (selectedCargo) {
              const result = buyHarborMasterStock(selectedCargo);
              if (result.success) {
                setHasPurchased(true);
              } else {
                // 如果现金不足，显示抵押选项
                if (result.error?.includes('Insufficient funds') || result.error?.includes('资金不足') || result.error?.includes('Insufficient funds to buy stock')) {
                  setShowMortgageModal(true);
                } else {
                  alert(result.error || '购买失败');
                }
              }
            }
          }}
          disabled={!selectedCargo || hasPurchased}
        >
          {hasPurchased ? '已购买' : '购买股票'}
        </Button>
        <Button 
          variant="secondary" 
          onClick={skipStockPurchase}
          disabled={hasPurchased}
        >
          跳过
        </Button>
      </div>
      
      {hasPurchased && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
          ✓ 股票购买成功！已自动进入下一步
        </div>
      )}
      
      {mortgageSuccess && (
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          ✓ 抵押成功！您现在有更多现金，可以重新尝试购买股票
        </div>
      )}
      
      {/* 抵押股票模态框 */}
      <MortgageStockModal
        isOpen={showMortgageModal}
        onClose={() => setShowMortgageModal(false)}
        onConfirm={(cargoType, quantity) => {
          const result = mortgageStock(gameState.harborMaster?.playerId || '', cargoType, quantity);
          if (result.success) {
            // 抵押成功后，关闭模态框，显示成功提示
            setShowMortgageModal(false);
            setMortgageSuccess(true);
            // 不自动购买股票，让用户重新点击购买按钮
            console.log('抵押成功，现金已更新');
          } else {
            alert(result.error || '抵押失败');
          }
        }}
      />
    </div>
  );
};
