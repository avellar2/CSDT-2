import React, { useState } from 'react';
import {
  UserCheck,
  UserX,
  Users,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getAuthHeaders } from '@/utils/client-auth';

interface Technician {
  id: number;
  displayName: string;
  isActive: boolean;
}

interface ScaleTechniciansProps {
  userRole: string | null;
}

const ScaleTechnicians: React.FC<ScaleTechniciansProps> = ({ userRole }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/technicians/list', { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error('Erro ao buscar técnicos');
      }
      const data = await response.json();
      setTechnicians(data);
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTechnicians();
  }, []);

  const toggleTechnician = async (tech: Technician) => {
    if (updatingId) return;

    setUpdatingId(tech.id);
    try {
      const response = await fetch('/api/technicians/toggle-active', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: tech.id,
          isActive: !tech.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar técnico');
      }

      setTechnicians(prev =>
        prev.map(t =>
          t.id === tech.id ? { ...t, isActive: !t.isActive } : t
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar técnico:', error);
      alert('Erro ao atualizar o status do técnico.');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeTechnicians = technicians.filter(t => t.isActive);
  const inactiveTechnicians = technicians.filter(t => !t.isActive);
  const filteredTechnicians = technicians.filter(t =>
    t.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = userRole === 'ADMIN' || userRole === 'ADMTOTAL';

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-8 text-center text-gray-500">
        Você não tem permissão para gerenciar técnicos.
      </div>
    );
  }

  const renderTechnicianRow = (tech: Technician) => (
    <div
      key={tech.id}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg"
    >
      <div className="flex items-center gap-3 min-w-0">
        {tech.isActive ? (
          <UserCheck size={18} className="text-green-500 flex-shrink-0" />
        ) : (
          <UserX size={18} className="text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {tech.displayName}
        </span>
      </div>
      <button
        onClick={() => toggleTechnician(tech)}
        disabled={updatingId === tech.id}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap ${
          tech.isActive
            ? 'bg-red-50 text-red-700 hover:bg-red-100'
            : 'bg-green-50 text-green-700 hover:bg-green-100'
        }`}
      >
        {updatingId === tech.id
          ? 'Salvando...'
          : tech.isActive
            ? 'Desativar'
            : 'Reativar'}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={20} />
            Gerenciamento de Técnicos
          </h3>
          <button
            onClick={fetchTechnicians}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>

        <div className="relative mb-6">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar técnico..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {search ? (
              <div className="space-y-2">
                {filteredTechnicians.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum técnico encontrado
                  </p>
                ) : (
                  filteredTechnicians.map(renderTechnicianRow)
                )}
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <UserCheck size={16} className="text-green-500" />
                    Ativos ({activeTechnicians.length})
                  </h4>
                  {activeTechnicians.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum técnico ativo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeTechnicians.map(renderTechnicianRow)}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <UserX size={16} className="text-gray-400" />
                    Inativos ({inactiveTechnicians.length})
                  </h4>
                  {inactiveTechnicians.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum técnico inativo
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {inactiveTechnicians.map(renderTechnicianRow)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScaleTechnicians;
