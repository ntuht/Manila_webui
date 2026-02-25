import React from 'react';
import { useGameStore } from '../../stores';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠',
  SILK: '丝绸',
  GINSENG: '人参',
  NUTMEG: '肉豆蔻',
};
const CARGO_COLORS: Record<string, string> = {
  JADE: '#22c55e',
  SILK: '#ef4444',
  GINSENG: '#a855f7',
  NUTMEG: '#f59e0b',
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

  // 获取每艘船的最终位置信息
  const ships = engineState.ships || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 32,
        maxWidth: 640, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          ⚓ 第 {engineState.round} 轮结算
        </h2>

        {/* 船只状态 - 带位置 */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h4 style={{ fontWeight: 600, color: '#334155', marginBottom: 10, fontSize: 14 }}>🚢 船只最终位置</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ships.map((ship: { cargo: string; position: number }, i: number) => {
              const isDocked = ship.position >= 14;
              const isAt13 = ship.position === 13;
              let statusIcon = '🔧';
              let statusText = `修船厂 (位置${ship.position})`;
              let bgColor = '#fef3c7';
              let borderColor = '#fde68a';
              let textColor = '#92400e';
              if (isDocked) {
                statusIcon = '✅';
                statusText = `到港 (位置${ship.position})`;
                bgColor = '#dcfce7';
                borderColor = '#bbf7d0';
                textColor = '#166534';
              } else if (isAt13) {
                statusIcon = '☠️';
                statusText = `海盗区 (位置${ship.position})`;
                bgColor = '#fee2e2';
                borderColor = '#fecaca';
                textColor = '#991b1b';
              }
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: CARGO_COLORS[ship.cargo] || '#888', color: 'white',
                      padding: '2px 10px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                    }}>{CARGO_NAMES[ship.cargo] || ship.cargo}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: textColor }}>
                    {statusIcon} {statusText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 股价变化 */}
        {(summary?.stockPriceChanges ?? []).length > 0 && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <h4 style={{ fontWeight: 600, color: '#1e40af', marginBottom: 8, fontSize: 14 }}>📈 股价变化</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {summary!.stockPriceChanges.map((change: { cargo: string; from: number; to: number }, i: number) => (
                <span key={i} style={{ fontSize: 14 }}>
                  <span style={{ color: CARGO_COLORS[change.cargo] || '#888', fontWeight: 600 }}>
                    {CARGO_NAMES[change.cargo] || change.cargo}
                  </span>{' '}
                  {change.from} → <strong>{change.to}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 玩家资产 */}
        <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 24 }}>
          <h4 style={{ fontWeight: 600, color: '#374151', marginBottom: 10, fontSize: 14 }}>👤 玩家资产</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {engineState.players.map((player: { id: string; name: string; cash: number; isAI: boolean; stocks: Array<{ cargo: string; quantity: number; mortgaged: number }> }) => {
              const stockInfo = player.stocks
                .filter(st => st.quantity > 0)
                .map(st =>
                  `${CARGO_NAMES[st.cargo] || st.cargo}×${st.quantity}${st.mortgaged > 0 ? `(抵${st.mortgaged})` : ''}`
                ).join(', ');
              return (
                <div key={player.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 8px', borderRadius: 6,
                  background: player.isAI ? 'transparent' : '#e0f2fe',
                }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>
                    {player.isAI ? '🤖' : '👤'} {player.name}
                  </span>
                  <span style={{ fontSize: 13, color: '#555' }}>
                    💰{player.cash} {stockInfo && `| 📊${stockInfo}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 按钮 */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={dispatchAcknowledge}
            style={{
              background: isGameEnding ? '#dc2626' : '#2563eb',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 40px', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            {isGameEnding ? '🏁 查看最终结果' : '➡️ 进入下一轮'}
          </button>
        </div>
      </div>
    </div>
  );
};
