/**
 * PlaceShipsStep — Combined cargo selection + position setting
 *
 * Matches the engine's single PLACE_SHIPS action which requires:
 *   - cargos: 3 of 4 cargo types
 *   - positions: starting position for each selected cargo (total = 9)
 */

import React, { useState } from 'react';
import { useGameStore } from '../../stores';
import { Button } from '../Shared/Button';
import type { CargoType } from '../../types';

const ALL_CARGOS: CargoType[] = ['JADE', 'SILK', 'GINSENG', 'NUTMEG'];

const CARGO_NAMES: Record<CargoType, string> = {
    JADE: '翡翠',
    SILK: '丝绸',
    GINSENG: '人参',
    NUTMEG: '肉豆蔻',
};

const CARGO_COLORS: Record<CargoType, string> = {
    JADE: 'bg-cargo-jade',
    SILK: 'bg-cargo-silk',
    GINSENG: 'bg-cargo-ginseng',
    NUTMEG: 'bg-cargo-nutmeg',
};

export const PlaceShipsStep: React.FC = () => {
    const { setShipPositions, getEngineState } = useGameStore();

    // Which cargo to exclude (only 3 of 4 ship on the board)
    const [excludedCargo, setExcludedCargo] = useState<CargoType>('NUTMEG');
    const [positions, setPositions] = useState<Record<CargoType, number>>({
        JADE: 3,
        SILK: 3,
        GINSENG: 3,
        NUTMEG: 3,
    });

    const selectedCargos = ALL_CARGOS.filter(c => c !== excludedCargo);
    const total = selectedCargos.reduce((sum, c) => sum + (positions[c] ?? 0), 0);
    const isValid = total === 9 && selectedCargos.length === 3;

    const handleExclude = (cargo: CargoType) => {
        setExcludedCargo(cargo);
        // Reset positions evenly
        const newPos = { ...positions };
        ALL_CARGOS.forEach(c => { newPos[c] = 3; });
        setPositions(newPos);
    };

    const handlePositionChange = (cargo: CargoType, value: number) => {
        setPositions(prev => ({ ...prev, [cargo]: value }));
    };

    const handleSubmit = () => {
        const engineState = getEngineState();
        if (!engineState?.pendingAction) return;

        // Build positions for selected cargos only
        const posMap: Record<string, number> = {};
        selectedCargos.forEach(c => {
            posMap[c] = positions[c];
        });

        setShipPositions(posMap);
    };

    return (
        <div className="space-y-6">
            {/* Step 1: Choose which cargo to exclude */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">选择排除的货物</h3>
                <p className="text-sm text-gray-600 mb-3">
                    4 种货物中选择 1 种不上船
                </p>
                <div className="grid grid-cols-4 gap-3">
                    {ALL_CARGOS.map(cargo => (
                        <button
                            key={cargo}
                            className={`border-2 rounded-lg p-3 text-center transition-all ${excludedCargo === cargo
                                    ? 'border-red-400 bg-red-50 opacity-60'
                                    : 'border-green-300 bg-green-50 hover:border-green-400'
                                }`}
                            onClick={() => handleExclude(cargo)}
                        >
                            <div className={`w-6 h-6 rounded-full mx-auto mb-1 ${CARGO_COLORS[cargo]}`} />
                            <div className="text-sm font-medium">{CARGO_NAMES[cargo]}</div>
                            <div className="text-xs text-gray-500">
                                {excludedCargo === cargo ? '❌ 不上船' : '✓ 上船'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 2: Set starting positions for the 3 selected cargos */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">设置起始位置</h3>
                <p className="text-sm text-gray-600 mb-3">
                    三船起始位置总和必须为 9，剩余:
                    <span className={`font-bold ml-1 ${total === 9 ? 'text-green-600' : 'text-red-600'}`}>
                        {9 - total}
                    </span>
                </p>

                <div className="space-y-4">
                    {selectedCargos.map(cargo => (
                        <div key={cargo} className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 w-24">
                                <div className={`w-5 h-5 rounded-full ${CARGO_COLORS[cargo]}`} />
                                <span className="text-sm font-medium">{CARGO_NAMES[cargo]}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={9}
                                value={positions[cargo]}
                                onChange={e => handlePositionChange(cargo, parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="w-8 text-center font-bold text-gray-900">
                                {positions[cargo]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {isValid ? '✓ 设置正确 (总和 = 9)' : `✗ 总和 = ${total}，需要 9`}
                </div>
                <Button onClick={handleSubmit} disabled={!isValid}>
                    确认出航
                </Button>
            </div>
        </div>
    );
};
