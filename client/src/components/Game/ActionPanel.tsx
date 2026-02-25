/**
 * ActionPanel — engine-aware action panel
 *
 * Shows actions appropriate for the current phase AND for the pending player.
 * When it's an AI's turn, shows a waiting message.
 * When it's a human's turn, shows phase-specific controls.
 */

import React from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';

export const ActionPanel: React.FC = () => {
  const { currentPhase, gameState, rollDice, selectInvestment, nextPhase, getEngineState } = useGameStore();
  const engineState = getEngineState();
  const pendingAction = engineState?.pendingAction;
  const pendingPlayer = engineState?.players.find(p => p.id === pendingAction?.playerId);
  const isHumanTurn = pendingPlayer && !pendingPlayer.isAI;
  const isAITurn = pendingPlayer?.isAI;

  const handleRollDice = () => {
    const result = rollDice();
    if (!result.success) {
      alert(result.error);
    }
  };

  const renderPhaseActions = () => {
    // No game running
    if (!gameState || !engineState) {
      return (
        <p className="text-sm text-gray-600 text-center">
          等待游戏开始
        </p>
      );
    }

    // AI's turn — show waiting
    if (isAITurn && currentPhase !== 'SETTLEMENT' && currentPhase !== 'GAME_END') {
      return (
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            🤖 等待 {pendingPlayer?.name} 行动...
          </p>
          <p className="text-xs text-gray-400">
            {pendingAction?.message || pendingAction?.actionType}
          </p>
        </div>
      );
    }

    switch (currentPhase) {
      case 'AUCTION':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              在上方拍卖面板中出价或放弃竞拍
            </p>
          </div>
        );

      case 'HARBOR_MASTER':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              在港务长向导中完成操作
            </p>
          </div>
        );

      case 'INVESTMENT':
        if (!isHumanTurn) {
          return (
            <p className="text-sm text-gray-500 text-center">
              等待 AI 投资...
            </p>
          );
        }
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              选择一个投资槽位
            </p>
            {/* Show available investment actions */}
            {pendingAction?.validActions && (() => {
              const CARGO_CN: Record<string, string> = { JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻' };
              const SLOT_CN: Record<string, string> = {
                'pirate-captain': '海盗船长', 'pirate-crew': '海盗船员',
                'navigator-big': '大领航员', 'navigator-small': '小领航员',
                'harbor-A': '港口办事处A', 'harbor-B': '港口办事处B', 'harbor-C': '港口办事处C',
                'shipyard-A': '修船厂A', 'shipyard-B': '修船厂B', 'shipyard-C': '修船厂C',
                'insurance': '保险',
              };
              const slotName = (slotId: string): string => {
                if (SLOT_CN[slotId]) return SLOT_CN[slotId];
                const m = slotId.match(/^crew-(\w+)-(\d+)$/);
                if (m) return `${CARGO_CN[m[1].toUpperCase()] || m[1]}船员${parseInt(m[2]) + 1}`;
                return slotId;
              };
              return (
                <div className="space-y-2">
                  {pendingAction.validActions
                    .filter(a => a.type === 'SELECT_INVESTMENT')
                    .slice(0, 6)
                    .map((action, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        onClick={() => selectInvestment(pendingAction.playerId, String(action.data.slotId))}
                        className="w-full text-sm"
                      >
                        {slotName(String(action.data.slotId))} (💰{String(action.data.cost)})
                      </Button>
                    ))}
                  {/* Mortgage stock buttons */}
                  {pendingAction.validActions
                    .filter(a => a.type === 'MORTGAGE_STOCK')
                    .map((action, idx) => (
                      <Button
                        key={`mortgage-${idx}`}
                        variant="secondary"
                        onClick={() => useGameStore.getState().dispatchAction(action)}
                        className="w-full text-sm text-orange-600 border-orange-300"
                      >
                        📜 抵押 {CARGO_CN[String(action.data.cargo)] || String(action.data.cargo)} 股票 (+12💰)
                      </Button>
                    ))}
                  {/* Pass button */}
                  {pendingAction.validActions.find(a => a.type === 'SKIP_INVEST') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const passAction = pendingAction.validActions.find(a => a.type === 'SKIP_INVEST');
                        if (passAction) {
                          useGameStore.getState().dispatchAction(passAction);
                        }
                      }}
                      className="w-full text-sm"
                    >
                      跳过本轮投资
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>
        );

      case 'SAILING':
        // Check what the engine expects
        if (!pendingAction) {
          return (
            <p className="text-sm text-gray-500 text-center">
              航行中...
            </p>
          );
        }

        if (pendingAction.actionType === 'ROLL_DICE') {
          return (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                第 {(engineState.currentRollIndex || 0) + 1} 次骰子
              </p>
              <Button onClick={handleRollDice} className="w-full">
                🎲 投掷骰子
              </Button>
            </div>
          );
        }

        if (pendingAction.actionType === 'USE_NAVIGATOR' || pendingAction.actionType === 'SKIP_NAVIGATOR') {
          return (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                领航员决策
              </p>
              {pendingAction.validActions.map((action, idx) => {
                let label = '';
                if (action.type === 'SKIP_NAVIGATOR') {
                  label = '跳过领航员';
                } else {
                  const moves = action.data.moves as Array<{ cargo: string; delta: number }> | undefined;
                  if (moves && moves.length > 0) {
                    label = `使用领航员: ${moves.map(m =>
                      `${m.cargo} ${m.delta > 0 ? '+' : ''}${m.delta}`
                    ).join(', ')}`;
                  } else {
                    label = `使用领航员: ${String(action.data.cargo)} ${Number(action.data.delta) > 0 ? '+' : ''}${String(action.data.delta)}`;
                  }
                }
                return (
                  <Button
                    key={idx}
                    variant={action.type === 'SKIP_NAVIGATOR' ? 'secondary' : 'primary'}
                    onClick={() => useGameStore.getState().dispatchAction(action)}
                    className="w-full text-sm"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          );
        }

        // Pirate boarding (after 2nd roll — ship at position 13)
        if (pendingAction.actionType === 'PIRATE_BOARD') {
          return (
            <div className="space-y-3">
              <p className="text-sm text-orange-700 text-center font-medium">
                ☠️ 海盗上船决策
              </p>
              <p className="text-xs text-gray-500 text-center">
                {pendingAction.message}
              </p>
              {pendingAction.validActions.map((action, idx) => {
                let label = '';
                if (action.type === 'PIRATE_BOARD') {
                  label = `⚓ 上船: ${String(action.data.cargo)} (占据空位)`;
                } else if (action.type === 'PIRATE_KICK') {
                  const kickedName = engineState.players.find(
                    (p: { id: string }) => p.id === action.data.kickPlayerId
                  )?.name || action.data.kickPlayerId;
                  label = `👊 踢掉 ${kickedName}，上 ${String(action.data.cargo)} 船`;
                } else if (action.type === 'PIRATE_PASS') {
                  label = '🚫 放弃上船';
                }
                return (
                  <Button
                    key={idx}
                    variant={action.type === 'PIRATE_PASS' ? 'secondary' : 'primary'}
                    onClick={() => useGameStore.getState().dispatchAction(action)}
                    className="w-full text-sm"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          );
        }

        // Pirate hijack decision (after 3rd roll — captain decides fate)
        if (pendingAction.actionType === 'PIRATE_HIJACK') {
          return (
            <div className="space-y-3">
              <p className="text-sm text-red-700 text-center font-medium">
                ☠️ 海盗劫船决策
              </p>
              <p className="text-xs text-gray-500 text-center">
                {pendingAction.message}
              </p>
              {pendingAction.validActions.map((action, idx) => {
                const cargo = String(action.data.cargo);
                const decision = action.data.decision;
                const label = decision === 'dock'
                  ? `🚢 ${cargo} 送往港口 (股价上涨)`
                  : `🔧 ${cargo} 送入修船厂 (股价不变)`;
                return (
                  <Button
                    key={idx}
                    variant={decision === 'dock' ? 'primary' : 'secondary'}
                    onClick={() => useGameStore.getState().dispatchAction(action)}
                    className="w-full text-sm"
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          );
        }

        return (
          <p className="text-sm text-gray-500 text-center">
            {pendingAction.message || '等待...'}
          </p>
        );

      case 'SETTLEMENT':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              结算完成
            </p>
            {pendingAction && pendingAction.validActions.length > 0 ? (
              <Button
                onClick={() => {
                  useGameStore.getState().dispatchAction(pendingAction.validActions[0]);
                }}
                className="w-full"
              >
                {gameState.round >= gameState.gameConfig.rounds ? '查看结果' : '下一轮'}
              </Button>
            ) : (
              <Button onClick={nextPhase} className="w-full">
                继续
              </Button>
            )}
          </div>
        );

      case 'GAME_END':
        return (
          <div className="space-y-3">
            <p className="text-sm text-green-600 text-center font-medium">
              🏆 游戏结束！
            </p>
            <Button onClick={() => useGameStore.getState().endGame()} className="w-full">
              返回大厅
            </Button>
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-600 text-center">
            等待游戏开始
          </p>
        );
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">操作面板</h3>
      {renderPhaseActions()}
    </div>
  );
};
