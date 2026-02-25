import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import { Button } from '../Shared/Button';
import { MortgageStockModal } from '../HarborMaster/MortgageStockModal';
import type { CargoType } from '../../types';

export const AuctionPhase: React.FC = () => {
  const { gameState, makeBid, mortgageStock, getEngineState } = useGameStore();
  const [bidAmount, setBidAmount] = useState(1);
  const [showMortgageModal, setShowMortgageModal] = useState(false);

  if (!gameState) return null;

  // Get auction info from engine state
  const engineState = getEngineState();
  const pendingAction = engineState?.pendingAction;
  const auctionState = engineState?.auctionState;

  // Current bidder is from pendingAction, not currentPlayerIndex
  const currentBidderId = pendingAction?.playerId;
  const currentBidder = gameState.players.find(p => p.id === currentBidderId);
  const isHumanTurn = currentBidder && !currentBidder.isAI;

  // Auction info
  const highestBid = auctionState?.highestBid ?? 0;
  const highestBidder = auctionState?.highestBidderId
    ? gameState.players.find(p => p.id === auctionState.highestBidderId)
    : null;
  const minBid = highestBid + 1;
  const maxBid = currentBidder?.cash ?? 0;

  // Players who passed
  const passedIds = auctionState?.passedPlayerIds ?? [];

  const handleBid = () => {
    if (currentBidderId && bidAmount >= minBid && bidAmount <= maxBid) {
      const result = makeBid(currentBidderId, bidAmount);
      if (result.success) {
        setBidAmount(Math.max(bidAmount + 1, minBid + 1));
      } else {
        alert(result.error || '出价失败');
      }
    }
  };

  const handlePass = () => {
    if (currentBidderId) {
      // makeBid with amount <= 0 triggers PASS_AUCTION
      const result = makeBid(currentBidderId, 0);
      if (!result.success) {
        alert(result.error || '放弃失败');
      }
    }
  };

  const handleMortgage = (cargoType: CargoType, quantity: number) => {
    if (currentBidderId) {
      const result = mortgageStock(currentBidderId, cargoType, quantity);
      if (result.success) {
        setShowMortgageModal(false);
      } else {
        alert(result.error || '抵押失败');
      }
    }
  };

  // Update minBid when it becomes the bidder's turn  
  if (bidAmount < minBid) {
    setBidAmount(minBid);
  }

  return (
    <div className="space-y-6">
      <Card title="拍卖阶段 — 竞拍港务长" className="p-6">
        <div className="space-y-4">
          {/* 回合信息 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                轮次 {gameState.round} / {gameState.gameConfig.rounds}
              </h3>
            </div>
            <div className="text-right">
              {pendingAction?.message && (
                <p className="text-sm text-indigo-600 font-medium">
                  {pendingAction.message}
                </p>
              )}
            </div>
          </div>

          {/* 当前最高出价 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">当前最高出价</span>
                <div className="text-2xl font-bold text-yellow-700">
                  {highestBid > 0 ? highestBid : '无'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">最高出价者</span>
                <div className="text-lg font-semibold text-yellow-800">
                  {highestBidder?.name ?? '无'}
                </div>
              </div>
            </div>
          </div>

          {/* 玩家状态 */}
          <div className="grid grid-cols-3 gap-2">
            {gameState.players.map(player => {
              const isPassed = passedIds.includes(player.id);
              const isCurrent = player.id === currentBidderId;
              const isHighest = player.id === auctionState?.highestBidderId;

              return (
                <div
                  key={player.id}
                  className={`rounded-lg p-3 text-center text-sm ${isCurrent
                      ? 'bg-blue-100 border-2 border-blue-400 ring-2 ring-blue-200'
                      : isPassed
                        ? 'bg-gray-100 text-gray-400 line-through'
                        : isHighest
                          ? 'bg-yellow-50 border border-yellow-300'
                          : 'bg-gray-50 border border-gray-200'
                    }`}
                >
                  <div className="font-medium">
                    {player.name} {player.isAI ? '🤖' : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    现金: {player.cash}
                  </div>
                  {isPassed && <div className="text-xs text-red-400">已放弃</div>}
                  {isCurrent && <div className="text-xs text-blue-600 font-bold">⬅ 当前</div>}
                </div>
              );
            })}
          </div>

          {/* 出价控制区 — 只在人类玩家的回合显示 */}
          {isHumanTurn ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-blue-800">你的回合</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出价金额 (最低 {minBid}, 最高 {maxBid})
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min={minBid}
                    max={Math.max(minBid, maxBid)}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={minBid}
                    max={maxBid}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Math.max(minBid, parseInt(e.target.value) || minBid))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleBid}
                  disabled={bidAmount < minBid || bidAmount > maxBid}
                  className="flex-1"
                >
                  出价 {bidAmount}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePass}
                  className="flex-1"
                >
                  放弃竞拍
                </Button>
              </div>

              <Button
                variant="secondary"
                onClick={() => setShowMortgageModal(true)}
                disabled={currentBidder.stocks.length === 0}
                className="w-full text-sm"
              >
                抵押股票增加现金
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-500">
                等待 {currentBidder?.name ?? 'AI'} 出价中...
              </p>
              {currentBidder?.isAI && (
                <p className="text-sm text-gray-400 mt-1">🤖 AI 正在思考</p>
              )}
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
