import React from 'react';
import { PlayerToken } from '../Shared/PlayerToken';
import type { PlayerColor } from '../../types/uiTypes';

interface SlotTokenProps {
    slotId: string;
    label: string;
    cost: number;
    icon?: string;
    occupantColor?: PlayerColor;
    occupantLabel?: string;
    isSelectable: boolean;
    isAffordable: boolean;
    isInvestPhase: boolean;
    onClick?: (event: React.MouseEvent) => void;
    size?: 'sm' | 'md';
    shape?: 'circle' | 'square';
}

export const SlotToken: React.FC<SlotTokenProps> = ({
    slotId: _slotId,
    label,
    cost,
    icon,
    occupantColor,
    occupantLabel,
    isSelectable,
    isAffordable,
    isInvestPhase,
    onClick,
    size = 'md',
    shape = 'circle',
}) => {
    const isOccupied = !!occupantColor;
    const canClick = isSelectable && isAffordable && !isOccupied && isInvestPhase;

    const dim = size === 'sm' ? 48 : 60;
    const borderRadius = shape === 'circle' ? '50%' : '12px';

    if (isOccupied) {
        return (
            <div
                className="flex flex-col items-center gap-1"
                title={`${label} — ${occupantLabel || '已占用'}`}
            >
                <div
                    className="flex items-center justify-center transition-all duration-200"
                    style={{
                        width: dim,
                        height: dim,
                        borderRadius,
                    }}
                >
                    <PlayerToken
                        color={occupantColor!}
                        size={size === 'sm' ? 'md' : 'lg'}
                        label={occupantLabel?.charAt(0)}
                    />
                </div>
                <span className="text-[9px] t-text-3 text-center leading-tight max-w-[60px] truncate">
                    {label}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <button
                onClick={canClick ? onClick : undefined}
                disabled={!canClick}
                className={[
                    'flex flex-col items-center justify-center transition-all duration-300 relative',
                    canClick
                        ? 'cursor-pointer hover:scale-110 active:scale-95'
                        : 'cursor-default',
                ].join(' ')}
                style={{
                    width: dim,
                    height: dim,
                    borderRadius,
                    border: canClick
                        ? '2px dashed var(--color-slot-selectable, rgba(14,165,233,0.5))'
                        : isInvestPhase && !isAffordable
                            ? '2px dashed var(--color-slot-unaffordable, rgba(100,116,139,0.3))'
                            : '2px dashed var(--color-card-border)',
                    background: canClick
                        ? 'var(--color-slot-selectable-bg, rgba(14,165,233,0.08))'
                        : 'transparent',
                    opacity: isInvestPhase && !isAffordable ? 0.4 : 1,
                }}
                title={`${label} — ${cost}元`}
            >
                {/* Glow animation for selectable */}
                {canClick && (
                    <div
                        className="absolute inset-0 animate-pulse rounded-inherit"
                        style={{
                            borderRadius,
                            boxShadow: '0 0 12px rgba(14,165,233,0.3)',
                        }}
                    />
                )}

                {icon && (
                    <span className="text-xs leading-none">{icon}</span>
                )}
                <span
                    className={[
                        'text-[10px] font-bold leading-none mt-0.5',
                        isInvestPhase && !isAffordable ? 't-text-m' : 'text-gold-400',
                    ].join(' ')}
                >
                    {cost === 0 ? '免费' : `${cost}`}
                </span>
            </button>
            <span className="text-[9px] t-text-3 text-center leading-tight max-w-[60px] truncate">
                {label}
            </span>
        </div>
    );
};
