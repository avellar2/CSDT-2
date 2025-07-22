import React from 'react';
import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  completedSteps
}) => {
  const steps = [
    { number: 1, label: 'Principal' },
    { number: 2, label: 'Laboratório' },
    { number: 3, label: 'Outros Locais' },
    { number: 4, label: 'Internet' },
    { number: 5, label: 'Impressoras' },
    { number: 6, label: 'Relatório' },
    { number: 7, label: 'Conclusão' }
  ];

  return (
    <div className="w-full mx-auto px-2">
      {/* Mobile Layout */}
      <div className="grid grid-cols-4 gap-3 sm:hidden">
        {steps.map((step, index) => {
          const isActive = currentStep === index;
          const isCompleted = completedSteps.includes(index);
          const canNavigate = Math.max(...completedSteps, currentStep) >= index;

          return (
            <motion.button
              key={step.number}
              onClick={() => canNavigate && onStepClick(index)}
              disabled={!canNavigate}
              className={`
                relative flex flex-col items-center justify-start p-2 rounded-lg transition-all duration-300
                ${canNavigate ? 'cursor-pointer hover:bg-slate-700/30' : 'cursor-not-allowed opacity-50'}
                ${isActive ? 'bg-blue-500/20 border border-blue-400/30' : ''}
              `}
              whileHover={canNavigate ? { scale: 1.05 } : {}}
              whileTap={canNavigate ? { scale: 0.95 } : {}}
            >
              {/* Número do Step - SEMPRE NO TOPO */}
              <motion.div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 flex-shrink-0
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-lg'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-600 text-slate-300'
                  }
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
              >
                {isCompleted ? '✓' : step.number}
              </motion.div>

              {/* Label do Step - SEMPRE ABAIXO DO NÚMERO */}
              <span
                className={`
                  text-xs text-center font-medium leading-tight min-h-[2.5rem] flex items-center
                  ${isActive ? 'text-blue-300' : 'text-slate-400'}
                `}
                style={{
                  wordBreak: 'break-word',
                  hyphens: 'auto'
                }}
              >
                {step.label}
              </span>

              {/* Indicador de progresso */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Desktop Layout - CENTRALIZADO E ALINHADO NO TOPO */}
      <div className="hidden sm:flex justify-center items-start max-w-3xl mx-auto">
        <div className="flex justify-between items-start w-full">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = completedSteps.includes(index);
            const canNavigate = Math.max(...completedSteps, currentStep) >= index;

            return (
              <React.Fragment key={step.number}>
                <motion.button
                  onClick={() => canNavigate && onStepClick(index)}
                  disabled={!canNavigate}
                  className={`
                    relative flex flex-col items-center justify-start p-3 rounded-lg transition-all duration-300 flex-1 max-w-[100px]
                    ${canNavigate ? 'cursor-pointer hover:bg-slate-700/30' : 'cursor-not-allowed opacity-50'}
                    ${isActive ? 'bg-blue-500/20 border border-blue-400/30' : ''}
                  `}
                  whileHover={canNavigate ? { scale: 1.05 } : {}}
                  whileTap={canNavigate ? { scale: 0.95 } : {}}
                >
                  {/* Número do Step - SEMPRE NO TOPO */}
                  <motion.div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3 flex-shrink-0
                      ${isActive
                        ? 'bg-blue-500 text-white shadow-lg'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-600 text-slate-300'
                      }
                    `}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
                  >
                    {isCompleted ? '✓' : step.number}
                  </motion.div>

                  {/* Label do Step - SEMPRE ABAIXO DO NÚMERO */}
                  <span
                    className={`
                      text-xs text-center font-medium leading-tight min-h-[2rem] flex items-start justify-center
                      ${isActive ? 'text-blue-300' : 'text-slate-400'}
                    `}
                    style={{
                      wordBreak: 'break-word',
                      hyphens: 'auto'
                    }}
                  >
                    {step.label}
                  </span>

                  {/* Indicador de progresso */}
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    />
                  )}
                </motion.button>

                {/* Linha conectora - AJUSTADA PARA ALINHAR COM OS NÚMEROS */}
                {index < steps.length - 1 && (
                  <div className="flex items-start pt-5">
                    <div className="w-8 h-px bg-slate-600">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-transparent"
                        initial={{ width: 0 }}
                        animate={{
                          width: isCompleted ? '100%' : isActive ? '50%' : '0%'
                        }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};