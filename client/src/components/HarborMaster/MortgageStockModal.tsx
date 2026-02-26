import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Modal } from '../Shared/Modal';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

interface MortgageStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cargoType: CargoType, quantity: number) => void;
}

const CARGO_NAMES: Record<string, string> = {
  JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_DOTS: Record<string, string> = {
  JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};

export const MortgageStockModal: React.FC<MortgageStockModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const { gameState } = useGameStore();
  const [selectedCargo, setSelectedCargo] = useState<CargoType | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === gameState.harborMaster?.playerId);
  if (!currentPlayer) return null;

  const availableStocks = currentPlayer.stocks.filter(stock =>
    stock.quantity > 0 && !stock.isMortgaged
  );

  const selectedStock = selectedCargo ?
    currentPlayer.stocks.find(s => s.cargoType === selectedCargo) : null;
  const maxQuantity = selectedStock ? selectedStock.quantity : 0;
  const mortgageValue = quantity * 12;

  const handleConfirm = () => {
    if (selectedCargo && quantity > 0 && quantity <= maxQuantity) {
      onConfirm(selectedCargo, quantity);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="抵押股票获取现金" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-400">每抵押一股可获得12现金，结算时需支付15赎回。</p>

        {/* 选择货物 */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">选择货物</label>
          <div className="grid grid-cols-2 gap-2">
            {availableStocks.map(stock => (
              <div
                key={stock.cargoType}
                className={`border rounded-xl p-3 cursor-pointer transition-all ${selectedCargo === stock.cargoType
                    ? 'border-ocean-500/40 bg-ocean-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                onClick={() => {
                  setSelectedCargo(stock.cargoType);
                  setQuantity(1);
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${CARGO_DOTS[stock.cargoType]}`} />
                  <span className="text-xs font-medium text-slate-200">{CARGO_NAMES[stock.cargoType]}</span>
                  <span className="text-[10px] text-slate-500">({stock.quantity}股)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 选择数量 */}
        {selectedCargo && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">抵押数量</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="flex-1 accent-ocean-500"
              />
              <span className="text-sm font-medium text-slate-200 w-8 text-center">{quantity}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">最多 {maxQuantity} 股</div>
          </div>
        )}

        {/* 抵押信息 */}
        {selectedCargo && quantity > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/15 rounded-xl p-3">
            <div className="text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>抵押股票:</span>
                <span className="font-medium text-slate-200">{CARGO_NAMES[selectedCargo]} × {quantity}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>获得现金:</span>
                <span className="font-medium text-emerald-400">+{mortgageValue}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!selectedCargo || quantity <= 0 || quantity > maxQuantity}
            className="flex-1"
            size="sm"
          >
            确认抵押
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1" size="sm">
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};
