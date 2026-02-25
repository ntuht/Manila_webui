import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores';

/** Translate action types to Chinese for display */
function formatLogEntry(entry: {
  playerId: string;
  action: string;
  detail: string;
  round: number;
}, players: { id: string; name: string }[]): { icon: string; text: string } | null {
  const playerName = players.find(p => p.id === entry.playerId)?.name || entry.playerId;

  // System event — detail contains {message: "..."} 
  if (entry.action === 'EVENT') {
    try {
      const data = JSON.parse(entry.detail);
      return { icon: '', text: data.message || entry.detail };
    } catch {
      return { icon: '', text: entry.detail };
    }
  }

  // Player actions
  let detail: Record<string, unknown> = {};
  try { detail = JSON.parse(entry.detail); } catch { /* ignore */ }

  switch (entry.action) {
    case 'BID':
      return { icon: '💵', text: `${playerName} 出价 ${detail.amount} 元` };
    case 'PASS_AUCTION':
      return { icon: '🚫', text: `${playerName} 放弃竞拍` };
    case 'BUY_STOCK':
      return { icon: '📦', text: `${playerName} 购买 ${detail.cargo} 股票` };
    case 'SKIP_BUY_STOCK':
      return { icon: '⏭️', text: `${playerName} 跳过购买股票` };
    case 'MORTGAGE_STOCK':
      return { icon: '🏦', text: `${playerName} 抵押 ${detail.cargo} 股票` };
    case 'REDEEM_STOCK':
      return { icon: '🔓', text: `${playerName} 赎回 ${detail.cargo} 股票` };
    case 'PLACE_SHIPS': {
      const cargos = (detail.cargos as string[]) || [];
      return { icon: '⚓', text: `${playerName} 布置船只: ${cargos.join(', ')}` };
    }
    case 'SELECT_INVESTMENT':
      return { icon: '📋', text: `${playerName} 投资 ${detail.slotId} (花费${detail.cost}元)` };
    case 'SKIP_INVEST':
      return { icon: '⏭️', text: `${playerName} 跳过投资` };
    case 'ROLL_DICE':
      return { icon: '🎲', text: `${playerName} 掷骰子` };
    case 'USE_NAVIGATOR':
      return { icon: '🧭', text: `${playerName} 使用领航员: ${detail.cargo} ${Number(detail.delta) > 0 ? '+' : ''}${detail.delta}` };
    case 'SKIP_NAVIGATOR':
      return { icon: '⏭️', text: `${playerName} 跳过领航员` };
    default:
      return { icon: '❓', text: `${playerName}: ${entry.action}` };
  }
}

export const GameLog: React.FC = () => {
  const { getEngineState, gameState } = useGameStore();
  const engineState = getEngineState();
  const logEntries = engineState?.log || [];
  const players = engineState?.players || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries.length]);

  // Group by round
  const grouped = new Map<number, typeof logEntries>();
  for (const entry of logEntries) {
    const roundEntries = grouped.get(entry.round) || [];
    roundEntries.push(entry);
    grouped.set(entry.round, roundEntries);
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">游戏日志</h3>

      <div ref={scrollRef} className="max-h-96 overflow-y-auto">
        {logEntries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            暂无游戏记录
          </p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([round, entries]) => (
              <div key={round}>
                <div className="text-xs font-bold text-indigo-600 mb-2 sticky top-0 bg-white py-1">
                  第 {round} 轮
                </div>
                <div className="space-y-1">
                  {entries.map((entry, idx) => {
                    const formatted = formatLogEntry(
                      entry as { playerId: string; action: string; detail: string; round: number },
                      players
                    );
                    if (!formatted) return null;

                    const isEvent = entry.action === 'EVENT';
                    const isSettlementHeader = isEvent && formatted.text.includes('━━━');

                    return (
                      <div
                        key={idx}
                        className={`text-sm py-0.5 ${isSettlementHeader
                            ? 'font-bold text-orange-700 border-t border-orange-200 mt-2 pt-2'
                            : isEvent
                              ? 'text-gray-700 pl-2 border-l-2 border-orange-300'
                              : 'text-gray-600 pl-2 border-l-2 border-gray-200'
                          }`}
                      >
                        {formatted.icon && <span className="mr-1">{formatted.icon}</span>}
                        {formatted.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
