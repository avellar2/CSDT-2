import React from "react";
import { Printer } from "lucide-react";
import type { ChadaDiagnostic, DiagnosticStatus } from "@/hooks/useChada";

interface ChadaDiagnosticsProps {
  diagnostics: ChadaDiagnostic[];
  loadingDiagnostics: boolean;
  onUpdateDiagnosticStatus: (id: string, status: DiagnosticStatus) => Promise<void>;
}

const ChadaDiagnostics: React.FC<ChadaDiagnosticsProps> = ({
  diagnostics,
  loadingDiagnostics,
  onUpdateDiagnosticStatus,
}) => {
  if (loadingDiagnostics) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Carregando diagnósticos...</p>
      </div>
    );
  }

  if (diagnostics.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
        <Printer size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Nenhum diagnóstico cadastrado</p>
        <p className="text-gray-400 text-sm mt-2">
          Clique em "Novo Diagnóstico" para começar
        </p>
      </div>
    );
  }

  const getStatusStyle = (status: DiagnosticStatus) => {
    switch (status) {
      case 'AGUARDANDO_PECA': return 'bg-yellow-100 text-yellow-800';
      case 'PECA_CHEGOU': return 'bg-blue-100 text-blue-800';
      case 'INSTALADO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: DiagnosticStatus) => {
    switch (status) {
      case 'AGUARDANDO_PECA': return '⏳ Aguardando Peça';
      case 'PECA_CHEGOU': return '📦 Peça Chegou';
      case 'INSTALADO': return '✅ Instalado';
      case 'CANCELADO': return '❌ Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {diagnostics.map((diagnostic) => (
        <div key={diagnostic.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {diagnostic.Item.name} - {diagnostic.Item.brand}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(diagnostic.status)}`}>
                  {getStatusLabel(diagnostic.status)}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Serial:</strong> {diagnostic.Item.serialNumber}</p>
                <p><strong>Setor:</strong> {diagnostic.sectorName}</p>
                <p><strong>Técnico CHADA:</strong> {diagnostic.technicianChada}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${diagnostic.isDelayed ? 'text-red-600' : 'text-gray-600'}`}>
                {diagnostic.isDelayed && '⚠️ '}{diagnostic.timeWaiting || `${diagnostic.daysWaiting} dias`}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(diagnostic.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Diagnóstico:</h4>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
              {diagnostic.diagnostic}
            </p>
          </div>

          {/* Peça Solicitada */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Peça Solicitada:</h4>
            <p className="text-gray-900 bg-blue-50 p-3 rounded-lg text-sm border-l-4 border-blue-400">
              {diagnostic.requestedPart}
            </p>
          </div>

          {/* Ações */}
          {diagnostic.status !== 'INSTALADO' && diagnostic.status !== 'CANCELADO' && (
            <div className="flex gap-2 flex-wrap">
              {diagnostic.status === 'AGUARDANDO_PECA' && (
                <button
                  onClick={() => onUpdateDiagnosticStatus(diagnostic.id, 'PECA_CHEGOU')}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  📦 Peça Chegou
                </button>
              )}
              {diagnostic.status === 'PECA_CHEGOU' && (
                <button
                  onClick={() => onUpdateDiagnosticStatus(diagnostic.id, 'INSTALADO')}
                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  ✅ Marcar como Instalado
                </button>
              )}
              <button
                onClick={() => onUpdateDiagnosticStatus(diagnostic.id, 'CANCELADO')}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                ❌ Cancelar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChadaDiagnostics;
