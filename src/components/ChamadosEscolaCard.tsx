import React, { useState } from 'react';
import { Phone, Plus, X, Check, Clock } from 'phosphor-react';

interface ChamadoEscola {
  id: string;
  schoolId: number;
  schoolName: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  phone?: string;
  contact?: string;
  createdBy: string;
  assignedTo?: string;
  notes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  School: {
    id: number;
    name: string;
    district?: string;
    phone?: string;
    email?: string;
  };
}

interface ChamadosEscolaCardProps {
  chamados: ChamadoEscola[];
  totalPending: number;
  onCreateChamado: () => void;
  onUpdateChamado: (id: string, data: any) => void;
}

const ChamadosEscolaCard: React.FC<ChamadosEscolaCardProps> = ({
  chamados,
  totalPending,
  onCreateChamado,
  onUpdateChamado
}) => {
  const [selectedChamado, setSelectedChamado] = useState<ChamadoEscola | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'COMPUTER': return '🖥️';
      case 'NOTEBOOK': return '💻';
      case 'TABLET': return '📱';
      case 'PRINTER': return '🖨️';
      case 'NETWORK': return '🌐';
      case 'SOFTWARE': return '💿';
      case 'MAINTENANCE': return '🔧';
      case 'PHONE': return '☎️';
      case 'PROJECTOR': return '📽️';
      case 'AUDIO': return '🔊';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-blue-600 bg-blue-100';
      case 'ASSIGNED': return 'text-purple-600 bg-purple-100';
      case 'IN_PROGRESS': return 'text-orange-600 bg-orange-100';
      case 'RESOLVED': return 'text-green-600 bg-green-100';
      case 'CLOSED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aberto';
      case 'ASSIGNED': return 'Atribuído';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'RESOLVED': return 'Resolvido';
      case 'CLOSED': return 'Fechado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const handleResolverChamado = async (chamado: ChamadoEscola) => {
    if (!confirm('Tem certeza que deseja marcar este chamado como resolvido?')) {
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateChamado(chamado.id, {
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString()
      });
      setSelectedChamado(null);
    } catch (error) {
      console.error('Erro ao resolver chamado:', error);
      alert('Erro ao resolver chamado');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Phone size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Chamados Pendentes
            </h3>
            {totalPending > 0 && (
              <span className="bg-red-500 text-white rounded-full px-2 py-1 text-sm font-bold">
                {totalPending}
              </span>
            )}
          </div>
          <button
            onClick={onCreateChamado}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Chamado</span>
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {chamados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Phone size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhum chamado pendente</p>
              <p className="text-sm">Clique em "Novo Chamado" para cadastrar</p>
            </div>
          ) : (
            chamados.map((chamado) => (
              <div
                key={chamado.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedChamado(chamado)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(chamado.category)}</span>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {chamado.title}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(chamado.priority)}`}>
                        {chamado.priority}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {chamado.schoolName} {chamado.School.district && `- ${chamado.School.district}`}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {chamado.description}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chamado.status)}`}>
                        {getStatusText(chamado.status)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(chamado.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de detalhes do chamado */}
      {selectedChamado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Detalhes do Chamado
                </h3>
                <button
                  onClick={() => setSelectedChamado(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(selectedChamado.category)}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {selectedChamado.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedChamado.priority)}`}>
                        {selectedChamado.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedChamado.status)}`}>
                        {getStatusText(selectedChamado.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Escola:</h5>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedChamado.schoolName}
                  </p>
                  {selectedChamado.School.district && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Distrito: {selectedChamado.School.district}
                    </p>
                  )}
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Descrição:</h5>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedChamado.description}
                  </p>
                </div>

                {selectedChamado.contact && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Contato:</h5>
                    <p className="text-gray-700 dark:text-gray-300">{selectedChamado.contact}</p>
                  </div>
                )}

                {selectedChamado.phone && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Telefone:</h5>
                    <p className="text-gray-700 dark:text-gray-300">{selectedChamado.phone}</p>
                  </div>
                )}

                {selectedChamado.notes && (
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Observações:</h5>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedChamado.notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <span>Criado em: {formatDate(selectedChamado.createdAt)}</span>
                  {selectedChamado.resolvedAt && (
                    <span>Resolvido em: {formatDate(selectedChamado.resolvedAt)}</span>
                  )}
                </div>
              </div>

              {/* Ações do chamado */}
              {selectedChamado.status !== 'RESOLVED' && selectedChamado.status !== 'CLOSED' && (
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => handleResolverChamado(selectedChamado)}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Check size={16} />
                    {isLoading ? 'Processando...' : 'Marcar como Resolvido'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChamadosEscolaCard;