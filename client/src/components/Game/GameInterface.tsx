import React from 'react';
import { useGameStore } from '../../stores';
import { PlayerList } from '../Player';
import { GameBoard } from '../Board';
import { GameStatus, ActionPanel, GameLog } from './';
import { HarborMasterWizard } from '../HarborMaster';
import { InvestmentRoundIndicator } from '../Investment';
import { AuctionPhase, BidHistory } from '../Auction';
import { InvestmentHistory } from '../InvestmentPhase';
import { SailingPhase, DiceResults } from '../SailingPhase';
import { SettlementPhase } from '../SettlementPhase';

export const GameInterface: React.FC = () => {
  const { gameState, getEngineState } = useGameStore();

  // Determine if harbor master actions should be shown to human
  const engineState = getEngineState();
  const pendingPlayerId = engineState?.pendingAction?.playerId;
  const pendingPlayer = engineState?.players.find(p => p.id === pendingPlayerId);
  const isHumanHarborMaster = gameState?.harborMaster && pendingPlayer && !pendingPlayer.isAI;
  const isAIHarborMaster = gameState?.harborMaster && pendingPlayer?.isAI;

  return (
    <div className="space-y-6">
      {/* 港务长向导 — 只在人类玩家是港务长时显示 */}
      {isHumanHarborMaster && <HarborMasterWizard />}

      {/* AI 港务长等待提示 */}
      {isAIHarborMaster && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
          <p className="text-indigo-700 font-medium">
            🤖 {pendingPlayer.name} (港务长) 正在执行行动...
          </p>
          <p className="text-sm text-indigo-500 mt-1">
            {engineState?.pendingAction?.message}
          </p>
        </div>
      )}

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
        <div className="space-y-6">
          {/* 骰子结果显性显示 */}
          {gameState.diceResults && gameState.diceResults.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6">
              <h3 className="text-xl font-bold text-center text-gray-800 mb-4">
                🎲 本轮骰子结果
              </h3>
              <DiceResults diceResults={gameState.diceResults} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SailingPhase />
            </div>
            <div className="lg:col-span-1">
              {gameState.diceResults && <DiceResults diceResults={gameState.diceResults} />}
            </div>
          </div>
        </div>
      )}

      {/* 结算阶段 */}
      {gameState?.phase === 'SETTLEMENT' && (
        <SettlementPhase />
      )}

      {/* 游戏结束结果 */}
      {gameState?.phase === 'GAME_END' && engineState?.gameResult && (
        <GameEndResult />
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

const CARGO_NAMES_MAP: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
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
            <span className="text-sm text-gray-600">{CARGO_NAMES_MAP[cargo] || cargo}</span>
            <span className="font-medium text-green-600">{price} 元</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GameEndResult: React.FC = () => {
  const { getEngineState, endGame } = useGameStore();
  const engineState = getEngineState();
  const result = engineState?.gameResult;

  if (!result) return null;

  const rankings = result.rankings
    .slice()
    .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);
  const medalEmoji = ['🥇', '🥈', '🥉', '4️⃣'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'linear-gradient(to bottom, #fefce8, white)', borderRadius: 16, padding: 32,
        maxWidth: 560, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
          🏆 游戏结束
        </h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 24 }}>
          共进行 {result.totalRounds} 轮
        </p>

        {/* 排名表格 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>排名</th>
              <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: 13, color: '#6b7280' }}>玩家</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 13, color: '#6b7280' }}>现金</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 13, color: '#6b7280' }}>股票</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 13, color: '#6b7280' }}>罚金</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: 13, color: '#6b7280', fontWeight: 700 }}>总分</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r: { playerId: string; name: string; cash: number; stockValue: number; mortgagePenalty: number; totalScore: number; rank: number }) => (
              <tr key={r.playerId} style={{
                borderBottom: '1px solid #f3f4f6',
                background: r.rank === 1 ? '#fef9c3' : 'transparent',
              }}>
                <td style={{ padding: '10px 4px', fontSize: 18 }}>{medalEmoji[r.rank - 1] || r.rank}</td>
                <td style={{ padding: '10px 4px', fontWeight: 600, fontSize: 14 }}>{r.name}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: 14 }}>{r.cash}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: 14, color: '#16a34a' }}>{r.stockValue}</td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: 14, color: r.mortgagePenalty > 0 ? '#dc2626' : '#999' }}>
                  {r.mortgagePenalty > 0 ? `-${r.mortgagePenalty}` : '0'}
                </td>
                <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: 16, fontWeight: 800 }}>{r.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 最终股价 */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 6 }}>📊 最终股价</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {engineState && Object.entries(engineState.stockPrices).map(([cargo, price]) => (
              <span key={cargo} style={{ fontSize: 14 }}>
                <strong style={{ color: price >= 30 ? '#dc2626' : '#333' }}>
                  {CARGO_NAMES_MAP[cargo] || cargo}
                </strong>: {String(price)}元
                {Number(price) >= 30 && ' ⭐'}
              </span>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => endGame()}
            style={{
              background: '#2563eb', color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 40px', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            🏠 返回大厅
          </button>
        </div>
      </div>
    </div>
  );
};
