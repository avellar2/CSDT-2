import React from 'react';
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface ScaleHistoryProps {
  scaleHistory: any[];
  loadingHistory: boolean;
  selectedHistoryScale: any;
  setSelectedHistoryScale: (v: any) => void;
  historyDateFilter: string;
  setHistoryDateFilter: (v: string) => void;
  parseLocalDate: (d: string | Date) => Date;
  fetchScaleHistory: () => Promise<void>;
}

const ScaleHistory: React.FC<ScaleHistoryProps> = ({
  scaleHistory,
  loadingHistory,
  selectedHistoryScale,
  setSelectedHistoryScale,
  historyDateFilter,
  setHistoryDateFilter,
  parseLocalDate,
  fetchScaleHistory,
}) => {
  return (
    <div className="space-y-6">
      {/* Header do Histórico */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={20} />
            Histórico de Escalas
          </h3>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchScaleHistory}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : scaleHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma escala encontrada</p>
            <p className="text-sm">Crie sua primeira escala para ver o histórico aqui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scaleHistory
              .filter((scale: any) => !historyDateFilter || scale.date === historyDateFilter)
              .map((scale: any, index: number) => (
                <div
                  key={`${scale.date}-${index}`}
                  className="border border-gray-200 dark:border-zinc-600 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedHistoryScale(scale)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-blue-500" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {parseLocalDate(scale.date).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Criado às {new Date(scale.createdAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users size={16} className="text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {scale.totalTechnicians} técnicos
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={16} className="text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {scale.totalSchools} escolas
                        </span>
                      </div>
                      <Eye size={16} className="text-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800 dark:text-blue-300">Base</span>
                        <span className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                          {scale.baseTechnicians.length}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {scale.baseTechnicians.slice(0, 3).map((tech: any) => (
                          <div key={tech.id} className="text-blue-700 dark:text-blue-200 text-xs">
                            {tech.displayName}
                          </div>
                        ))}
                        {scale.baseTechnicians.length > 3 && (
                          <div className="text-blue-600 dark:text-blue-300 text-xs">
                            +{scale.baseTechnicians.length - 3} mais...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-800 dark:text-green-300">Visita Técnica</span>
                        <span className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                          {scale.visitTechnicians.length}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {scale.visitTechnicians.slice(0, 3).map((tech: any) => (
                          <div key={tech.id} className="text-green-700 dark:text-green-200 text-xs">
                            {tech.displayName}
                          </div>
                        ))}
                        {scale.visitTechnicians.length > 3 && (
                          <div className="text-green-600 dark:text-green-300 text-xs">
                            +{scale.visitTechnicians.length - 3} mais...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800 dark:text-gray-300">Folga</span>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs">
                          {scale.offTechnicians.length}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {scale.offTechnicians.slice(0, 3).map((tech: any) => (
                          <div key={tech.id} className="text-gray-700 dark:text-gray-200 text-xs">
                            {tech.displayName}
                          </div>
                        ))}
                        {scale.offTechnicians.length > 3 && (
                          <div className="text-gray-600 dark:text-gray-300 text-xs">
                            +{scale.offTechnicians.length - 3} mais...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* History Detail Modal */}
      {selectedHistoryScale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-4xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar size={24} />
                Detalhes da Escala - {new Date(selectedHistoryScale.date).toLocaleDateString('pt-BR')}
              </h2>
              <button
                onClick={() => setSelectedHistoryScale(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <Users size={20} />
                  Técnicos de Base ({selectedHistoryScale.baseTechnicians.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHistoryScale.baseTechnicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white dark:bg-blue-800/30 rounded p-3 border border-blue-200 dark:border-blue-700">
                      <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm">{tech.displayName}</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 font-medium">
                        Adicionado: {new Date(tech.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {selectedHistoryScale.baseTechnicians.length === 0 && (
                    <p className="text-blue-600 dark:text-blue-300 text-sm">Nenhum técnico alocado</p>
                  )}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Visitas Técnicas ({selectedHistoryScale.visitTechnicians.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHistoryScale.visitTechnicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white dark:bg-green-800/30 rounded p-3 border border-green-200 dark:border-green-700">
                      <div className="font-semibold text-green-900 dark:text-green-100 text-sm">{tech.displayName}</div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1 font-medium">
                        Adicionado: {new Date(tech.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {selectedHistoryScale.visitTechnicians.length === 0 && (
                    <p className="text-green-600 dark:text-green-300 text-sm">Nenhum técnico alocado</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock size={20} />
                  Técnicos de Folga ({selectedHistoryScale.offTechnicians.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedHistoryScale.offTechnicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white dark:bg-gray-800/30 rounded p-3 border border-gray-200 dark:border-gray-600">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{tech.displayName}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium">
                        Adicionado: {new Date(tech.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                  {selectedHistoryScale.offTechnicians.length === 0 && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Nenhum técnico alocado</p>
                  )}
                </div>
              </div>
            </div>

            {selectedHistoryScale.schoolDemands.length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Demandas das Escolas ({selectedHistoryScale.schoolDemands.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {selectedHistoryScale.schoolDemands.map((demand: any) => (
                    <div key={demand.id} className="bg-white dark:bg-indigo-800/30 rounded p-3 border border-indigo-200 dark:border-indigo-700">
                      <div className="font-medium text-indigo-900 dark:text-indigo-100 text-sm mb-1">
                        {demand.School?.name || 'Escola não identificada'}
                      </div>
                      {demand.School?.district && (
                        <div className="text-xs text-indigo-700 dark:text-indigo-300 mb-2 font-medium">
                          Distrito: {demand.School.district}
                        </div>
                      )}
                      <div className="text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded p-3 font-medium">
                        {demand.demand}
                      </div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                        Criado: {new Date(demand.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedHistoryScale(null)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScaleHistory;
