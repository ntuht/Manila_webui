/**
 * PlaceShipsStep — Combined cargo selection + position setting
 * With info panel showing stock prices and player holdings
 */

import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

const ALL_CARGOS: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];

const CARGO_NAMES: Record<CargoType, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_DOTS: Record<CargoType, string> = {
    JADE: 'bg-emerald-500', SILK: 'bg-indigo-500', GINSENG: 'bg-amber-500', NUTMEG: 'bg-violet-500',
};
const CARGO_TEXT: Record<string, string> = {
    JADE: 'text-emerald-400', SILK: 'text-indigo-400', GINSENG: 'text-amber-400', NUTMEG: 'text-violet-400',
};

export const PlaceShipsStep: React.FC = () => {
    const { setShipPositions, getEngineState, gameState } = useGameStore();
    const engineState = getEngineState();

    const [excludedCargo, setExcludedCargo] = useState<CargoType>('NUTMEG');
    const [positions, setPositions] = useState<Record<CargoType, number>>({
        JADE: 3, SILK: 3, GINSENG: 3, NUTMEG: 3,
    });

    const selectedCargos = ALL_CARGOS.filter(c => c !== excludedCargo);
    const total = selectedCargos.reduce((sum, c) => sum + (positions[c] ?? 0), 0);
    const isValid = total === 9 && selectedCargos.length === 3;

    const handleExclude = (cargo: CargoType) => {
        setExcludedCargo(cargo);
        const newPos = { ...positions };
        ALL_CARGOS.forEach(c => { newPos[c] = 3; });
        setPositions(newPos);
    };

    const handlePositionChange = (cargo: CargoType, value: number) => {
        setPositions(prev => ({ ...prev, [cargo]: value }));
    };

    const handleSubmit = () => {
        const es = getEngineState();
        if (!es?.pendingAction) return;
        const posMap: Record<string, number> = {};
        selectedCargos.forEach(c => { posMap[c] = positions[c]; });
        setShipPositions(posMap);
    };

    const allPlayers = engineState?.players || [];

    return (
        <div className="space-y-4">
            {/* 选择排除货物 */}
            <div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">选择排除的货物</h3>
                <p className="text-[10px] text-slate-500 mb-2">4 种货物中选择 1 种不上船</p>
                <div className="grid grid-cols-4 gap-2">
                    {ALL_CARGOS.map(cargo => (
                        <button
                            key={cargo}
                            className={`border rounded-xl p-2 text-center transition-all ${excludedCargo === cargo
                                ? 'border-red-500/30 bg-red-500/10 opacity-60'
                                : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30'
                                }`}
                            onClick={() => handleExclude(cargo)}
                        >
                            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${CARGO_DOTS[cargo]}`} />
                            <div className="text-xs font-medium text-slate-200">{CARGO_NAMES[cargo]}</div>
                            <div className="text-[9px] text-slate-500">
                                {excludedCargo === cargo ? '❌ 不上船' : '✓ 上船'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 设置起始位置 */}
            <div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">设置起始位置</h3>
                <p className="text-[10px] text-slate-500 mb-2">
                    三船起始位置总和必须为 9，剩余:
                    <span className={`font-bold ml-1 ${total === 9 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {9 - total}
                    </span>
                </p>

                <div className="space-y-2">
                    {selectedCargos.map(cargo => (
                        <div key={cargo} className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 w-16">
                                <div className={`w-2.5 h-2.5 rounded-full ${CARGO_DOTS[cargo]}`} />
                                <span className="text-xs font-medium text-slate-200">{CARGO_NAMES[cargo]}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={9}
                                value={positions[cargo]}
                                onChange={e => handlePositionChange(cargo, parseInt(e.target.value))}
                                className="flex-1 accent-ocean-500"
                            />
                            <span className="w-6 text-center font-bold text-sm text-slate-200">{positions[cargo]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 提交 */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className={`text-xs font-medium ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isValid ? '✓ 总和 = 9' : `✗ 总和 = ${total}，需要 9`}
                </div>
                <Button onClick={handleSubmit} disabled={!isValid} size="sm">确认出航</Button>
            </div>

            {/* ===== 信息面板 ===== */}
            <div className="border-t border-white/10 pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {/* 股价 */}
                    {gameState && (
                        <div className="bg-white/3 rounded-lg p-2.5">
                            <h4 className="text-[9px] text-slate-500 mb-1.5 font-medium">📊 当前股价</h4>
                            {Object.entries(gameState.stockPrices).map(([cargo, price]) => (
                                <div key={cargo} className="flex justify-between items-center py-0.5">
                                    <span className={`text-[10px] ${CARGO_TEXT[cargo] || 'text-slate-400'}`}>
                                        {CARGO_NAMES[cargo as CargoType] || cargo}
                                    </span>
                                    <span className="text-[10px] font-medium text-gold-400">
                                        {price}元 {Number(price) >= 30 ? '⭐' : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 投资提示 */}
                    <div className="bg-white/3 rounded-lg p-2.5">
                        <h4 className="text-[9px] text-slate-500 mb-1.5 font-medium">💡 选船提示</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            股价高的货物到港价值更大。起始位置越高越容易到港，但其他玩家也会押注这些船。
                        </p>
                    </div>
                </div>

                {/* 所有玩家持仓 */}
                <div className="bg-white/3 rounded-lg p-2.5">
                    <h4 className="text-[9px] text-slate-500 mb-1.5 font-medium">👥 所有玩家持仓</h4>
                    <table className="w-full text-[10px]">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-1 text-slate-500 font-medium">玩家</th>
                                <th className="text-right py-1 text-slate-500 font-medium">💰</th>
                                {Object.keys(CARGO_NAMES).map(cargo => (
                                    <th key={cargo} className={`text-right py-1 font-medium ${CARGO_TEXT[cargo]}`}>
                                        {CARGO_NAMES[cargo as CargoType]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allPlayers.map((p: any) => (
                                <tr key={p.id} className="border-b border-white/3">
                                    <td className="py-1 text-slate-300">
                                        {p.isAI ? '🤖' : '👤'} {p.name}
                                    </td>
                                    <td className="py-1 text-right text-gold-400">{p.cash}</td>
                                    {Object.keys(CARGO_NAMES).map(cargo => {
                                        const stock = p.stocks?.find((s: any) => (s.cargoType || s.cargo) === cargo);
                                        const qty = stock?.quantity || 0;
                                        return (
                                            <td key={cargo} className="py-1 text-right text-slate-400">
                                                {qty > 0 ? qty : '-'}
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
    );
};
