import React from 'react';
import type { PlayerColor } from '../../types/uiTypes';
import { PLAYER_COLOR_CONFIG } from '../../types/uiTypes';

interface PlayerTokenProps {
    color: PlayerColor;
    size?: 'sm' | 'md' | 'lg';
    label?: string;         // e.g. first letter of player name
    className?: string;
    glow?: boolean;         // pulsing glow effect
}

const SIZE_MAP = {
    sm: { dim: 16, font: 8, border: 2 },
    md: { dim: 24, font: 11, border: 2 },
    lg: { dim: 32, font: 14, border: 3 },
};

export const PlayerToken: React.FC<PlayerTokenProps> = ({
    color,
    size = 'md',
    label,
    className = '',
    glow = false,
}) => {
    const cfg = PLAYER_COLOR_CONFIG[color];
    const s = SIZE_MAP[size];

    return (
        <div
            className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
            style={{
                width: s.dim,
                height: s.dim,
                backgroundColor: cfg.fill,
                border: `${s.border}px solid ${cfg.border}`,
                boxShadow: glow ? `0 0 8px ${cfg.fill}80, 0 0 16px ${cfg.fill}40` : undefined,
                fontSize: s.font,
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                lineHeight: 1,
            }}
            title={cfg.label}
        >
            {label || ''}
        </div>
    );
};
