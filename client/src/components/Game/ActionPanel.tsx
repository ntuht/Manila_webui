import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import { Modal } from '../Shared/Modal';

export const ActionPanel: React.FC = () => {
  const { currentPhase, gameState, makeBid, rollDice, nextPhase } = useGameStore();
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState(0);

  const handleBid = () => {
    if (gameState && gameState.players.length > 0) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const result = makeBid(currentPlayer.id, bidAmount);
      if (result.success) {
        setShowBidModal(false);
        setBidAmount(0);
      } else {
        alert(result.error);
      }
    }
  };

  const handleRollDice = () => {
    const result = rollDice();
    if (result.success) {
      // 骰子投掷成功
      console.log('Dice rolled successfully');
    } else {
      alert(result.error);
    }
  };

  const handleNextPhase = () => {
    nextPhase();
  };

  const renderPhaseActions = () => {
    switch (currentPhase) {
      case 'AUCTION':
        return (
          <div className="space-y-3">
            <Button
              onClick={() => setShowBidModal(true)}
              className="w-full"
            >
              出价竞拍
            </Button>
            <Button
              variant="secondary"
              onClick={handleNextPhase}
              className="w-full"
            >
              结束拍卖
            </Button>
          </div>
        );

      case 'INVESTMENT':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              点击投资区域选择投资槽位
            </p>
            <Button
              variant="secondary"
              onClick={handleNextPhase}
              className="w-full"
            >
              结束投资
            </Button>
          </div>
        );

      case 'SAILING':
        return (
          <div className="space-y-3">
            <Button
              onClick={handleRollDice}
              className="w-full"
            >
              投掷骰子
            </Button>
            <Button
              variant="secondary"
              onClick={handleNextPhase}
              className="w-full"
            >
              结束航行
            </Button>
          </div>
        );

      case 'SETTLEMENT':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              自动结算中...
            </p>
            <Button
              onClick={handleNextPhase}
              className="w-full"
            >
              下一轮
            </Button>
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-600 text-center">
            等待游戏开始
          </p>
        );
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">操作面板</h3>
      
      {renderPhaseActions()}

      {/* 出价模态框 */}
      <Modal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        title="出价竞拍"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出价金额
            </label>
            <input
              type="number"
              min="0"
              max={gameState?.players[gameState.currentPlayerIndex]?.cash || 0}
              value={bidAmount}
              onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入出价金额"
            />
            <p className="text-xs text-gray-500 mt-1">
              可用现金: {gameState?.players[gameState.currentPlayerIndex]?.cash || 0}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleBid}
              disabled={bidAmount <= 0}
              className="flex-1"
            >
              确认出价
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowBidModal(false)}
              className="flex-1"
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
