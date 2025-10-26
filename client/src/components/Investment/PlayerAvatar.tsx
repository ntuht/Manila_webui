import React from 'react';
import type { PlayerState } from '../../types';

interface PlayerAvatarProps {
  player: PlayerState;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  isActive = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium ${
        isActive
          ? 'bg-blue-600 text-white ring-2 ring-blue-300'
          : 'bg-gray-200 text-gray-600'
      }`}
      title={player.name}
    >
      {getInitials(player.name)}
    </div>
  );
};
