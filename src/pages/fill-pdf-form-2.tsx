"use client";

import React from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Info,
  Clock,
  RefreshCw,
  FilePlus2,
  ListChecks,
  UploadCloud,
  XCircle,
} from "lucide-react";
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

          {/* Aviso NÃO bloqueante: finalização pendente nunca impede nova OS. */}
          {hook.showPendingPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-amber-50"
            >
              <div className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 flex-shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <p className="font-semibold">
                    {hook.pendingOptions.length === 1
                      ? "Você tem 1 finalização pendente"
                      : `Você tem ${hook.pendingOptions.length} finalizações pendentes`}
                  </p>
                  <p className="text-amber-100/90">
                    Isso não impede iniciar outra OS. Retome uma pendência ou
                    comece um novo atendimento.
                  </p>

                  <div className="space-y-2">
                    {hook.pendingOptions.slice(0, 3).map((option) => (
                      <div
                        key={option.numeroOs}
                        className="flex flex-col gap-2 rounded-xl border border-amber-400/20 bg-slate-900/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            OS {option.numeroOs}
                            {option.school ? ` — ${option.school}` : ""}
                          </p>
                          <p className="text-xs text-amber-200/80">
                            {option.label}
                            {option.date ? ` · ${option.date}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={hook.isResuming}
                          onClick={() => void hook.resumePendingFinalization(option.numeroOs)}
                          className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                        >
                          <RefreshCw
                            size={14}
                            className={`mr-1 inline ${hook.isResuming ? "animate-spin" : ""}`}
                          />
                          Retomar
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                    <button
                      type="button"
                      onClick={hook.startNewOs}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      <FilePlus2 size={14} /> Iniciar nova OS
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/os-externas-list?finalizacao=pendente")}
                      className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/10"
                    >
                      <ListChecks size={14} /> Ver todas as finalizações pendentes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Progresso da finalização em linguagem simples (mobile). */}
          {hook.finalizationProgress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-50"
            >
              <div className="flex items-center gap-3">
                <UploadCloud size={20} className="flex-shrink-0 text-blue-300" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {hook.finalizationProgress.label}
                  </p>
                  <p className="text-xs text-blue-200/80">
                    Não feche o aplicativo. Se falhar, nada do que já subiu será perdido.
                  </p>
                  {hook.finalizationProgress.total > 0 && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (hook.finalizationProgress.current /
                                hook.finalizationProgress.total) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Falhas individuais de upload, com motivo e ação de reenvio. */}
          {hook.uploadFailures.length > 0 && !hook.loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-red-50"
            >
              <div className="flex items-start gap-3">
                <XCircle size={20} className="mt-0.5 flex-shrink-0 text-red-300" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">
                    {hook.uploadFailures.length} foto(s) não foram enviadas
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-red-100/90">
                    {hook.uploadFailures.slice(0, 6).map((failure, index) => (
                      <li key={`${failure.fileName}-${index}`} className="break-words">
                        <span className="font-medium">{failure.fileName}</span>: {failure.reason}
                      </li>
                    ))}
                    {hook.uploadFailures.length > 6 && (
                      <li>…e mais {hook.uploadFailures.length - 6}.</li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-red-100/80">
                    Toque em &quot;Finalizar OS&quot; novamente: apenas as fotos
                    com falha serão reenviadas.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {(router.query.origin === "daily-demands" || hook.pendingResume) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 rounded-2xl border px-5 py-4 ${
                hook.pendingResume || hook.dailyDemandAvailability?.allowed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <Info size={20} className="mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm">
                  {hook.pendingResume ? (
                    <p>
                      A OS {hook.pendingResume.numeroOs} já foi salva. Esta tela está
                      retomando a finalização pendente; o número existente será
                      reaproveitado e a disponibilidade da demanda não bloqueia a
                      retomada.
                    </p>
                  ) : hook.isCheckingDailyDemandAvailability ? (
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
                  handleRemoveFile={hook.handleRemoveFile}
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