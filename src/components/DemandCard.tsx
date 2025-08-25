import React from 'react';
import { Trash, Pencil, ClipboardText, CheckCircle } from 'phosphor-react';

interface Demand {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  osStatus?: 'pending' | 'created' | 'signed';
  numeroOs?: string;
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
}

const DemandCard: React.FC<DemandCardProps> = ({
  demand,
  school,
  userRole,
  onEdit,
  onDelete,
  onCreateOS,
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'signed': return 'bg-green-50 border-green-500 shadow-green-100';
      case 'created': return 'bg-yellow-50 border-yellow-500 shadow-yellow-100';
      default: return 'bg-white border-gray-200 shadow-gray-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'signed': return <CheckCircle size={18} className="text-green-600" />;
      case 'created': return <ClipboardText size={18} className="text-yellow-600" />;
      default: return <ClipboardText size={18} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: string) => {
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
      ${getStatusColor(demand.osStatus)}
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
            {getStatusBadge(demand.osStatus)}
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

          {/* Footer info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              🕒 {new Date(demand.createdAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            
            {demand.numeroOs && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                📄 OS: {demand.numeroOs}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:w-auto">
          {/* Create OS button */}
          {demand.osStatus === 'pending' && (
            <button
              onClick={() => onCreateOS(demand)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
              title="Preencher OS"
            >
              <ClipboardText size={16} />
              <span className="hidden sm:inline">Preencher OS</span>
              <span className="sm:hidden">OS</span>
            </button>
          )}

          {/* Edit and Delete buttons */}
          <div className="flex gap-2">
            {(userRole === 'ADMTOTAL' || userRole === 'ADMIN') && (
              <button
                onClick={() => onEdit(demand)}
                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar demanda"
              >
                <Pencil size={18} />
              </button>
            )}
            
            {(userRole === 'ADMTOTAL' || userRole === 'ADMIN') && (
              <button
                onClick={() => onDelete(demand.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Apagar demanda"
              >
                <Trash size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandCard;