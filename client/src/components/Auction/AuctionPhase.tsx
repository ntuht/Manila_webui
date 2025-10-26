import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import { Button } from '../Shared/Button';
import { Modal } from '../Shared/Modal';
import { MortgageStockModal } from '../HarborMaster/MortgageStockModal';
import type { CargoType } from '../../types';

export const AuctionPhase: React.FC = () => {
  const { gameState, makeBid, mortgageStock } = useGameStore();
  const [bidAmount, setBidAmount] = useState(0);
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  const [mortgageQuantity, setMortgageQuantity] = useState(1);
  
  if (!gameState) return null;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const maxBid = currentPlayer.cash;
  
  const handleBid = () => {
    if (bidAmount > 0 && bidAmount <= maxBid) {
      const result = makeBid(currentPlayer.id, bidAmount);
      if (result.success) {
        setBidAmount(0);
      } else {
        alert(result.error || '出价失败');
      }
    }
  };
  
  const handleMortgage = (cargoType: CargoType, quantity: number) => {
    const result = mortgageStock(currentPlayer.id, cargoType, quantity);
    if (result.success) {
      setShowMortgageModal(false);
      alert(`抵押成功！获得 ${quantity * 12} 现金`);
    } else {
      alert(result.error || '抵押失败');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card title="拍卖阶段" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                当前玩家: {currentPlayer.name}
              </h3>
              <p className="text-sm text-gray-600">
                现金: {currentPlayer.cash}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              轮次 {gameState.round} / {gameState.gameConfig.rounds}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出价金额 (0 - {maxBid})
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max={maxBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-medium w-16 text-center">
                  {bidAmount}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={handleBid}
                disabled={bidAmount === 0}
                className="flex-1"
              >
                出价 {bidAmount}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowMortgageModal(true)}
                disabled={currentPlayer.stocks.length === 0}
              >
                抵押股票
              </Button>
            </div>
          </div>
          
          {/* 当前出价信息 */}
          {gameState.auctionWinner && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">当前港务长: </span>
                <span className="text-yellow-800">
                  {gameState.players.find(p => p.id === gameState.auctionWinner)?.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* 抵押股票模态框 */}
      <MortgageStockModal
        isOpen={showMortgageModal}
        onClose={() => setShowMortgageModal(false)}
        onConfirm={handleMortgage}
      />
    </div>
  );
};
