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

  const engineState = getEngineState();
  const pendingAction = engineState?.pendingAction;
  const auctionState = engineState?.auctionState;

  const currentBidderId = pendingAction?.playerId;
  const currentBidder = gameState.players.find(p => p.id === currentBidderId);
  const isHumanTurn = currentBidder && !currentBidder.isAI;

  const highestBid = auctionState?.highestBid ?? 0;
  const highestBidder = auctionState?.highestBidderId
    ? gameState.players.find(p => p.id === auctionState.highestBidderId)
    : null;
  const minBid = highestBid + 1;

  // maxBid from engine = cash + mortgage value (not just cash)
  const bidAction = pendingAction?.validActions?.find((a: any) => a.type === 'BID');
  const maxBid = Number(bidAction?.data?.maxBid) || (currentBidder?.cash ?? 0);
  const cashOnly = currentBidder?.cash ?? 0;

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
      const result = makeBid(currentBidderId, 0);
      if (!result.success) alert(result.error || '放弃失败');
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

  if (bidAmount < minBid) setBidAmount(minBid);

  return (
    <div className="space-y-4">
      <Card title="拍卖阶段 — 竞拍港务长" className="p-5">
        <div className="space-y-4">
          {/* 回合信息 */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold t-text">
              轮次 {gameState.round} / {gameState.gameConfig.rounds}
            </h3>
            {pendingAction?.message && (
              <p className="text-xs text-ocean-400 font-medium">{pendingAction.message}</p>
            )}
          </div>

          {/* 当前最高出价 */}
          <div className="glass-light rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] t-text-3 uppercase tracking-wider">最高出价</span>
                <div className="text-2xl font-bold text-gold-400 font-display">
                  {highestBid > 0 ? highestBid : '—'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] t-text-3 uppercase tracking-wider">出价者</span>
                <div className="text-base font-semibold t-text">
                  {highestBidder?.name ?? '—'}
                </div>
              </div>
            </div>
          </div>

          {/* 玩家状态 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {gameState.players.map(player => {
              const isPassed = passedIds.includes(player.id);
              const isCurrent = player.id === currentBidderId;
              const isHighest = player.id === auctionState?.highestBidderId;

              return (
                <div
                  key={player.id}
                  className={`rounded-lg p-2.5 text-center text-xs transition-all ${isCurrent
                    ? 'bg-ocean-500/15 border border-ocean-500/30 ring-1 ring-ocean-500/20'
                    : isPassed
                      ? 'bg-white/3 t-text-m line-through border border-white/5'
                      : isHighest
                        ? 'bg-gold-400/10 border border-gold-400/20'
                        : ''
                    }`}
                >
                  <div className="font-medium t-text">
                    {player.name} {player.isAI ? '🤖' : ''}
                  </div>
                  <div className="text-[10px] t-text-3 mt-0.5">
                    💰 {player.cash}
                  </div>
                  {isPassed && <div className="text-[10px] text-red-400/60 mt-0.5">已放弃</div>}
                  {isCurrent && <div className="text-[10px] text-ocean-400 font-bold mt-0.5">⬅ 当前</div>}
                </div>
              );
            })}
          </div>

          {/* 出价控制区 */}
          {isHumanTurn ? (
            <div className="glass-light rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-sm text-ocean-400">你的回合</h4>

              <div>
                <label className="block text-xs t-text-2 mb-1">
                  出价金额 (最低 {minBid}, 最高 {maxBid})
                </label>
                {maxBid > cashOnly && (
                  <p className="text-[9px] t-text-3 mb-1.5">
                    💡 现金 {cashOnly} + 可抵押 {maxBid - cashOnly}，超出现金部分竞拍成功后自动抵押
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={minBid}
                    max={Math.max(minBid, maxBid)}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseInt(e.target.value))}
                    className="flex-1 accent-ocean-500"
                  />
                  <input
                    type="number"
                    min={minBid}
                    max={maxBid}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Math.max(minBid, parseInt(e.target.value) || minBid))}
                    className="w-16 px-2 py-1 border rounded text-center text-sm t-text focus:outline-none focus:ring-1 focus:ring-ocean-500/50"
                    style={{ background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleBid}
                  disabled={bidAmount < minBid || bidAmount > maxBid}
                  className="flex-1"
                  size="sm"
                >
                  出价 {bidAmount}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handlePass}
                  className="flex-1"
                  size="sm"
                >
                  放弃竞拍
                </Button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowMortgageModal(true)}
                disabled={currentBidder.stocks.length === 0}
                className="w-full text-xs"
              >
                📜 抵押股票增加现金
              </Button>
            </div>
          ) : (
            <div className="glass-light rounded-xl p-4 text-center">
              <div className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ocean-400 animate-pulse" />
                <span className="text-sm t-text-2">
                  等待 {currentBidder?.name ?? 'AI'} 出价...
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <MortgageStockModal
        isOpen={showMortgageModal}
        onClose={() => setShowMortgageModal(false)}
        onConfirm={handleMortgage}
      />
    </div>
  );
};
