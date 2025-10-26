import React from 'react';

interface InvestmentSlotProps {
  slot: {
    id: string;
    type: string;
    name: string;
    cost: number;
    reward: number;
    requirements?: string;
    seats?: number;
    cargoType?: string;
    isOccupied: boolean;
  };
  isSelectable: boolean;
  onSelect: () => void;
}

export const InvestmentSlot: React.FC<InvestmentSlotProps> = ({
  slot,
  isSelectable,
  onSelect
}) => {
  const getSlotColor = (type: string): string => {
    const colors: Record<string, string> = {
      'CREW': 'border-blue-300 bg-blue-50',
      'HARBOR_OFFICE': 'border-green-300 bg-green-50',
      'SHIPYARD_OFFICE': 'border-orange-300 bg-orange-50',
      'PIRATE': 'border-red-300 bg-red-50',
      'NAVIGATOR': 'border-purple-300 bg-purple-50',
      'INSURANCE': 'border-yellow-300 bg-yellow-50'
    };
    return colors[type] || 'border-gray-300 bg-gray-50';
  };

  const getSlotIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'CREW': '👥',
      'HARBOR_OFFICE': '🏢',
      'SHIPYARD_OFFICE': '🔧',
      'PIRATE': '🏴‍☠️',
      'NAVIGATOR': '🧭',
      'INSURANCE': '🛡️'
    };
    return icons[type] || '📋';
  };

  return (
    <div
      className={`card cursor-pointer transition-all ${
        isSelectable && !slot.isOccupied
          ? 'hover:shadow-md hover:scale-105'
          : slot.isOccupied
          ? 'opacity-60 cursor-not-allowed'
          : 'opacity-50 cursor-not-allowed'
      } ${getSlotColor(slot.type)}`}
      onClick={isSelectable && !slot.isOccupied ? onSelect : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getSlotIcon(slot.type)}</span>
          <h4 className="font-medium text-gray-900">{slot.name}</h4>
        </div>
        {slot.isOccupied && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            已占用
          </span>
        )}
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">成本:</span>
          <span className="font-medium text-red-600">{slot.cost}</span>
        </div>
        
        {slot.reward > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">奖励:</span>
            <span className="font-medium text-green-600">{slot.reward}</span>
          </div>
        )}
        
        {slot.seats && (
          <div className="flex justify-between">
            <span className="text-gray-600">座位:</span>
            <span className="font-medium text-blue-600">{slot.seats}</span>
          </div>
        )}
        
        {slot.requirements && (
          <div className="mt-2">
            <span className="text-xs text-gray-500">{slot.requirements}</span>
          </div>
        )}
      </div>
      
      {isSelectable && !slot.isOccupied && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            className="w-full text-sm bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            选择投资
          </button>
        </div>
      )}
    </div>
  );
};
