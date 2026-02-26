import React from 'react';
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
    <div className={`p-3 rounded-xl border transition-all ${isCurrentPlayer
        ? 'border-ocean-500/30 bg-ocean-500/10'
        : isAuctionWinner
          ? 'border-gold-400/30 bg-gold-400/10'
          : 'border-white/10 bg-white/5'
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-xs font-medium ${isCurrentPlayer ? 'text-ocean-400' :
              isAuctionWinner ? 'text-gold-400' : 'text-slate-200'
            }`}>
            {player.name}
          </h4>
          <p className="text-[10px] text-slate-500">💰 {player.cash}</p>
        </div>
        <div className="text-right">
          {isCurrentPlayer && (
            <span className="text-[9px] bg-ocean-500/15 text-ocean-400 px-1.5 py-0.5 rounded">当前</span>
          )}
          {isAuctionWinner && (
            <span className="text-[9px] bg-gold-400/15 text-gold-400 px-1.5 py-0.5 rounded">港务长</span>
          )}
        </div>
      </div>

      {player.stocks.length > 0 && (
        <div className="mt-1.5">
          <div className="text-[10px] text-slate-600 mb-0.5">股票:</div>
          <div className="flex flex-wrap gap-1">
            {player.stocks.map((stock, index) => (
              <div key={index} className="text-[10px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">
                {stock.cargoType} × {stock.quantity}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
