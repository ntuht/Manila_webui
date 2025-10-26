import React from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import type { PlayerState } from '../../types';

interface PlayerBidStatusProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  isAuctionWinner: boolean;
}

export const PlayerBidStatus: React.FC<PlayerBidStatusProps> = ({
  player,
  isCurrentPlayer,
  isAuctionWinner
}) => {
  return (
    <div className={`p-3 rounded-lg border-2 transition-all ${
      isCurrentPlayer
        ? 'border-blue-500 bg-blue-50'
        : isAuctionWinner
        ? 'border-yellow-500 bg-yellow-50'
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`font-medium ${
            isCurrentPlayer ? 'text-blue-900' : 
            isAuctionWinner ? 'text-yellow-900' : 'text-gray-900'
          }`}>
            {player.name}
          </h4>
          <p className="text-sm text-gray-600">
            现金: {player.cash}
          </p>
        </div>
        <div className="text-right">
          {isCurrentPlayer && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              当前玩家
            </span>
          )}
          {isAuctionWinner && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              港务长
            </span>
          )}
        </div>
      </div>
      
      {/* 股票信息 */}
      {player.stocks.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">股票:</div>
          <div className="flex flex-wrap gap-1">
            {player.stocks.map((stock, index) => (
              <div
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {stock.cargoType} × {stock.quantity}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
