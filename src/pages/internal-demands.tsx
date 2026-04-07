import React, { useEffect, useState, useMemo } from "react";
import { supabase } from '@/lib/supabaseClient';
import {
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Funnel,
  CaretDown,
  CaretUp,
  Eye,
  Calendar,
  User,
  ClipboardText,
  ChartBar,
  Wrench,
  X,
  WaveTriangle,
  Info
} from "phosphor-react";
import { PDFDocument } from 'pdf-lib';
import { motion } from 'framer-motion';


interface InternalOS {
  id: string;
  setor: string;
  tecnico: string;
  problema: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  email?: string;
  descricao?: string;
  peca?: string;
}

interface Profile {
  id: number;
  displayName: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

type SortField = 'setor' | 'problema' | 'status' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';
type TabType = 'active' | 'completed' | 'all';

const InternalDemands: React.FC = () => {
  // Estados principais
  const [internalOSList, setInternalOSList] = useState<InternalOS[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [setorFilter, setSetorFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados do modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<InternalOS | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [peca, setPeca] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados de toast e confirmação
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'accept' | 'finalize';
    osId: string | null;
    osTitle: string;
  }>({
    isOpen: false,
    type: 'accept',
    osId: null,
    osTitle: ''
  });

  // Função para mostrar toast
  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Função para calcular tempo decorrido
  const getTimeElapsed = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Menos de 1h';
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  // Função para carregar dados
  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        throw new Error("Usuário não autenticado");
      }

      // Busca perfil
      const profileResponse = await fetch(`/api/get-profile?userId=${user.id}`);
      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error("Erro ao buscar perfil");
      }

      setProfile(profileData);

      // Busca OS
      const osResponse = await fetch(`/api/get-internal-os-by-technician?userId=${user.id}`);
      
      if (!osResponse.ok) {
        throw new Error("Erro ao buscar OS");
      }

      const osData = await osResponse.json();
      setInternalOSList(Array.isArray(osData) ? osData : []);

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      showToast({
        type: 'error',
        title: 'Erro ao carregar dados',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      setInternalOSList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar dados inicial
  useEffect(() => {
    fetchData();
  }, []);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Filtrar e ordenar dados
  const filteredAndSortedOS = useMemo(() => {
    let filtered = internalOSList.filter(os => {
      // Filtro por aba
      const tabFilter = () => {
        switch (activeTab) {
          case 'active': return os.status !== 'Concluído';
          case 'completed': return os.status === 'Concluído';
          case 'all': return true;
          default: return true;
        }
      };

      // Filtro por busca
      const searchFilter = searchTerm === '' || 
        os.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.problema.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por status
      const statusFilterCheck = statusFilter === 'all' || os.status === statusFilter;

      // Filtro por setor
      const setorFilterCheck = setorFilter === 'all' || os.setor === setorFilter;

      return tabFilter() && searchFilter && statusFilterCheck && setorFilterCheck;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Converter datas para comparação
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        aValue = aTime;
        bValue = bTime;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [internalOSList, activeTab, searchTerm, statusFilter, setorFilter, sortField, sortDirection]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = internalOSList.length;
    const pendentes = internalOSList.filter(os => os.status === 'Pendente').length;
    const aceitas = internalOSList.filter(os => os.status === 'Aceita').length;
    const concluidas = internalOSList.filter(os => os.status === 'Concluído').length;
    
    // Tempo médio de resolução
    const osComDatas = internalOSList.filter(os => 
      os.status === 'Concluído' && os.createdAt && os.updatedAt
    );
    
    let tempoMedioHoras = 0;
    if (osComDatas.length > 0) {
      const totalHoras = osComDatas.reduce((acc, os) => {
        const created = new Date(os.createdAt).getTime();
        const updated = new Date(os.updatedAt).getTime();
        return acc + ((updated - created) / (1000 * 60 * 60));
      }, 0);
      tempoMedioHoras = totalHoras / osComDatas.length;
    }

    return {
      total,
      pendentes,
      aceitas,
      concluidas,
      tempoMedioHoras: Math.round(tempoMedioHoras)
    };
  }, [internalOSList]);

  // Listas únicas para filtros
  const uniqueSetores = useMemo(() => {
    return [...new Set(internalOSList.map(os => os.setor))].sort();
  }, [internalOSList]);

  const uniqueStatus = useMemo(() => {
    return [...new Set(internalOSList.map(os => os.status))].sort();
  }, [internalOSList]);

  const acceptOS = async (osId: string) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch("/api/update-os-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osId, status: "Aceita" }),
      });

      if (!response.ok) {
        throw new Error("Erro ao aceitar a OS");
      }

      const updatedOS = await response.json();
      
      setInternalOSList(prev =>
        prev.map(os => os.id === updatedOS.id ? { ...os, status: updatedOS.status } : os)
      );

      showToast({
        type: 'success',
        title: 'OS Aceita',
        message: 'OS aceita com sucesso!'
      });

    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao aceitar a OS. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
      setConfirmDialog({ isOpen: false, type: 'accept', osId: null, osTitle: '' });
    }
  };

  const finalizeOS = async () => {
    if (!selectedOS || !problemDescription.trim()) {
      showToast({
        type: 'warning',
        title: 'Atenção',
        message: 'A descrição do problema é obrigatória.'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/finalize-os", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osId: selectedOS.id,
          status: "Concluído",
          descricao: problemDescription.trim(),
          peca: peca.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao finalizar a OS");
      }

      // Atualizar lista
      await fetchData(false);

      setIsModalOpen(false);
      setProblemDescription("");
      setSelectedOS(null);
      setPeca("");

      showToast({
        type: 'success',
        title: 'OS Finalizada',
        message: 'OS finalizada! O setor receberá um e-mail de confirmação.'
      });

    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao finalizar a OS. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para resetar filtros
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSetorFilter('all');
    setSortField('updatedAt');
    setSortDirection('desc');
  };

  // Render do status badge
  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      'Pendente': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      'Aceita': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'Concluído': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
        {status}
      </span>
    );
  };

  // Render dos cards de OS
  const renderOSCard = (os: InternalOS) => (
    <motion.div
      key={os.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-none transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{os.setor}</h3>
            {getStatusBadge(os.status)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <Calendar size={14} className="mr-1" />
            {os.createdAt ? `Criado ${getTimeElapsed(os.createdAt)} atrás` : 'Data não disponível'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-700 dark:text-gray-300">{os.problema}</p>
        {os.descricao && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Resolução:</strong> {os.descricao}
            </p>
            {os.peca && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <strong>Peças:</strong> {os.peca}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Atualizado: {new Date(os.updatedAt).toLocaleString('pt-BR')}
        </p>

        <div className="flex space-x-2">
          {os.status === 'Pendente' && (
            <button
              onClick={() => setConfirmDialog({
                isOpen: true,
                type: 'accept',
                osId: os.id,
                osTitle: `${os.setor} - ${os.problema.substring(0, 50)}...`
              })}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm"
            >
              <CheckCircle size={16} />
              <span>Aceitar</span>
            </button>
          )}

          {os.status === 'Aceita' && (
            <button
              onClick={() => {
                setSelectedOS(os);
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              <CheckCircle size={16} />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Demandas Internas
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Gerencie as demandas da equipe
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Bem-vindo, {profile?.displayName || "Carregando..."}
          </p>
        </motion.div>

        {/* Estatísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <ClipboardText size={20} className="text-gray-500 dark:text-gray-400 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <Clock size={20} className="text-amber-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendentes}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <Wrench size={20} className="text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.aceitas}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Em Andamento</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center">
              <CheckCircle size={20} className="text-emerald-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.concluidas}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Concluídas</p>
                {stats.tempoMedioHoras > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">~{stats.tempoMedioHoras}h média</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Abas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex space-x-1 mb-6"
        >
          {[
            { key: 'active', label: 'Ativas', count: stats.pendentes + stats.aceitas },
            { key: 'completed', label: 'Concluídas', count: stats.concluidas },
            { key: 'all', label: 'Todas', count: stats.total }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }
              `}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por setor ou problema..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Filtro de Status */}
            <div className="min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="all">Todos os Status</option>
                {uniqueStatus.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Setor */}
            <div className="min-w-[150px]">
              <select
                value={setorFilter}
                onChange={(e) => setSetorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="all">Todos os Setores</option>
                {uniqueSetores.map(setor => (
                  <option key={setor} value={setor}>{setor}</option>
                ))}
              </select>
            </div>

            {/* Botões */}
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Limpar
            </button>

            <button
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </motion.div>

        {/* Lista de OS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-4"
        >
          {filteredAndSortedOS.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
              <ClipboardText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {searchTerm || statusFilter !== 'all' || setorFilter !== 'all'
                  ? 'Nenhuma OS encontrada com os filtros aplicados'
                  : activeTab === 'active'
                    ? 'Nenhuma OS ativa encontrada'
                    : activeTab === 'completed'
                      ? 'Nenhuma OS concluída encontrada'
                      : 'Nenhuma OS encontrada'
                }
              </p>
              {(searchTerm || statusFilter !== 'all' || setorFilter !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedOS.map(renderOSCard)}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de finalização */}
      {isModalOpen && selectedOS && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Finalizar OS</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedOS(null);
                    setProblemDescription("");
                    setPeca("");
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Setor:</strong> {selectedOS.setor}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Problema:</strong> {selectedOS.problema}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> {selectedOS.email || "Não informado"}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Peça para comprar (opcional)
                </label>
                <input
                  type="text"
                  value={peca}
                  onChange={(e) => setPeca(e.target.value)}
                  placeholder="Ex: HD, Memória, Fonte..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição da resolução *
                </label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Descreva como o problema foi resolvido..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedOS(null);
                    setProblemDescription("");
                    setPeca("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={finalizeOS}
                  disabled={isSubmitting || !problemDescription.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Finalizando..." : "Finalizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmação */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle size={24} className="text-blue-500" weight="fill" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aceitar OS</h3>
                </div>
                <button
                  onClick={() => setConfirmDialog({ isOpen: false, type: 'accept', osId: null, osTitle: '' })}
                  disabled={isSubmitting}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Deseja aceitar a OS: {confirmDialog.osTitle}?
              </p>

              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setConfirmDialog({ isOpen: false, type: 'accept', osId: null, osTitle: '' })}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.osId) {
                      acceptOS(confirmDialog.osId);
                    }
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processando...</span>
                    </div>
                  ) : (
                    'Aceitar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => {
          const getIcon = (type: Toast['type']) => {
            switch (type) {
              case 'success': return <CheckCircle size={20} weight="fill" className="text-green-600" />;
              case 'error': return <X size={20} weight="bold" className="text-red-600" />;
              case 'warning': return <WaveTriangle size={20} weight="fill" className="text-yellow-600" />;
              case 'info': return <Info size={20} weight="fill" className="text-blue-600" />;
            }
          };

          const getColors = (type: Toast['type']) => {
            switch (type) {
              case 'success': return 'bg-green-50 border-green-200 text-green-800';
              case 'error': return 'bg-red-50 border-red-200 text-red-800';
              case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
              case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
            }
          };

          return (
            <div
              key={toast.id}
              className={`
                max-w-sm w-full border rounded-lg p-4 shadow-lg transform transition-all duration-300 ease-in-out
                ${getColors(toast.type)}
              `}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getIcon(toast.type)}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className="text-sm font-medium">
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p className="mt-1 text-sm opacity-90">
                      {toast.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="ml-4 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InternalDemands;

export const getServerSideProps = async () => ({ props: {} });
