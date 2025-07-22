import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle } from 'phosphor-react';

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canProceed: boolean;
  isLoading?: boolean;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  canProceed,
  isLoading = false
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="flex justify-between items-center">
      {/* Botão Anterior */}
      <motion.button
        type="button"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
          ${isFirstStep || isLoading
            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            : 'bg-slate-700 text-slate-200 hover:bg-slate-600 hover:scale-105'
          }
        `}
        whileHover={!isFirstStep && !isLoading ? { scale: 1.05 } : {}}
        whileTap={!isFirstStep && !isLoading ? { scale: 0.95 } : {}}
      >
        <ArrowLeft size={20} />
        Anterior
      </motion.button>

      {/* Botão Próximo/Finalizar */}
      {isLastStep ? (
        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={!canProceed || isLoading}
          className={`
            flex items-center gap-3 px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-300
            ${canProceed && !isLoading
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }
          `}
          whileHover={canProceed && !isLoading ? {
            scale: 1.05,
            boxShadow: "0 20px 40px rgba(34, 197, 94, 0.4)"
          } : {}}
          whileTap={canProceed && !isLoading ? { scale: 0.95 } : {}}
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle size={24} />
              Finalizar OS
            </>
          )}
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
            ${canProceed && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }
          `}
          whileHover={canProceed && !isLoading ? { scale: 1.05 } : {}}
          whileTap={canProceed && !isLoading ? { scale: 0.95 } : {}}
        >
          Próxima Etapa
          <ArrowRight size={20} />
        </motion.button>
      )}
    </div>
  );
};