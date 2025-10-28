import React from 'react';
import { useGameStore } from '../../stores';
import { Modal } from '../Shared/Modal';
import { StepIndicator } from './StepIndicator';
import { StockPurchaseStep } from './StockPurchaseStep';
import { CargoSelectionStep } from './CargoSelectionStep';
import { PositionSettingStep } from './PositionSettingStep';

export const HarborMasterWizard: React.FC = () => {
  const { gameState } = useGameStore();
  const harborMaster = gameState?.harborMaster;
  
  if (!harborMaster) return null;
  
  return (
    <Modal isOpen={true} size="lg" title="港务长行动" onClose={() => {}}>
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <StepIndicator currentStep={harborMaster.currentStep} />
        
        {/* 步骤内容 */}
        {harborMaster.currentStep === 'BUY_STOCK' && <StockPurchaseStep />}
        {harborMaster.currentStep === 'SELECT_CARGO' && <CargoSelectionStep />}
        {harborMaster.currentStep === 'SET_POSITIONS' && <PositionSettingStep />}
      </div>
    </Modal>
  );
};
