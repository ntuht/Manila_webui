import React from 'react';
import type { ShipState, CargoType } from '../../types';

interface ShipTrackProps {
  ship: ShipState;
}

export const ShipTrack: React.FC<ShipTrackProps> = ({ ship }) => {
  const positions = Array.from({ length: 14 }, (_, i) => i);
  
  const getCargoColor = (cargoType: CargoType): string => {
    const colors = {
      'JADE': 'bg-cargo-jade',
      'SILK': 'bg-cargo-silk', 
      'GINSENG': 'bg-cargo-ginseng',
      'NUTMEG': 'bg-cargo-nutmeg'
    };
    return colors[cargoType] || 'bg-gray-500';
  };

  const getCargoName = (cargoType: CargoType): string => {
    const names = {
      'JADE': '翡翠',
      'SILK': '丝绸',
      'GINSENG': '人参', 
      'NUTMEG': '肉豆蔻'
    };
    return names[cargoType] || cargoType;
  };

  return (
    <div className="ship-track">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${getCargoColor(ship.cargoType)}`}></div>
          <h4 className="font-semibold text-gray-900">{getCargoName(ship.cargoType)}</h4>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>位置: {ship.position}</span>
          {ship.isDocked && <span className="text-green-600 font-medium">已到港</span>}
          {ship.isInShipyard && <span className="text-orange-600 font-medium">修船厂</span>}
          {ship.isHijacked && <span className="text-red-600 font-medium">被劫持</span>}
        </div>
      </div>
      
      {/* 轨道 */}
      <div className="relative">
        <div className="flex justify-between items-center">
          {positions.map(pos => (
            <div
              key={pos}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all ${
                pos === ship.position
                  ? 'bg-yellow-400 border-yellow-600 text-yellow-900 scale-110'
                  : pos < ship.position
                  ? 'bg-blue-200 border-blue-400 text-blue-800'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}
            >
              {pos}
            </div>
          ))}
        </div>
        
        {/* 特殊位置标记 */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>起点</span>
          <span className="text-red-600 font-medium">海盗位置</span>
          <span className="text-green-600 font-medium">港口</span>
        </div>
        
        {/* 船员信息 */}
        {ship.crew.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">船员</h5>
            <div className="flex flex-wrap gap-2">
              {ship.crew.map((member, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  {member.playerName} (座位 {member.seatNumber})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
