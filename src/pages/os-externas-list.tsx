import React from "react";
import { Header } from "@/components/Header";
import { Clock, CheckCircle, Eye, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { formatDateShort, formatDateTime } from "@/utils/date";
import { useOsExternasList, type OsExterna, type PendingDailyDemand } from "@/hooks/useOsExternasList";
import OsExternasDetailModal from "@/components/OsExternas/OsExternasDetailModal";
import OsExternasModals from "@/components/OsExternas/OsExternasModals";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuthHeaders } from "@/utils/client-auth";

const OsExternasList: React.FC = () => {
  const router = useRouter();
  const hook = useOsExternasList();

  const renderPendingDailyDemandCard = (demand: PendingDailyDemand) => (
    <div key={`daily-demand-${demand.demandId}`} className="border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-red-50/40">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center mb-3 gap-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${demand.visitStatus === "NOT_VISITED" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
              {demand.visitStatus === "NOT_VISITED" ? "Nao visitada" : "Sem OS criada"}
            </span>
            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-medium">
              Demanda: {new Date(`${demand.demandDate}T12:00:00-03:00`).toLocaleDateString("pt-BR")}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(demand.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
            {demand.schoolDistrict} Distrito - {demand.schoolName}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{demand.schoolAddress}</p>
          {demand.responsibleTechnicians.length > 0 && (
            <p className="text-sm text-gray-700 mb-2">
              <User size={16} className="inline mr-1" />
              Responsavel{demand.responsibleTechnicians.length > 1 ? "is" : ""}: {demand.responsibleTechnicians.join(", ")}
            </p>
          )}
          {demand.visitStatus === "NOT_VISITED" && demand.visitReason && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="font-medium">Motivo</div>
              <div className="whitespace-pre-line">{demand.visitReason}</div>
              {demand.visitUpdatedBy && (
                <div className="mt-1 text-xs text-amber-700">Marcado por: {demand.visitUpdatedBy}</div>
              )}
            </div>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-line">{demand.description}</p>
        </div>
        <Button
          onClick={() => router.push(`/daily-demands?date=${encodeURIComponent(demand.demandDate)}`)}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          Ver demanda
        </Button>
      </div>
    </div>
  );

  if (hook.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando OS Externas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-800">
              {hook.pendingOnly ? "OS Pendentes" : "OS Externas - Controle Geral"}
            </h1>
            <button
              onClick={() => {
                hook.setDownloadingPdf(true);
                fetch("/api/generate-sem-os-pdf", { headers: getAuthHeaders() })
                  .then((res) => {
                    if (!res.ok) throw new Error("Erro ao gerar PDF");
                    return res.blob();
                  })
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "demandas-sem-os.pdf";
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch(() => alert("Erro ao gerar PDF. Tente novamente."))
                  .finally(() => hook.setDownloadingPdf(false));
              }}
              disabled={hook.downloadPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {hook.downloadPdf ? <><span className="animate-spin">⏳</span> Gerando...</> : <>📄 Baixar PDF</>}
            </button>
          </div>
          <p className="text-gray-600">
            Total: {hook.osExternas.length + hook.pendingDailyDemands.length} | Pendentes: {hook.osExternas.filter((os) => os.status === "Pendente").length + hook.pendingDailyDemands.length} | Assinadas: {hook.osExternas.filter((os) => os.status === "Assinado").length}
          </p>
        </div>

        {hook.userRole && ["ADMIN", "ADMTOTAL"].includes(hook.userRole) && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Escolas Nao Visitadas</h2>
                <p className="text-sm text-gray-600">Consulte por dia as demandas marcadas como nao visitadas.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={hook.notVisitedDate}
                  min="2026-05-05"
                  onChange={(e) => hook.setNotVisitedDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  onClick={() => hook.setShowNotVisitedModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Ver nao visitadas
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Pesquisa */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={hook.searchTerm}
              onChange={(e) => hook.setSearchTerm(e.target.value)}
              placeholder="Pesquisar por numero da OS, escola, tecnico, email ou responsavel..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {hook.searchTerm && (
              <button onClick={() => hook.setSearchTerm("")} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {hook.searchTerm && (
            <div className="mt-2 text-sm text-gray-600 text-center">
              Mostrando resultados para: "<span className="font-medium text-gray-800">{hook.searchTerm}</span>"
              | Pendentes: {hook.osExternasPendentes.length + hook.filteredPendingDailyDemands.length} | Assinadas: {hook.osExternasAssinadas.length}
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 ${hook.pendingOnly ? "" : "lg:grid-cols-2"} gap-8`}>
          {/* Coluna Esquerda - OS Pendentes */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Clock size={24} className="text-orange-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">
                OS Pendentes ({hook.osExternasPendentes.length + hook.filteredPendingDailyDemands.length})
              </h2>
            </div>

            {hook.osExternasPendentes.length === 0 && hook.filteredPendingDailyDemands.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                <p>{hook.searchTerm ? "Nenhuma OS pendente encontrada" : "Nenhuma OS pendente"}</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {hook.pendingDailyDemandsToday.length > 0 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-red-200 bg-red-100 px-3 py-2">
                      <div className="text-sm font-semibold text-red-900">
                        Pendencias de hoje ({hook.pendingDailyDemandsToday.length})
                      </div>
                    </div>
                    {hook.pendingDailyDemandsToday.map(renderPendingDailyDemandCard)}
                  </div>
                )}

                {hook.pendingDailyDemandsPrevious.length > 0 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-200 bg-amber-100 px-3 py-2">
                      <div className="text-sm font-semibold text-amber-900">
                        Pendencias anteriores ({hook.pendingDailyDemandsPrevious.length})
                      </div>
                    </div>
                    {hook.pendingDailyDemandsPrevious.map(renderPendingDailyDemandCard)}
                  </div>
                )}

                {hook.osExternasPendentes.map((os) => (
                  <div key={os.id} className="border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">{os.numeroOs}</span>
                          <span className="ml-2 text-sm text-gray-500">{formatDateShort(os.data)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{os.unidadeEscolar}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          <User size={16} className="inline mr-1" />{os.tecnicoResponsavel}
                        </p>
                        <p className="text-xs text-gray-500">Criada: {formatDateTime(os.createdAt)}</p>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button onClick={() => hook.handleViewDetails(os)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                          <Eye size={16} className="mr-1" />Ver
                        </Button>
                        {(hook.userRole && ["ADMIN", "ADMTOTAL"].includes(hook.userRole)) && (
                          <div className="flex flex-col">
                            <Button
                              onClick={() => hook.handleResendEmail(os)}
                              size="sm"
                              disabled={hook.resendingEmail === os.id || !hook.canSendEmailToday(os)}
                              className={`text-white disabled:opacity-50 disabled:cursor-not-allowed ${hook.canSendEmailToday(os) ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400"}`}
                              title={hook.canSendEmailToday(os) ? "Reenviar email de lembrete para a escola" : "Ja foi enviado um email hoje (limite: 1 por dia)"}
                            >
                              {hook.resendingEmail === os.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                              ) : (
                                <Send size={16} className="mr-1" />
                              )}
                              {hook.resendingEmail === os.id ? "Enviando..." : "Reenviar"}
                            </Button>
                            {os.lastEmailSent && (
                              <span className="text-xs text-gray-500 mt-1 text-center">{hook.getLastEmailText(os)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita - OS Assinadas */}
          {!hook.pendingOnly && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-6">
                <CheckCircle size={24} className="text-green-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  OS Assinadas ({hook.osExternasAssinadas.length})
                </h2>
              </div>

              {hook.osExternasAssinadas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>{hook.searchTerm ? "Nenhuma OS assinada encontrada" : "Nenhuma OS assinada"}</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {hook.osExternasAssinadas.map((os) => (
                    <div key={os.id} className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">{os.numeroOs}</span>
                            <span className="ml-2 text-sm text-gray-500">{formatDateShort(os.data)}</span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{os.unidadeEscolar}</h3>
                          <p className="text-sm text-gray-600 mb-1">
                            <User size={16} className="inline mr-1" />{os.tecnicoResponsavel}
                          </p>
                          <p className="text-sm text-green-600 mb-2">
                            <CheckCircle size={16} className="inline mr-1" />
                            Assinado por: {os.assinado}
                          </p>
                          <p className="text-xs text-gray-500">Criada: {formatDateTime(os.createdAt)}</p>
                        </div>
                        <Button onClick={() => hook.handleViewDetails(os)} size="sm" className="ml-4 bg-green-500 hover:bg-green-600 text-white">
                          <Eye size={16} className="mr-1" />Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <OsExternasDetailModal
        showModal={hook.showModal}
        selectedOs={hook.selectedOs}
        closeModal={hook.closeModal}
      />

      <OsExternasModals
        showConfirmModal={hook.showConfirmModal}
        setShowConfirmModal={hook.setShowConfirmModal}
        confirmOsData={hook.confirmOsData}
        confirmResendEmail={hook.confirmResendEmail}
        showSuccessModal={hook.showSuccessModal}
        setShowSuccessModal={hook.setShowSuccessModal}
        emailResult={hook.emailResult}
        showNotVisitedModal={hook.showNotVisitedModal}
        setShowNotVisitedModal={hook.setShowNotVisitedModal}
        notVisitedDate={hook.notVisitedDate}
        setNotVisitedDate={hook.setNotVisitedDate}
        filteredNotVisitedDailyDemands={hook.filteredNotVisitedDailyDemands}
        userRole={hook.userRole}
      />
    </div>
  );
};

export const getServerSideProps = async () => ({ props: {} });


export default function ProtectedOsExternasList() {
  return <ProtectedRoute><OsExternasList /></ProtectedRoute>;
}