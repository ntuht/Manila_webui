import React from 'react';
import { useGameStore } from '../../stores';
import { PlayerList } from '../Player';
import { GameBoard } from '../Board';
import { GameStatus, ActionPanel, GameLog } from './';
import { HarborMasterWizard } from '../HarborMaster';
import { InvestmentRoundIndicator } from '../Investment';
import { AuctionPhase, BidHistory } from '../Auction';
import { InvestmentPhase, InvestmentHistory } from '../InvestmentPhase';
import { SailingPhase, DiceResults } from '../SailingPhase';

export const GameInterface: React.FC = () => {
  const { gameState } = useGameStore();

  return (
    <div className="space-y-6">
      {/* 港务长向导 */}
      {gameState?.harborMaster && <HarborMasterWizard />}
      
      {/* 投资轮次指示器 */}
      {gameState?.investmentRound && <InvestmentRoundIndicator />}
      
      {/* 拍卖阶段 */}
      {gameState?.phase === 'AUCTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AuctionPhase />
          </div>
          <div className="lg:col-span-1">
            <BidHistory />
          </div>
        </div>
      )}
      
      {/* 投资阶段 - 使用投资区域 */}
      {gameState?.phase === 'INVESTMENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InvestmentHistory />
          </div>
          <div className="lg:col-span-1">
            <div className="text-sm text-gray-500">
              投资区域在下方游戏棋盘中使用
            </div>
          </div>
        </div>
      )}
      
      {/* 航行阶段 */}
      {gameState?.phase === 'SAILING' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SailingPhase />
          </div>
          <div className="lg:col-span-1">
            {gameState.diceResults && <DiceResults diceResults={gameState.diceResults} />}
          </div>
        </div>
      )}
      
      {/* 主游戏界面 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：玩家信息 */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <PlayerList />
            <StockPrices />
          </div>
        </div>
        
        {/* 中间：游戏棋盘 */}
        <div className="lg:col-span-2">
          <GameBoard />
        </div>
        
        {/* 右侧：游戏信息 */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <GameStatus />
            <ActionPanel />
            <GameLog />
          </div>
        </div>
      </div>
    </div>
  );
};

const StockPrices: React.FC = () => {
  const { gameState } = useGameStore();
  
  if (!gameState) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">股票价格</h3>
      <div className="space-y-2">
        {Object.entries(gameState.stockPrices).map(([cargo, price]) => (
          <div key={cargo} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{cargo}</span>
            <span className="font-medium text-green-600">{price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
