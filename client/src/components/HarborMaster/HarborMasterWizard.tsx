import React from 'react';
import { useGameStore } from '../../stores';
import { Modal } from '../Shared/Modal';
import { StockPurchaseStep } from './StockPurchaseStep';
import { PlaceShipsStep } from './PlaceShipsStep';

export const HarborMasterWizard: React.FC = () => {
  const { gameState } = useGameStore();
  const harborMaster = gameState?.harborMaster;

  if (!harborMaster) return null;

  // The engine has two phases for harbor master:
  // 1. BUY_STOCK (or SKIP) — buy one stock
  // 2. PLACE_SHIPS — select 3 cargos and set positions (combined)
  const currentStep = harborMaster.currentStep;

  return (
    <Modal isOpen={true} size="lg" title="港务长行动" onClose={() => { }}>
      <div className="space-y-6">
        {/* 步骤指示器 — simplified to 2 steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${currentStep === 'BUY_STOCK'
            ? 'bg-blue-500 text-white'
            : 'bg-green-100 text-green-700'
            }`}>
            ① 购买股票
          </div>
          <div className="text-gray-400">→</div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${currentStep === 'SET_POSITIONS'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-500'
            }`}>
            ② 选择货物 & 设置位置
          </div>
        </div>

        {/* 步骤内容 */}
        {currentStep === 'BUY_STOCK' && <StockPurchaseStep />}
        {currentStep === 'SET_POSITIONS' && <PlaceShipsStep />}
      </div>
    </Modal>
  );
};
