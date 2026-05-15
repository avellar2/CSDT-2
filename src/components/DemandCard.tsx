import React from 'react';
import { Trash, Pencil, ClipboardList, CheckCircle } from 'lucide-react';

interface Demand {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  osStatus?: 'pending' | 'created' | 'signed';
  numeroOs?: string;
  isReagendamento?: boolean;
  categoria?: string;
  tecnico?: string;
  osOriginal?: string;
  visitStatus?: 'NOT_VISITED' | null;
  visitReason?: string | null;
  visitUpdatedBy?: string | null;
}

interface School {
  id: number;
  name: string;
  address: string;
  district: string;
}

interface DemandCardProps {
  demand: Demand;
  school?: School;
  userRole: string | null;
  onEdit: (demand: Demand) => void;
  onDelete: (id: string) => void;
  onCreateOS: (demand: Demand) => void;
  onMarkNotVisited: (demand: Demand) => void;
  onResetVisitStatus: (demand: Demand) => void;
}

const DemandCard: React.FC<DemandCardProps> = ({
  demand,
  school,
  userRole,
  onEdit,
  onDelete,
  onCreateOS,
  onMarkNotVisited,
  onResetVisitStatus,
}) => {
  const getStatusColor = (status?: string, isReagendamento?: boolean) => {
    // Se for reagendamento, usar cor laranja
    if (isReagendamento) {
      return 'bg-orange-50 border-orange-500 shadow-orange-100';
    }
    if (demand.visitStatus === 'NOT_VISITED') {
      return 'bg-red-50 border-red-500 shadow-red-100';
    }
    switch (status) {
      case 'signed': return 'bg-green-50 border-green-500 shadow-green-100';
      case 'created': return 'bg-yellow-50 border-yellow-500 shadow-yellow-100';
      default: return 'bg-white border-gray-200 shadow-gray-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'signed': return <CheckCircle size={18} className="text-green-600" />;
      case 'created': return <ClipboardList size={18} className="text-yellow-600" />;
      default: return <ClipboardList size={18} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: string, isReagendamento?: boolean) => {
    // Se for reagendamento, mostrar badge especial
    if (isReagendamento) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-800 bg-orange-200 rounded-full">
          🔄 Reagendamento
        </span>
      );
    }

    if (demand.visitStatus === 'NOT_VISITED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-800 bg-red-200 rounded-full">
          Não visitada
        </span>
      );
    }

    switch (status) {
      case 'signed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-800 bg-green-200 rounded-full">
            ✓ OS Assinada
          </span>
        );
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded-full">
            📝 OS Criada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-800 bg-red-200 rounded-full">
            ⏳ Pendente
          </span>
        );
    }
  };

  return (
    <div className={`
      p-6 rounded-xl border-l-4 transition-all duration-200 hover:shadow-lg
      ${getStatusColor(demand.osStatus, demand.isReagendamento)}
    `}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Main content */}
        <div className="flex-1 space-y-3">
          {/* Header with status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(demand.osStatus)}
              <h3 className="font-semibold text-gray-800 text-sm lg:text-base">
                {school ? `${school.district} Distrito - ${school.name}` : demand.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(demand.osStatus, demand.isReagendamento)}
              {demand.categoria && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                  {demand.categoria}
                </span>
              )}
            </div>
          </div>

          {/* School address */}
          {school && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              📍 {school.address}
            </p>
          )}

          {/* Description */}
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
            {demand.description}
          </p>

          {demand.visitStatus === 'NOT_VISITED' && demand.visitReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <div className="font-medium">Motivo da não visita</div>
              <div className="whitespace-pre-line">{demand.visitReason}</div>
              {demand.visitUpdatedBy && (
                <div className="mt-1 text-xs text-red-700">Marcado por: {demand.visitUpdatedBy}</div>
              )}
            </div>
          )}

          {/* Footer info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                🕒 {new Date(demand.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              {demand.tecnico && (
                <span className="text-xs text-gray-600">
                  👤 {demand.tecnico}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {demand.numeroOs && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  📄 OS: {demand.numeroOs}
                </span>
              )}

              {demand.osOriginal && (
                <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  🔄 OS Original: {demand.osOriginal}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:w-auto">
          {/* Create OS button - apenas para demandas normais pendentes */}
          {demand.osStatus === 'pending' && !demand.isReagendamento && (
            <>
              <button
                onClick={() => onCreateOS(demand)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                title="Preencher OS"
              >
                <ClipboardList size={16} />
                <span className="hidden sm:inline">Preencher OS</span>
                <span className="sm:hidden">OS</span>
              </button>

              {demand.visitStatus === 'NOT_VISITED' ? (
                <button
                  onClick={() => onResetVisitStatus(demand)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                  title="Reabrir demanda"
                >
                  <span className="hidden sm:inline">Reabrir</span>
                  <span className="sm:hidden">Reabrir</span>
                </button>
              ) : (
                <button
                  onClick={() => onMarkNotVisited(demand)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  title="Não fui à escola"
                >
                  <span className="hidden sm:inline">Não fui à escola</span>
                  <span className="sm:hidden">Não fui</span>
                </button>
              )}
            </>
          )}

          {/* Botão para reagendamentos - direciona para /fill-pdf-form-2 */}
          {demand.isReagendamento && (
            <button
              onClick={() => onCreateOS(demand)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              title="Preencher OS de Reagendamento"
            >
              <ClipboardList size={16} />
              <span className="hidden sm:inline">Preencher OS</span>
              <span className="sm:hidden">OS</span>
            </button>
          )}

          {/* Edit and Delete buttons */}
          {(userRole === 'ADMTOTAL' || userRole === 'ADMIN') && (
            <div className="flex flex-col gap-2 lg:flex-row">
              <button
                onClick={() => onEdit(demand)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
                title="Editar demanda"
              >
                <Pencil size={16} />
                <span className="hidden sm:inline">Editar</span>
              </button>

              <button
                onClick={() => onDelete(demand.id)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                title="Apagar demanda"
              >
                <Trash size={16} />
                <span className="hidden sm:inline">Apagar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandCard;
