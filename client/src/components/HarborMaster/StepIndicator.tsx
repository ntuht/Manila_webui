import React from 'react';
import type { HarborMasterPhase } from '../../types';

interface StepIndicatorProps {
  currentStep: HarborMasterPhase;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { key: 'BUY_STOCK', label: '购买股票', description: '选择是否购买股票' },
    { key: 'SELECT_CARGO', label: '选择货物', description: '选择3种货物上船' },
    { key: 'SET_POSITIONS', label: '设置位置', description: '设置船只起始位置' }
  ] as const;

  const currentIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            index <= currentIndex
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {index + 1}
          </div>
          <div className="ml-3">
            <div className={`text-sm font-medium ${
              index <= currentIndex ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {step.label}
            </div>
            <div className="text-xs text-gray-500">
              {step.description}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${
              index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
};
