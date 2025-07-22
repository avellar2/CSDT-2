export interface FormStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  fields: string[];
}

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}