import { useState, useCallback } from 'react';
import { formSteps } from '../utils/formSteps';

export const useMultiStepForm = (initialStep = 0) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < formSteps.length) {
      setCurrentStep(step);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < formSteps.length - 1) {
      // Marcar o passo atual como completo
      setCompletedSteps(prev => {
        if (!prev.includes(currentStep)) {
          return [...prev, currentStep];
        }
        return prev;
      });
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const markStepAsCompleted = useCallback((step: number) => {
    setCompletedSteps(prev => {
      if (!prev.includes(step)) {
        return [...prev, step];
      }
      return prev;
    });
  }, []);

  const isStepCompleted = useCallback((step: number) => {
    return completedSteps.includes(step);
  }, [completedSteps]);

  const canProceedToStep = useCallback((step: number, formData: any) => {
    const currentStepData = formSteps[currentStep];
    const requiredFields = currentStepData.fields;

    // Verificar se todos os campos obrigatórios estão preenchidos
    return requiredFields.every(field => {
      const value = formData[field];
      if (Array.isArray(value)) {
        return true; // Arrays podem estar vazios (fotos são opcionais)
      }
      if (field === 'temLaboratorio') {
        return value !== undefined && value !== null && typeof value === 'boolean';
      }
      
      // Se a escola não tem laboratório, não exigir campos de equipamentos do laboratório
      const labFields = ['pcsProprio', 'pcsLocado', 'notebooksProprio', 'notebooksLocado', 
                        'monitoresProprio', 'monitoresLocado', 'estabilizadoresProprio', 
                        'estabilizadoresLocado', 'tabletsProprio', 'tabletsLocado'];
      if (labFields.includes(field) && formData.temLaboratorio === false) {
        return true; // Não exigir campos do laboratório se a escola não tem laboratório
      }
      
      return value !== undefined && value !== null && value.toString().trim() !== '';
    });
  }, [currentStep]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps([]);
  }, []);

  return {
    currentStep,
    totalSteps: formSteps.length,
    completedSteps,
    goToStep,
    nextStep,
    previousStep,
    markStepAsCompleted,
    isStepCompleted,
    canProceedToStep,
    reset,
    currentStepData: formSteps[currentStep]
  };
};