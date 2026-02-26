import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import { MortgageStockModal } from './MortgageStockModal';
import type { CargoType } from '../../types';

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_DOTS: Record<string, string> = {
  JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};
const CARGO_TEXT: Record<string, string> = {
  JADE: 'text-emerald-400', SILK: 'text-indigo-400', GINSENG: 'text-amber-400', NUTMEG: 'text-violet-400',
};

export const StockPurchaseStep: React.FC = () => {
  const { gameState, getEngineState, buyHarborMasterStock, skipStockPurchase, mortgageStock } = useGameStore();
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [showMortgageModal, setShowMortgageModal] = useState(false);
  const [mortgageSuccess, setMortgageSuccess] = useState(false);

  const engineState = getEngineState();

  if (!gameState || !engineState) return null;

  const currentPlayer = gameState.players.find(p => p.id === gameState.harborMaster?.playerId);
  const allPlayers = engineState.players;

  return (
    <div className="space-y-4">
      {/* ===== 上部: 购买操作 ===== */}
      <div>
        <h3 className="text-sm font-semibold t-text">选择购买股票（可选）</h3>
        <p className="text-[10px] t-text-3 mt-0.5">按 max(5, 当前股价) 购买一股货物</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['JADE', 'SILK', 'GINSENG', 'NUTMEG'] as CargoType[]).map(cargo => {
          const price = Math.max(5, gameState.stockPrices[cargo]);
          const isSelected = selectedCargo === cargo;
          const canAfford = currentPlayer && currentPlayer.cash >= price;

          return (
            <div
              key={cargo}
              className={`border rounded-xl p-2.5 cursor-pointer transition-all ${isSelected
                ? 'border-ocean-500/40 bg-ocean-500/10'
                : canAfford
                  ? 'hover:border-ocean-500/20'
                  : 'opacity-50'
                }`}
              style={!isSelected ? { background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' } : undefined}
              onClick={() => {
                if (canAfford) {
                  setSelectedCargo(cargo);
                  setMortgageSuccess(false);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${CARGO_DOTS[cargo]}`} />
                <div>
                  <div className="text-xs font-medium t-text">{CARGO_NAMES[cargo]}</div>
                  <div className="text-[10px] t-text-3">
                    股价 {gameState.stockPrices[cargo]} · 购买 {price}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            if (selectedCargo) {
              const result = buyHarborMasterStock(selectedCargo);
              if (result.success) {
                setHasPurchased(true);
              } else {
                if (result.error?.includes('Insufficient funds') || result.error?.includes('资金不足') || result.error?.includes('Insufficient funds to buy stock')) {
                  setShowMortgageModal(true);
                } else {
                  alert(result.error || '购买失败');
                }
              }
            }
          }}
          disabled={!selectedCargo || hasPurchased}
          size="sm"
          className="flex-1"
        >
          {hasPurchased ? '✓ 已购买' : '购买股票'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowMortgageModal(true)}
          disabled={hasPurchased}
          className="text-amber-400 border-amber-500/20"
        >
          📜 抵押
        </Button>
        <Button variant="ghost" size="sm" onClick={skipStockPurchase} disabled={hasPurchased} className="flex-1">
          跳过
        </Button>
      </div>

      {hasPurchased && (
        <div className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/15">
          ✓ 购买成功，已自动进入下一步
        </div>
      )}
      {mortgageSuccess && (
        <div className="text-xs text-ocean-400 bg-ocean-500/10 px-3 py-1.5 rounded-lg border border-ocean-500/15">
          ✓ 抵押成功，可重新尝试购买
        </div>
      )}

      {/* ===== 下部: 信息参考面板 ===== */}
      <div className="border-t border-white/10 pt-3 space-y-3">
        {/* 当前股价 + 我的持仓 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 股价 */}
          <div className="rounded-lg p-2.5" style={{ background: 'var(--color-input-bg)' }}>
            <h4 className="text-[9px] t-text-3 mb-1.5 font-medium">📊 当前股价</h4>
            {Object.entries(gameState.stockPrices).map(([cargo, price]) => (
              <div key={cargo} className="flex justify-between items-center py-0.5">
                <span className={`text-[10px] ${CARGO_TEXT[cargo] || 'text-slate-400'}`}>
                  {CARGO_NAMES[cargo] || cargo}
                </span>
                <span className="text-[10px] font-medium text-gold-400">
                  {price}元 {Number(price) >= 30 ? '⭐' : ''}
                </span>
              </div>
            ))}
          </div>

          {/* 我的持仓 */}
          {currentPlayer && (
            <div className="rounded-lg p-2.5" style={{ background: 'var(--color-input-bg)' }}>
              <h4 className="text-[9px] t-text-3 mb-1.5 font-medium">
                💰 我的持仓 · 现金 <span className="text-gold-400">{currentPlayer.cash}</span>
              </h4>
              {currentPlayer.stocks && currentPlayer.stocks.length > 0 ? (
                currentPlayer.stocks
                  .filter((s: { quantity: number }) => s.quantity > 0)
                  .map((s: { cargoType: string; quantity: number; mortgagedCount: number }) => (
                    <div key={s.cargoType} className="flex justify-between items-center py-0.5">
                      <span className={`text-[10px] ${CARGO_TEXT[s.cargoType] || 'text-slate-400'}`}>
                        {CARGO_NAMES[s.cargoType] || s.cargoType}
                      </span>
                      <span className="text-[10px] t-text-2">
                        {s.quantity}股
                        {s.mortgagedCount > 0 && (
                          <span className="text-red-400 ml-0.5">({s.mortgagedCount}抵)</span>
                        )}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-[10px] t-text-m">无持仓</p>
              )}
            </div>
          )}
        </div>

        {/* 所有玩家持仓一览 */}
        <div className="bg-white/3 rounded-lg p-2.5">
          <h4 className="text-[9px] text-slate-500 mb-1.5 font-medium">👥 所有玩家持仓</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-1 t-text-3 font-medium">玩家</th>
                  <th className="text-right py-1 text-slate-500 font-medium">💰</th>
                  {Object.keys(CARGO_NAMES).map(cargo => (
                    <th key={cargo} className={`text-right py-1 font-medium ${CARGO_TEXT[cargo]}`}>
                      {CARGO_NAMES[cargo]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPlayers.map((p: any) => (
                  <tr key={p.id} className={`border-b border-white/3 ${p.id === currentPlayer?.id ? 'bg-gold-400/5' : ''}`}>
                    <td className="py-1 t-text-2">
                      {p.isAI ? '🤖' : '👤'} {p.name}
                    </td>
                    <td className="py-1 text-right text-gold-400">{p.cash}</td>
                    {Object.keys(CARGO_NAMES).map(cargo => {
                      const stock = p.stocks?.find((s: any) => (s.cargo || s.cargoType) === cargo);
                      const qty = stock?.quantity || 0;
                      const mort = stock?.mortgaged || stock?.mortgagedCount || 0;
                      return (
                        <td key={cargo} className="py-1 text-right t-text-2">
                          {qty > 0 ? qty : '-'}
                          {mort > 0 && <span className="text-red-400">({mort})</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MortgageStockModal
        isOpen={showMortgageModal}
        onClose={() => setShowMortgageModal(false)}
        onConfirm={(cargoType, quantity) => {
          const result = mortgageStock(gameState.harborMaster?.playerId || '', cargoType, quantity);
          if (result.success) {
            setShowMortgageModal(false);
            setMortgageSuccess(true);
          } else {
            alert(result.error || '抵押失败');
          }
        }}
      />
    </div>
  );
};
