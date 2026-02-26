import React from 'react';
import { useGameStore } from '../../stores';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_COLORS: Record<string, string> = {
  JADE: '#10b981', SILK: '#6366f1', GINSENG: '#f59e0b', NUTMEG: '#8b5cf6',
};

export const SettlementPhase: React.FC = () => {
  const { gameState, getEngineState } = useGameStore();
  const engineState = getEngineState();
  const summary = engineState?.settlementSummary;

  if (!gameState || !engineState) return null;

  const dispatchAcknowledge = () => {
    const pa = engineState.pendingAction;
    if (pa && pa.validActions.length > 0) {
      useGameStore.getState().dispatchAction(pa.validActions[0]);
    }
  };

  const isGameEnding = summary?.anyStockMaxed || summary?.isLastRound;
  const ships = engineState.ships || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overlay-blur">
      <div className="card-light rounded-2xl p-6 max-w-xl w-[90%] shadow-2xl shadow-black/40 max-h-[85vh] overflow-y-auto animate-bounce-in">
        <h2 className="text-center text-xl font-bold t-text font-display mb-5">
          ⚓ 第 {engineState.round} 轮结算
        </h2>

        {/* 船只最终位置 */}
        <div className="glass-light rounded-xl p-4 mb-4">
          <h4 className="text-xs font-semibold t-text-2 mb-3">🚢 船只最终位置</h4>
          <div className="space-y-2">
            {ships.map((ship: { cargo: string; position: number }, i: number) => {
              const isDocked = ship.position >= 14;
              const isAt13 = ship.position === 13;
              let statusIcon = '🔧';
              let statusText = `修船厂 (位置${ship.position})`;
              let statusColor = 'text-amber-400';
              let bgColor = 'bg-amber-500/10';
              let borderColor = 'border-amber-500/15';
              if (isDocked) {
                statusIcon = '✅';
                statusText = `到港 (位置${ship.position})`;
                statusColor = 'text-emerald-400';
                bgColor = 'bg-emerald-500/10';
                borderColor = 'border-emerald-500/15';
              } else if (isAt13) {
                statusIcon = '☠️';
                statusText = `海盗区 (位置${ship.position})`;
                statusColor = 'text-red-400';
                bgColor = 'bg-red-500/10';
                borderColor = 'border-red-500/15';
              }
              return (
                <div key={i} className={`flex items-center justify-between ${bgColor} border ${borderColor} rounded-lg px-3 py-2`}>
                  <span
                    className="text-xs font-medium text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: CARGO_COLORS[ship.cargo] || '#888' }}
                  >
                    {CARGO_NAMES[ship.cargo] || ship.cargo}
                  </span>
                  <span className={`text-xs font-medium ${statusColor}`}>
                    {statusIcon} {statusText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 股价变化 */}
        {(summary?.stockPriceChanges ?? []).length > 0 && (
          <div className="glass-light rounded-xl p-4 mb-4">
            <h4 className="text-xs font-semibold text-ocean-400 mb-2">📈 股价变化</h4>
            <div className="flex flex-wrap gap-3">
              {summary!.stockPriceChanges.map((change: { cargo: string; from: number; to: number }, i: number) => (
                <span key={i} className="text-sm t-text-2">
                  <span style={{ color: CARGO_COLORS[change.cargo] || '#888' }} className="font-semibold">
                    {CARGO_NAMES[change.cargo] || change.cargo}
                  </span>{' '}
                  {change.from} → <strong className="t-text">{change.to}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 玩家资产 */}
        <div className="glass-light rounded-xl p-4 mb-5">
          <h4 className="text-xs font-semibold t-text-2 mb-2">👤 玩家资产</h4>
          <div className="space-y-1.5">
            {engineState.players.map((player: { id: string; name: string; cash: number; isAI: boolean; stocks: Array<{ cargo: string; quantity: number; mortgaged: number }> }) => {
              const stockInfo = player.stocks
                .filter(st => st.quantity > 0)
                .map(st =>
                  `${CARGO_NAMES[st.cargo] || st.cargo}×${st.quantity}${st.mortgaged > 0 ? `(抵${st.mortgaged})` : ''}`
                ).join(', ');
              return (
                <div key={player.id}
                  className={`flex justify-between items-center px-3 py-1.5 rounded-lg ${!player.isAI ? 'bg-ocean-500/10' : ''}`}
                  style={player.isAI ? { background: 'var(--color-input-bg)' } : undefined}
                >
                  <span className="text-xs font-medium t-text">
                    {player.isAI ? '🤖' : '👤'} {player.name}
                  </span>
                  <span className="text-xs t-text-2">
                    💰{player.cash} {stockInfo && `| 📊${stockInfo}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 按钮 */}
        <div className="text-center">
          <button
            onClick={dispatchAcknowledge}
            className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${isGameEnding
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg'
              : 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:shadow-glow-ocean'
              }`}
          >
            {isGameEnding ? '🏁 查看最终结果' : '➡️ 进入下一轮'}
          </button>
        </div>
      </div>
    </div>
  );
};
