'use client';

import { CheckCircle } from 'lucide-react';

type Step = 'company_info' | 'documents' | 'bank_details' | 'verification';

interface Props {
  currentStep: Step;
  completedSteps: Step[];
}

const STEPS = [
  { key: 'company_info', label: 'Company Info', number: 1 },
  { key: 'documents', label: 'Documents', number: 2 },
  { key: 'bank_details', label: 'Bank Details', number: 3 },
  { key: 'verification', label: 'Verification', number: 4 }
];

export default function KYCProgress({ currentStep, completedSteps }: Props) {
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key as Step);
          const isCurrent = step.key === currentStep;
          const isActive = index <= currentStepIndex;

          return (
            <div key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                      ? 'bg-blue-500 text-white' 
                      : isActive 
                        ? 'bg-gray-300 text-gray-600'
                        : 'bg-gray-200 text-gray-400'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Label */}
                <span className={`
                  mt-2 text-sm font-medium
                  ${isCurrent ? 'text-blue-600' : isActive ? 'text-gray-700' : 'text-gray-400'}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Line */}
              {index < STEPS.length - 1 && (
                <div className={`
                  h-0.5 flex-1 mx-2 mb-6
                  ${isCompleted ? 'bg-green-500' : isActive ? 'bg-gray-300' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
