"use client";

import React from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { useFillPdfForm } from "@/hooks/useFillPdfForm";
import InputsItens from "@/components/InputsItens";
import { StepIndicator } from "@/components/StepIndicator";
import { NavigationButtons } from "@/components/NavigationButtons";
import FillPdfModals from "@/components/OsExternas/FillPdfModals";
import ProtectedRoute from "@/components/ProtectedRoute";

const FillPdfForm: React.FC = () => {
  const router = useRouter();
  const hook = useFillPdfForm();

  return (
    <motion.div
      className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <FillPdfModals
        showToast={hook.showToast}
        alertDialog={hook.alertDialog}
        setAlertDialog={hook.setAlertDialog}
        showChamadoModal={hook.showChamadoModal}
        setShowChamadoModal={hook.setShowChamadoModal}
        chamadoData={hook.chamadoData}
        setChamadoData={hook.setChamadoData}
        criarChamadoManual={hook.criarChamadoManual}
      />

      {/* CONTAINER PRINCIPAL */}
      <div className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* Header do formulário */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-8"
          >
            <motion.div
              className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <hook.currentStepData.icon size={28} className="text-white" />
            </motion.div>

            <motion.h1
              className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {hook.currentStepData.title}
            </motion.h1>

            <motion.p
              className="text-slate-300 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {hook.currentStepData.description}
            </motion.p>

            {/* Step Indicator */}
            <StepIndicator
              currentStep={hook.currentStep}
              onStepClick={hook.handleStepClick}
              completedSteps={hook.completedSteps}
            />

            {/* Step Progress Bar */}
            <motion.div
              className="mt-6 max-w-md mx-auto"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Progresso da Etapa</span>
                <span className="text-sm text-blue-400 font-semibold">{hook.stepProgress}%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${hook.stepProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          </motion.div>

          {router.query.origin === "daily-demands" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 rounded-2xl border px-5 py-4 ${
                hook.dailyDemandAvailability?.allowed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <Info size={20} className="mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm">
                  {hook.isCheckingDailyDemandAvailability ? (
                    <p>Validando se esta OS pode ser lançada para a demanda diária...</p>
                  ) : hook.dailyDemandAvailability?.allowed ? (
                    <p>
                      OS autorizada para esta demanda. Técnico em visita confirmado
                      {hook.dailyDemandAvailability.hasRelease ? " com liberação do ADMTOTAL." : "."}
                    </p>
                  ) : (
                    <p>{hook.dailyDemandAvailability?.reason || "Esta OS não está liberada para lançamento."}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Form Container */}
          <motion.div
            key={hook.currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="backdrop-blur-xl bg-slate-800/85 rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <InputsItens
                  escolaOptions={hook.escolaOptions}
                  formData={hook.formData}
                  handleInputChange={hook.handleInputChange}
                  handleSelectChange={hook.handleSelectChange}
                  handleFileChange={hook.handleFileChange}
                  tecnicoResponsavelLogado={hook.localTecnicoName || "Carregando..."}
                  isLoadingTecnico={hook.isLoadingTecnico}
                  currentStep={hook.currentStep}
                  currentStepFields={hook.currentStepData.fields}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Navigation Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-20 backdrop-blur-xl bg-slate-800/85 rounded-3xl p-6 border border-slate-700/50 shadow-2xl"
          >
            <NavigationButtons
              currentStep={hook.currentStep}
              totalSteps={hook.totalSteps}
              onPrevious={hook.handlePrevious}
              onNext={hook.handleNext}
              onSubmit={hook.handleSubmit}
              canProceed={hook.canProceed}
              isLoading={hook.loading}
            />

            {/* Dirty indicator */}
            {hook.isDirty && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-yellow-400 flex items-center justify-center gap-2 mt-4"
              >
                <AlertTriangle size={16} />
                <span>Formulário modificado</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};


export const getServerSideProps = async () => ({ props: {} });


export default function ProtectedFillPdfForm() {
  return <ProtectedRoute><FillPdfForm /></ProtectedRoute>;
}