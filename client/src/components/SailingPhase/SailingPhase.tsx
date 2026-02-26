import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Card } from '../Shared/Card';
import { Button } from '../Shared/Button';

export const SailingPhase: React.FC = () => {
  const { gameState, rollDice, useNavigator } = useGameStore();
  const [navigatorUsed, setNavigatorUsed] = useState(false);

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const diceResults = gameState.diceResults && gameState.diceResults.length > 0 ?
    gameState.diceResults[gameState.diceResults.length - 1] : null;

  const hasRolledDice = diceResults !== null;

  const handleRollDice = () => {
    const result = rollDice();
    if (!result.success) alert(result.error || '投掷骰子失败');
  };

  const handleUseNavigator = (action: string) => {
    const result = useNavigator(currentPlayer.id, action);
    if (result.success) {
      setNavigatorUsed(true);
      alert('领航员使用成功！');
    } else {
      alert(result.error || '使用领航员失败');
    }
  };

  const getCargoConfig = (cargoType: string) => {
    const map: Record<string, { name: string; bg: string; text: string }> = {
      JADE: { name: '翡翠', bg: 'bg-emerald-500', text: 'text-white' },
      SILK: { name: '丝绸', bg: 'bg-indigo-500', text: 'text-white' },
      GINSENG: { name: '人参', bg: 'bg-amber-500', text: 'text-black' },
      NUTMEG: { name: '肉豆蔻', bg: 'bg-violet-500', text: 'text-white' },
    };
    return map[cargoType] || { name: cargoType, bg: 'bg-slate-500', text: 'text-white' };
  };

  return (
    <div className="space-y-4">
      <Card title="航行阶段" className="p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              航行阶段 {gameState.sailingPhase || 1} / 3
            </h3>
            <span className="text-xs text-slate-500">
              当前: {currentPlayer.name}
            </span>
          </div>

          {/* 骰子投掷 */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-slate-400">投掷骰子</h4>
            {!hasRolledDice ? (
              <Button onClick={handleRollDice} className="w-full">
                🎲 投掷骰子
              </Button>
            ) : diceResults ? (
              <div className="glass-light rounded-xl p-5">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {gameState.ships.map((ship, index) => {
                    const diceValue = index === 0 ? diceResults.dice1 :
                      index === 1 ? diceResults.dice2 :
                        diceResults.dice3;
                    const cfg = getCargoConfig(ship.cargoType);

                    return (
                      <div key={ship.id} className="flex flex-col items-center gap-1.5">
                        <div className={`w-11 h-11 ${cfg.bg} rounded-lg flex items-center justify-center ${cfg.text} text-lg font-bold shadow-lg`}>
                          {diceValue}
                        </div>
                        <span className="text-[10px] text-slate-400">{cfg.name}船</span>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="text-xl font-bold text-slate-500">=</div>
                    <div className="w-14 h-11 bg-gold-400 rounded-lg flex items-center justify-center text-navy-900 text-xl font-bold shadow-lg">
                      {diceResults.total}
                    </div>
                    <span className="text-[10px] text-slate-400">总和</span>
                  </div>
                </div>

                <div className="text-center text-xs text-slate-400">
                  <div className="flex justify-center gap-3">
                    {gameState.ships.map((ship, index) => {
                      const diceValue = index === 0 ? diceResults.dice1 :
                        index === 1 ? diceResults.dice2 :
                          diceResults.dice3;
                      const newPosition = ship.position + diceValue;
                      return (
                        <span key={ship.id} className="text-[10px]">
                          {getCargoConfig(ship.cargoType).name}: {ship.position} → {newPosition}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 领航员选项 */}
          {hasRolledDice && !navigatorUsed && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-slate-400">使用领航员（可选）</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handleUseNavigator('SMALL_NAVIGATOR')}
                  className="p-3"
                  size="sm"
                >
                  <div className="text-center">
                    <div className="text-base">🧭</div>
                    <div className="text-xs font-medium text-slate-200">小领航员</div>
                    <div className="text-[10px] text-slate-500">+1 移动力</div>
                  </div>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleUseNavigator('BIG_NAVIGATOR')}
                  className="p-3"
                  size="sm"
                >
                  <div className="text-center">
                    <div className="text-base">🧭🧭</div>
                    <div className="text-xs font-medium text-slate-200">大领航员</div>
                    <div className="text-[10px] text-slate-500">+2 移动力</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* 船只状态 */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-slate-400">船只状态</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {gameState.ships.map((ship, index) => {
                const cfg = getCargoConfig(ship.cargoType);
                return (
                  <div key={index} className="glass-light rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-xs font-medium text-slate-200`}>{cfg.name} 船</div>
                        <div className="text-[10px] text-slate-500">位置: {ship.position}</div>
                      </div>
                      <div>
                        {ship.isDocked && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">已到港</span>
                        )}
                        {ship.isHijacked && (
                          <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded">被劫持</span>
                        )}
                        {ship.isInShipyard && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded">修船厂</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
