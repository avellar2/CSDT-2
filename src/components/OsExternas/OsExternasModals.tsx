import React from "react";
import { useRouter } from "next/router";
import { CheckCircle, Send, X, User } from "lucide-react";
import type { OsExterna, NotVisitedDailyDemand } from "@/hooks/useOsExternasList";

interface OsExternasModalsProps {
  showConfirmModal: boolean;
  setShowConfirmModal: (v: boolean) => void;
  confirmOsData: OsExterna | null;
  confirmResendEmail: () => Promise<void>;
  showSuccessModal: boolean;
  setShowSuccessModal: (v: boolean) => void;
  emailResult: { message: string; escola: string } | null;
  showNotVisitedModal: boolean;
  setShowNotVisitedModal: (v: boolean) => void;
  notVisitedDate: string;
  setNotVisitedDate: (v: string) => void;
  filteredNotVisitedDailyDemands: NotVisitedDailyDemand[];
  userRole: string | null;
}

const OsExternasModals: React.FC<OsExternasModalsProps> = ({
  showConfirmModal,
  setShowConfirmModal,
  confirmOsData,
  confirmResendEmail,
  showSuccessModal,
  setShowSuccessModal,
  emailResult,
  showNotVisitedModal,
  setShowNotVisitedModal,
  notVisitedDate,
  setNotVisitedDate,
  filteredNotVisitedDailyDemands,
  userRole,
}) => {
  const router = useRouter();

  return (
    <>
      {/* Modal de Confirmacao de Reenvio */}
      {showConfirmModal && confirmOsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full mx-auto shadow-2xl transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Send className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Reenviar Email da OS
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Deseja reenviar o email para <strong>{confirmOsData.unidadeEscolar}</strong>?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">OS:</span> {confirmOsData.numeroOs}</p>
                  <p><span className="font-medium">Email:</span> {confirmOsData.emailResponsavel}</p>
                  <p className="text-orange-600">
                    ⚠️ Isso enviara um lembrete sobre a OS pendente com o PDF anexado
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmResendEmail}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enviar Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso/Erro do Email */}
      {showSuccessModal && emailResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full mx-auto shadow-2xl transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                {emailResult.message.includes("sucesso") ? (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {emailResult.message.includes("sucesso") ? "Email Enviado!" : "Erro no Envio"}
              </h3>
              <p className="text-gray-600 text-center mb-4">{emailResult.message}</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-medium">Escola:</span> {emailResult.escola}
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${emailResult.message.includes("sucesso") ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Escolas Nao Visitadas */}
      {showNotVisitedModal && userRole && ["ADMIN", "ADMTOTAL"].includes(userRole) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[85vh] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Escolas Nao Visitadas</h3>
                <p className="text-sm text-gray-600">
                  {new Date(`${notVisitedDate}T12:00:00-03:00`).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button onClick={() => setShowNotVisitedModal(false)} className="text-gray-500 hover:text-gray-700" aria-label="Fechar">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="date"
                value={notVisitedDate}
                min="2026-05-05"
                onChange={(e) => setNotVisitedDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="text-sm text-gray-600">Total: {filteredNotVisitedDailyDemands.length}</div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-144px)] space-y-4">
              {filteredNotVisitedDailyDemands.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900">
                  Nenhuma escola nao visitada em {new Date(`${notVisitedDate}T12:00:00-03:00`).toLocaleDateString("pt-BR")}.
                </div>
              ) : (
                filteredNotVisitedDailyDemands.map((demand) => (
                  <div key={`not-visited-demand-${demand.demandId}`} className="border border-amber-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-amber-50/50">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-3 gap-2">
                          <span className="px-2 py-1 rounded text-sm font-medium bg-amber-100 text-amber-800">Nao visitada</span>
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
                        {demand.visitReason && (
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
                      <button
                        onClick={() => router.push(`/daily-demands?date=${encodeURIComponent(demand.demandDate)}`)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium"
                      >
                        Ver demanda
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OsExternasModals;
