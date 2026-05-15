import React from "react";
import {
  Package,
  Building2,
  User,
  Calendar,
  Clock,
  CheckCircle,
  Printer,
  Eye,
  Upload,
} from "lucide-react";
import type { ChadaItem, ChadaStatus, TabType } from "@/hooks/useChada";

interface ChadaItemsListProps {
  filteredAndSortedItems: ChadaItem[];
  items: ChadaItem[];
  activeTab: TabType;
  searchTerm: string;
  sectorFilter: string;
  statusFilter: string;
  stats: { totalEnviados: number; naChada: number; devolvidos: number; tempoMedioDias: number; itensComAlerta: number };
  getDaysInChada: (createdAt: string, statusChada: string, updatedAt?: string) => number;
  needsAlert: (item: ChadaItem) => boolean;
  getStatusBadge: (status: ChadaStatus) => { className: string; label: string };
  resetFilters: () => void;
  renderTimeline: (item: ChadaItem) => React.ReactNode;
  onUpdateStatus: (item: ChadaItem) => void;
  onPrintOS: (item: ChadaItem) => void;
  onUploadOS: (id: string) => void;
}

const ChadaItemsList: React.FC<ChadaItemsListProps> = ({
  filteredAndSortedItems,
  items,
  activeTab,
  searchTerm,
  sectorFilter,
  statusFilter,
  stats,
  getDaysInChada,
  needsAlert,
  getStatusBadge,
  resetFilters,
  renderTimeline,
  onUpdateStatus,
  onPrintOS,
  onUploadOS,
}) => {
  if (filteredAndSortedItems.length === 0) {
    const hasFilters = searchTerm || sectorFilter !== 'all' || statusFilter !== 'all';
    let emptyMessage = 'Nenhum item encontrado';
    if (hasFilters) {
      emptyMessage = 'Nenhum item encontrado com os filtros aplicados';
    } else if (activeTab === 'na_chada') {
      emptyMessage = 'Nenhum item na CHADA';
    } else if (activeTab === 'devolvidos') {
      emptyMessage = `Nenhum item devolvido ainda (Debug: ${stats.devolvidos} devolvidos nas estatísticas)`;
    }

    return (
      <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
        {activeTab === 'devolvidos' && stats.devolvidos > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              🐛 <strong>Debug:</strong> Há {stats.devolvidos} item(ns) devolvido(s) nas estatísticas, mas não aparecem aqui.
              <br />Verifique o console para mais detalhes.
            </p>
          </div>
        )}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredAndSortedItems.map((item) => {
        const badge = getStatusBadge(item.statusChada);
        const days = getDaysInChada(item.createdAt, item.statusChada, item.updatedAt);
        const showUpdateBtn = item.statusChada === 'PENDENTE' || item.statusChada === 'RECEBIDO' || item.statusChada === 'EM_ANALISE';

        return (
          <div key={item.id} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            {/* Header do Card */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{item.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={badge.className}>{badge.label}</span>
                      <span className={`text-xs sm:text-sm whitespace-nowrap ${
                        needsAlert(item)
                          ? 'text-red-600 font-medium bg-red-100 px-2 py-1 rounded'
                          : 'text-gray-500'
                      }`}>
                        {needsAlert(item) && '⚠️ '}{days} dias
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:block">{renderTimeline(item)}</div>
                </div>
              </div>
            </div>

            {/* Informações do Item */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white rounded-md p-3 border-l-4 border-blue-400">
                  <div className="flex items-center mb-1">
                    <Package size={16} className="text-blue-500 mr-2" />
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Equipamento</p>
                  </div>
                  <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{item.brand}</p>
                  <p className="text-xs text-gray-600 mt-1 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                    {item.serialNumber}
                  </p>
                </div>

                <div className="bg-white rounded-md p-3 border-l-4 border-green-400">
                  <div className="flex items-center mb-1">
                    <Building2 size={16} className="text-green-500 mr-2" />
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Setor/Escola</p>
                  </div>
                  <p className="font-bold text-gray-900 text-sm sm:text-base">{item.sector}</p>
                </div>

                <div className="bg-white rounded-md p-3 border-l-4 border-purple-400">
                  <div className="flex items-center mb-1">
                    <User size={16} className="text-purple-500 mr-2" />
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Enviado por</p>
                  </div>
                  <p className="font-bold text-gray-900 text-sm sm:text-base">{item.userName}</p>
                </div>
              </div>

              {/* Número de OS da CHADA */}
              {(item.numeroChadaOS || item.emailSentAt) && (
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {item.numeroChadaOS && item.numeroChadaOS.trim() !== '' && (
                    <div className="bg-white rounded-md p-3 border-l-4 border-yellow-400">
                      <div className="flex items-center mb-1">
                        <span className="text-yellow-500 mr-2">📋</span>
                        <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">OS CHADA</p>
                      </div>
                      <p className="font-bold text-gray-900 text-lg">{item.numeroChadaOS}</p>
                    </div>
                  )}
                  {item.emailSentAt && (
                    <div className="bg-white rounded-md p-3 border-l-4 border-indigo-400">
                      <div className="flex items-center mb-1">
                        <span className="text-indigo-500 mr-2">📧</span>
                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Email Enviado</p>
                      </div>
                      <p className="text-sm text-gray-700">
                        {new Date(item.emailSentAt).toLocaleString('pt-BR')}
                      </p>
                      {(!item.numeroChadaOS || item.numeroChadaOS.trim() === '') && (
                        <p className="text-xs text-orange-600 mt-1">⏳ Aguardando resposta da CHADA</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Problema */}
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Problema Relatado</p>
              <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg break-words ">{item.problem}</p>
            </div>

            {/* Observações da CHADA */}
            {item.observacoes && (
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Observações da CHADA</p>
                <p className="text-sm sm:text-base text-gray-900 bg-blue-50 p-2 sm:p-3 rounded-lg border-l-4 border-blue-400 break-words">{item.observacoes}</p>
              </div>
            )}

            {/* Datas */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-500 mb-4">
              <span className="flex items-center">
                <Calendar size={12} className="mr-1" />
                Enviado: {new Date(item.createdAt).toLocaleDateString('pt-BR')}
              </span>
              {item.statusChada !== 'PENDENTE' && (
                <span className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  Atualizado: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {showUpdateBtn && (
                <button
                  onClick={() => onUpdateStatus(item)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm"
                >
                  <CheckCircle size={14} />
                  <span className="hidden sm:inline">Atualizar Status</span>
                  <span className="sm:hidden">Status</span>
                </button>
              )}

              <button
                onClick={() => onPrintOS(item)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Imprimir OS</span>
                <span className="sm:hidden">OS</span>
              </button>

              {/* Botões de Imagem */}
              {item.osImages && Array.isArray(item.osImages) && item.osImages.length > 0 ? (
                item.osImages.map((history: any, index: number) => (
                  <div key={index} className="flex gap-1">
                    {history.images?.map((url: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => window.open(url, "_blank")}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs sm:text-sm"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">Ver Laudo</span>
                        <span className="sm:hidden">Ver</span>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                item.statusChada !== 'PENDENTE' && (
                  <button
                    onClick={() => onUploadOS(item.id)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs sm:text-sm"
                  >
                    <Upload size={14} />
                    <span className="hidden sm:inline">Subir Laudo</span>
                    <span className="sm:hidden">Upload</span>
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChadaItemsList;
