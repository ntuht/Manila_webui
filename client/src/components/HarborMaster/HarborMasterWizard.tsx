import React from 'react';
import { useGameStore } from '../../stores';
import { Modal } from '../Shared/Modal';
import { StockPurchaseStep } from './StockPurchaseStep';
import { PlaceShipsStep } from './PlaceShipsStep';

export const HarborMasterWizard: React.FC = () => {
  const { gameState } = useGameStore();
  const harborMaster = gameState?.harborMaster;

  if (!harborMaster) return null;

  const currentStep = harborMaster.currentStep;

  return (
    <Modal isOpen={true} size="lg" title="港务长行动" onClose={() => { }}>
      <div className="space-y-5">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-3">
          <div className={`px-4 py-1.5 rounded-full text-xs font-medium ${currentStep === 'BUY_STOCK'
            ? 'bg-ocean-500/20 text-ocean-400 ring-1 ring-ocean-500/30'
            : 'bg-emerald-500/15 text-emerald-400'
            }`}>
            ① 购买股票
          </div>
          <span className="t-text-m">→</span>
          <div className={`px-4 py-1.5 rounded-full text-xs font-medium ${currentStep === 'SET_POSITIONS'
            ? 'bg-ocean-500/20 text-ocean-400 ring-1 ring-ocean-500/30'
            : 't-text-3'
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
