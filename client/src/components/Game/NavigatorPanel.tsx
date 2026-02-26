/**
 * NavigatorPanel — Structured navigator decision UI
 *
 * Shows each ship as a row with -2/-1/+1/+2 toggle buttons.
 * User selects deltas (multi-select for big navigator), then confirms.
 * On confirm, matches selection against engine validActions.
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../stores';

const CARGO_CN: Record<string, string> = {
    JADE: '翡翠', SILK: '丝绸', GINSENG: '人参', NUTMEG: '肉豆蔻',
};
const CARGO_COLORS: Record<string, string> = {
    JADE: 'text-emerald-400', SILK: 'text-indigo-400', GINSENG: 'text-amber-400', NUTMEG: 'text-violet-400',
};
const CARGO_BG: Record<string, string> = {
    JADE: 'bg-emerald-500/10 border-emerald-500/20',
    SILK: 'bg-indigo-500/10 border-indigo-500/20',
    GINSENG: 'bg-amber-500/10 border-amber-500/20',
    NUTMEG: 'bg-violet-500/10 border-violet-500/20',
};

interface NavigatorPanelProps {
    pendingAction: any;
}

const DOCK_POS = 14;

export const NavigatorPanel: React.FC<NavigatorPanelProps> = ({ pendingAction }) => {
    const { getEngineState, dispatchAction } = useGameStore();
    const engineState = getEngineState();
    const ships = engineState?.ships || [];

    // Selection state: cargo -> delta (null = not selected)
    const [selections, setSelections] = useState<Record<string, number | null>>({});
    const [error, setError] = useState<string>('');

    // Determine navigator type from the message or valid actions
    const isBig = useMemo(() => {
        return pendingAction?.message?.includes('大') || false;
    }, [pendingAction]);

    const maxDelta = isBig ? 2 : 1;

    // Build available deltas for each ship
    const shipRows = useMemo(() => {
        return ships.map((ship: any) => {
            const pos = ship.position;
            const atDock = pos >= DOCK_POS;
            const deltas: number[] = [];

            if (!atDock) {
                for (let d = -maxDelta; d <= maxDelta; d++) {
                    if (d === 0) continue;
                    const newPos = pos + d;
                    if (newPos >= 0 && newPos <= DOCK_POS) {
                        deltas.push(d);
                    }
                }
            }

            return {
                cargo: ship.cargo,
                position: pos,
                atDock,
                deltas,
            };
        });
    }, [ships, maxDelta]);

    const toggleDelta = (cargo: string, delta: number) => {
        setError('');
        setSelections(prev => {
            const current = prev[cargo];
            if (current === delta) {
                // Deselect
                const next = { ...prev };
                delete next[cargo];
                return next;
            }

            // Count how many ships are currently selected (excluding this cargo)
            const otherSelected = Object.entries(prev).filter(([k]) => k !== cargo).length;

            if (isBig) {
                // Big navigator: can select 1 ship with any delta, or 2 ships with ±1 each
                if (otherSelected === 0) {
                    // First ship selected — allow any delta
                    return { ...prev, [cargo]: delta };
                } else if (otherSelected === 1) {
                    // Second ship — both must be ±1
                    const otherKey = Object.keys(prev).find(k => k !== cargo)!;
                    const otherVal = prev[otherKey]!;

                    if (Math.abs(delta) > 1 || Math.abs(otherVal) > 1) {
                        // Can't do dual-ship with |delta| > 1, replace all with just this one
                        return { [cargo]: delta };
                    }
                    return { ...prev, [cargo]: delta };
                } else {
                    // 3rd ship? Replace all
                    return { [cargo]: delta };
                }
            } else {
                // Small navigator: only 1 ship, ±1
                return { [cargo]: delta };
            }
        });
    };

    const handleConfirm = () => {
        const selectedEntries = Object.entries(selections).filter(([, v]) => v !== null && v !== undefined) as [string, number][];

        if (selectedEntries.length === 0) {
            setError('请至少选择一艘船的移动');
            return;
        }

        // Build moves array
        const moves = selectedEntries.map(([cargo, delta]) => ({ cargo, delta }));

        // Find matching action in validActions
        const match = pendingAction.validActions.find((action: any) => {
            if (action.type !== 'USE_NAVIGATOR') return false;
            const actionMoves = action.data.moves as Array<{ cargo: string; delta: number }> | undefined;

            if (actionMoves && actionMoves.length > 0) {
                if (actionMoves.length !== moves.length) return false;
                // Check all moves match (order-independent)
                return moves.every(m =>
                    actionMoves.some(am => am.cargo === m.cargo && am.delta === m.delta)
                );
            } else {
                // Legacy format: single cargo+delta
                if (moves.length !== 1) return false;
                return action.data.cargo === moves[0].cargo && action.data.delta === moves[0].delta;
            }
        });

        if (match) {
            dispatchAction(match);
        } else {
            setError('非合法组合，请重新选择');
            setSelections({});
        }
    };

    const handleSkip = () => {
        const skipAction = pendingAction.validActions.find((a: any) => a.type === 'SKIP_NAVIGATOR');
        if (skipAction) {
            dispatchAction(skipAction);
        }
    };

    const selectedCount = Object.keys(selections).length;

    return (
        <div className="space-y-3 animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-xs t-text font-semibold">
                    🧭 {isBig ? '大' : '小'}领航员决策
                </p>
                <span className="text-[10px] t-text-3">
                    最大移动 ±{maxDelta} {isBig && '（可分配给两艘船各±1）'}
                </span>
            </div>

            {/* Ship rows */}
            <div className="space-y-2">
                {shipRows.map(row => {
                    const selected = selections[row.cargo];
                    const colorClass = CARGO_COLORS[row.cargo] || 'text-slate-400';
                    const bgClass = CARGO_BG[row.cargo] || '';

                    return (
                        <div
                            key={row.cargo}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${row.atDock ? 'opacity-40 cursor-not-allowed' : ''
                                } ${selected != null ? bgClass : ''}`}
                            style={selected == null ? { background: 'var(--color-input-bg)', borderColor: 'var(--color-card-border)' } : undefined}
                        >
                            {/* Ship info */}
                            <div className="w-20 flex-shrink-0">
                                <span className={`text-xs font-semibold ${colorClass}`}>
                                    {CARGO_CN[row.cargo] || row.cargo}
                                </span>
                                <span className="text-[10px] t-text-3 ml-1.5">
                                    {row.atDock ? '已到港' : `位置 ${row.position}`}
                                </span>
                            </div>

                            {/* Delta buttons */}
                            <div className="flex items-center gap-1 flex-1 justify-center">
                                {row.atDock ? (
                                    <span className="text-[10px] t-text-m">—</span>
                                ) : (
                                    <>
                                        {[-2, -1, 1, 2].map(d => {
                                            const available = row.deltas.includes(d);
                                            // For small navigator, hide ±2
                                            if (!isBig && Math.abs(d) > 1) return null;
                                            // When 2 ships selected with big nav, only ±1 is valid
                                            const otherSelectedCount = Object.entries(selections).filter(([k]) => k !== row.cargo).length;
                                            const lockedToOne = isBig && otherSelectedCount >= 1 && Math.abs(d) > 1;

                                            const isSelected = selected === d;
                                            const disabled = !available || row.atDock || lockedToOne;

                                            return (
                                                <button
                                                    key={d}
                                                    onClick={() => !disabled && toggleDelta(row.cargo, d)}
                                                    disabled={disabled}
                                                    className={`
                            w-9 h-8 rounded-md text-xs font-bold transition-all duration-200
                            ${isSelected
                                                            ? 'bg-ocean-500 text-white shadow-md scale-105'
                                                            : disabled
                                                                ? 'opacity-20 cursor-not-allowed'
                                                                : 'hover:bg-ocean-500/20 cursor-pointer'
                                                        }
                          `}
                                                    style={!isSelected && !disabled ? { background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' } : undefined}
                                                >
                                                    {d > 0 ? `+${d}` : d}
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
                            </div>

                            {/* Preview position */}
                            {selected != null && !row.atDock && (
                                <span className="text-[10px] font-medium text-ocean-400 w-16 text-right flex-shrink-0">
                                    {row.position} → {row.position + selected}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-400 text-center animate-fade-in">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
                <button
                    onClick={handleSkip}
                    className="text-xs t-text-3 hover:t-text-2 transition-colors px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--color-input-bg)' }}
                >
                    ⏭️ 跳过
                </button>

                <button
                    onClick={handleConfirm}
                    disabled={selectedCount === 0}
                    className={`
            px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200
            ${selectedCount > 0
                            ? 'bg-ocean-500 text-white hover:bg-ocean-600 shadow-md cursor-pointer'
                            : 'opacity-30 cursor-not-allowed'
                        }
          `}
                    style={selectedCount === 0 ? { background: 'var(--color-input-bg)' } : undefined}
                >
                    ✅ 确认选择 {selectedCount > 0 && `(${selectedCount}艘)`}
                </button>
            </div>
        </div>
    );
};
