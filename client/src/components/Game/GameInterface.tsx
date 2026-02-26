import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../stores';
import { GameBoard } from '../Board';
import { ActionBanner } from './ActionBanner';
import { GameLog } from './GameLog';
import { HarborMasterWizard } from '../HarborMaster';
import { InvestmentRoundIndicator } from '../Investment';
import { AuctionPhase, BidHistory } from '../Auction';
import { InvestmentHistory } from '../InvestmentPhase';
import { DiceResults } from '../SailingPhase';
import { SettlementPhase } from '../SettlementPhase';
import { MyPlayerDashboard } from '../Player/MyPlayerDashboard';
import { InvestmentSummary } from '../Board/InvestmentSummary';
import { MobileInfoBar } from './MobileInfoBar';

export const GameInterface: React.FC = () => {
  const { gameState, getEngineState } = useGameStore();

  const engineState = getEngineState();
  const pendingPlayerId = engineState?.pendingAction?.playerId;
  const pendingPlayer = engineState?.players.find(p => p.id === pendingPlayerId);
  const isHumanHarborMaster = gameState?.harborMaster && pendingPlayer && !pendingPlayer.isAI;
  const isAIHarborMaster = gameState?.harborMaster && pendingPlayer?.isAI;

  return (
    <div className="animate-fade-in">
      {/* 港务长向导 (modal overlay) */}
      {isHumanHarborMaster && <HarborMasterWizard />}
      {/* 结算/游戏结束 (modal overlays) */}
      {gameState?.phase === 'SETTLEMENT' && <SettlementPhase />}
      {gameState?.phase === 'GAME_END' && engineState?.gameResult && <GameEndResult />}

      {/* ===== 响应式布局 ===== */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-start">

        {/* ===== 左侧栏: 我的信息 + 对手 (桌面) ===== */}
        <div className="w-[260px] shrink-0 space-y-3 hidden lg:block">
          <MyPlayerDashboard />
        </div>

        {/* ===== 中间栏: 棋盘(上) + 操作(下) ===== */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          {/* 移动端: 阶段感知信息条 */}
          <MobileInfoBar />

          {/* AI 港务长等待 */}
          {isAIHarborMaster && (
            <div className="glass-light rounded-xl p-2 text-center">
              <div className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs t-text-2">
                  🤖 {pendingPlayer.name} (港务长) 正在行动...
                </span>
              </div>
            </div>
          )}

          {/* 棋盘 (船只轨道) — 始终在上方 */}
          <GameBoard />

          {/* 骰子结果 — 显示2秒后自动隐藏 */}
          <DiceToast diceResults={gameState?.diceResults} />

          {/* 移动端: 投资阶段轮次指示器 */}
          <div className="lg:hidden">
            {gameState?.investmentRound && <InvestmentRoundIndicator />}
          </div>

          {/* 操作横幅 */}
          <ActionBanner />

          {/* 阶段详情 — 拍卖/投资/航行 */}
          <PhaseDetail />

          {/* 移动端: 投资历史 */}
          <div className="lg:hidden">
            {gameState?.phase === 'INVESTMENT' && <InvestmentHistory />}
          </div>
        </div>

        {/* ===== 右侧栏: 参考信息 (桌面) ===== */}
        <div className="w-[240px] shrink-0 space-y-3 hidden lg:block">
          <StockPrices />
          {gameState?.investmentRound && <InvestmentRoundIndicator />}
          {gameState?.phase === 'INVESTMENT' && <InvestmentHistory />}
          <InvestmentSummary />
          <GameLog />
        </div>
      </div>

      {/* 移动端: 可折叠的参考信息抽屉 */}
      <MobileDrawer gameState={gameState} />
    </div>
  );
};

/* ================================================================
   DiceToast — shows dice results for 2 seconds then auto-hides
   ================================================================ */
const DiceToast: React.FC<{ diceResults?: { dice1: number; dice2: number; dice3: number; total: number; phase: number }[] }> = ({ diceResults }) => {
  const [visible, setVisible] = useState(false);
  const prevCountRef = useRef(0);

  const count = diceResults?.length ?? 0;

  useEffect(() => {
    if (count > prevCountRef.current && count > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  // Also update ref when count changes without triggering
  useEffect(() => {
    prevCountRef.current = count;
  }, [count]);

  if (!visible || !diceResults || diceResults.length === 0) return null;

  return (
    <div className="glass-light rounded-xl p-2.5 border border-gold-400/10 animate-fade-in">
      <DiceResults diceResults={diceResults} />
    </div>
  );
};

/* ================================================================
   阶段详情 — 拍卖/投资/航行各阶段的专属 UI
   ================================================================ */
const PhaseDetail: React.FC = () => {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  switch (gameState.phase) {
    case 'AUCTION':
      return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2"><AuctionPhase /></div>
          <div className="xl:col-span-1"><BidHistory /></div>
        </div>
      );

    case 'INVESTMENT':
      return null; // round indicator + history are in right sidebar

    case 'SAILING':
      return null;

    default:
      return null;
  }
};

/* ================================================================
   MobileDrawer — collapsible info drawer for mobile
   Shows player dashboard + extra info without scrolling away
   ================================================================ */
const MobileDrawer: React.FC<{ gameState: any }> = ({ gameState }) => {
  const [open, setOpen] = useState(false);
  if (!gameState) return null;

  return (
    <div className="lg:hidden mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium t-text-2"
        style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}
      >
        <span>📋 更多信息</span>
        <span className="t-text-m text-[10px]">{open ? '收起 ▲' : '展开 ▼'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3 animate-fade-in">
          <MyPlayerDashboard />
          <StockPrices />
          <InvestmentSummary />
          <GameLog />
        </div>
      )}
    </div>
  );
};

/* ================================================================
   股票价格面板
   ================================================================ */
const CARGO_NAMES_MAP: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_COLORS: Record<string, string> = {
  JADE: 'text-emerald-400', SILK: 'text-indigo-400', GINSENG: 'text-amber-400', NUTMEG: 'text-violet-400',
};

const StockPrices: React.FC = () => {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  return (
    <div className="card">
      <h3 className="text-xs font-semibold t-text-2 mb-2">📊 股票价格</h3>
      <div className="space-y-1">
        {Object.entries(gameState.stockPrices).map(([cargo, price]) => (
          <div key={cargo} className="flex justify-between items-center">
            <span className={`text-xs ${CARGO_COLORS[cargo] || 'text-slate-400'}`}>
              {CARGO_NAMES_MAP[cargo] || cargo}
            </span>
            <span className="text-xs font-medium text-gold-400">
              {price} 元 {Number(price) >= 30 ? '⭐' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ================================================================
   游戏结束结果 (overlay)
   ================================================================ */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overlay-blur">
      <div className="card-light rounded-2xl p-6 max-w-xl w-[90%] shadow-2xl shadow-black/40 animate-bounce-in">
        <h2 className="text-center text-2xl font-black text-gold-gradient font-display mb-2">
          🏆 游戏结束
        </h2>
        <p className="text-center text-xs t-text-3 mb-5">
          共进行 {result.totalRounds} 轮
        </p>

        <div className="mb-5 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-3 py-2 text-left text-[10px] t-text-3 font-medium">排名</th>
                <th className="px-3 py-2 text-left text-[10px] t-text-3 font-medium">玩家</th>
                <th className="px-3 py-2 text-right text-[10px] t-text-3 font-medium">现金</th>
                <th className="px-3 py-2 text-right text-[10px] t-text-3 font-medium">股票</th>
                <th className="px-3 py-2 text-right text-[10px] t-text-3 font-medium">罚金</th>
                <th className="px-3 py-2 text-right text-[10px] t-text-3 font-bold">总分</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r: { playerId: string; name: string; cash: number; stockValue: number; mortgagePenalty: number; totalScore: number; rank: number }) => (
                <tr key={r.playerId} className={`border-b border-white/5 ${r.rank === 1 ? 'bg-gold-400/5' : ''}`}>
                  <td className="px-3 py-2.5 text-base">{medalEmoji[r.rank - 1] || r.rank}</td>
                  <td className="px-3 py-2.5 font-semibold text-xs t-text">{r.name}</td>
                  <td className="px-3 py-2.5 text-right text-xs t-text-2">{r.cash}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-emerald-400">{r.stockValue}</td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    <span className={r.mortgagePenalty > 0 ? 'text-red-400' : 'text-slate-600'}>
                      {r.mortgagePenalty > 0 ? `-${r.mortgagePenalty}` : '0'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-gold-400">{r.totalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-light rounded-xl p-3 mb-5">
          <h4 className="text-xs font-semibold text-emerald-400 mb-2">📊 最终股价</h4>
          <div className="flex gap-4 flex-wrap">
            {engineState && Object.entries(engineState.stockPrices).map(([cargo, price]) => (
              <span key={cargo} className="text-xs t-text-2">
                <strong className={`${CARGO_COLORS[cargo] || 'text-slate-400'}`}>
                  {CARGO_NAMES_MAP[cargo] || cargo}
                </strong>: {String(price)}元
                {Number(price) >= 30 && ' ⭐'}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => endGame()}
            className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:shadow-glow-ocean transition-all duration-200 active:scale-[0.97]"
          >
            🏠 返回大厅
          </button>
        </div>
      </div>
    </div>
  );
};
