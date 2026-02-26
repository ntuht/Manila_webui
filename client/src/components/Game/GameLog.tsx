import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores';

function formatLogEntry(entry: {
  playerId: string;
  action: string;
  detail: string;
  round: number;
}, players: { id: string; name: string }[]): { icon: string; text: string } | null {
  const playerName = players.find(p => p.id === entry.playerId)?.name || entry.playerId;

  if (entry.action === 'EVENT') {
    try {
      const data = JSON.parse(entry.detail);
      return { icon: '', text: data.message || entry.detail };
    } catch {
      return { icon: '', text: entry.detail };
    }
  }

  let detail: Record<string, unknown> = {};
  try { detail = JSON.parse(entry.detail); } catch { /* ignore */ }

  switch (entry.action) {
    case 'BID':
      return { icon: '💵', text: `${playerName} 出价 ${detail.amount}` };
    case 'PASS_AUCTION':
      return { icon: '🚫', text: `${playerName} 放弃竞拍` };
    case 'BUY_STOCK':
      return { icon: '📦', text: `${playerName} 购买 ${detail.cargo} 股票` };
    case 'SKIP_BUY_STOCK':
      return { icon: '⏭️', text: `${playerName} 跳过购买` };
    case 'MORTGAGE_STOCK':
      return { icon: '🏦', text: `${playerName} 抵押 ${detail.cargo}` };
    case 'REDEEM_STOCK':
      return { icon: '🔓', text: `${playerName} 赎回 ${detail.cargo}` };
    case 'PLACE_SHIPS': {
      const cargos = (detail.cargos as string[]) || [];
      return { icon: '⚓', text: `${playerName} 选船: ${cargos.join(', ')}` };
    }
    case 'SELECT_INVESTMENT':
      return { icon: '📋', text: `${playerName} 投资 ${detail.slotId} (${detail.cost}元)` };
    case 'SKIP_INVEST':
      return { icon: '⏭️', text: `${playerName} 跳过投资` };
    case 'ROLL_DICE':
      return { icon: '🎲', text: `${playerName} 掷骰子` };
    case 'USE_NAVIGATOR':
      return { icon: '🧭', text: `${playerName} 领航: ${detail.cargo} ${Number(detail.delta) > 0 ? '+' : ''}${detail.delta}` };
    case 'SKIP_NAVIGATOR':
      return { icon: '⏭️', text: `${playerName} 跳过领航员` };
    default:
      return { icon: '❓', text: `${playerName}: ${entry.action}` };
  }
}

export const GameLog: React.FC = () => {
  const { getEngineState } = useGameStore();
  const engineState = getEngineState();
  const logEntries = engineState?.log || [];
  const players = engineState?.players || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [prevCount, setPrevCount] = useState(logEntries.length);

  // Track new entries for badge
  const hasNewEntries = logEntries.length > prevCount;

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries.length, isExpanded]);

  // Format recent entries
  const recentEntries = logEntries.slice(-3).map((entry, idx) => {
    const formatted = formatLogEntry(
      entry as { playerId: string; action: string; detail: string; round: number },
      players
    );
    return formatted ? { ...formatted, key: logEntries.length - 3 + idx } : null;
  }).filter(Boolean);

  // Group all entries by round for expanded view
  const grouped = new Map<number, typeof logEntries>();
  for (const entry of logEntries) {
    const roundEntries = grouped.get(entry.round) || [];
    roundEntries.push(entry);
    grouped.set(entry.round, roundEntries);
  }

  return (
    <div className="card">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) setPrevCount(logEntries.length);
        }}
      >
        <h3 className="text-xs font-semibold t-text-2">
          📜 游戏日志
          {hasNewEntries && !isExpanded && (
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-ocean-400 inline-block animate-pulse" />
          )}
        </h3>
        <span className="text-[10px] t-text-m">{isExpanded ? '收起 ▲' : '展开 ▼'}</span>
      </div>

      {/* 收起: 最近 3 条 */}
      {!isExpanded && (
        <div className="mt-2 space-y-0.5">
          {recentEntries.length === 0 ? (
            <p className="text-[10px] t-text-m">暂无记录</p>
          ) : (
            recentEntries.map((entry: any) => (
              <div key={entry.key} className="text-[10px] t-text-3 truncate">
                {entry.icon && <span className="mr-0.5">{entry.icon}</span>}
                {entry.text}
              </div>
            ))
          )}
        </div>
      )}

      {/* 展开: 完整日志 */}
      {isExpanded && (
        <div ref={scrollRef} className="mt-2 max-h-64 overflow-y-auto pr-1">
          {logEntries.length === 0 ? (
            <p className="text-[10px] text-slate-600 text-center py-2">暂无记录</p>
          ) : (
            <div className="space-y-2">
              {[...grouped.entries()].map(([round, entries]) => (
                <div key={round}>
                  <div className="text-[9px] font-bold text-gold-400 mb-1 sticky top-0 py-0.5" style={{ background: 'var(--color-bg-body)' }}>
                    第 {round} 轮
                  </div>
                  <div className="space-y-0.5">
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
                          className={`text-[10px] py-0.5 ${isSettlementHeader
                            ? 'font-bold text-amber-400 border-t border-amber-500/20 mt-1 pt-1'
                            : isEvent
                              ? 'text-slate-400 pl-2 border-l border-amber-500/20'
                              : 't-text-3 pl-2 border-l'
                            }`}
                        >
                          {formatted.icon && <span className="mr-0.5">{formatted.icon}</span>}
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
      )}
    </div>
  );
};
