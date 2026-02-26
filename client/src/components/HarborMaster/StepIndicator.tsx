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
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${index <= currentIndex
              ? 'bg-ocean-500/20 text-ocean-400'
              : 'bg-white/5 text-slate-600'
            }`}>
            {index + 1}
          </div>
          <div className="ml-2">
            <div className={`text-xs font-medium ${index <= currentIndex ? 'text-slate-200' : 'text-slate-600'
              }`}>
              {step.label}
            </div>
            <div className="text-[10px] text-slate-500">{step.description}</div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-px mx-3 ${index < currentIndex ? 'bg-ocean-500/30' : 'bg-white/5'
              }`} />
          )}
        </div>
      ))}
    </div>
  );
};
