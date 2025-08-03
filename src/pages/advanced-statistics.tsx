import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Monitor, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  School,
  Wifi,
  Printer,
  PieChart,
  BarChart3,
  Filter,
  X,
  RefreshCw
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface FiltersState {
  period: string;
  startDate: string;
  endDate: string;
  technician: string;
  school: string;
  status: string;
  osType: string;
}

interface StatisticsData {
  kpis: {
    totalInternalOS: number;
    totalOSExterna: number;
    totalOS: number;
    totalOsAssinada: number;
    totalAllOS: number;
    pendingOS: number;
    resolvedOS: number;
    resolutionRate: string;
    pendingRate: string;
    totalMemorandums: number;
    totalItems: number;
  };
  temporal: {
    internalOS: Array<{ month: string; count: number }>;
    osExterna: Array<{ month: string; count: number }>;
    os: Array<{ month: string; count: number }>;
    osAssinada: Array<{ month: string; count: number }>;
    memorandums: Array<{ month: string; count: number }>;
  };
  technicians: {
    internal: Array<{ tecnicoId: number; _count: { id: number }; displayName: string }>;
    external: Array<{ tecnicoResponsavel: string; _count: { id: number } }>;
    os: Array<{ tecnicoResponsavel: string; _count: { id: number } }>;
  };
  equipment: {
    totalPCs: number;
    totalNotebooks: number;
    totalMonitors: number;
    totalTablets: number;
    schoolsWithLab: number;
    schoolsWithoutLab: number;
    printerStats: {
      oki: number;
      kyocera: number;
      hp: number;
      ricoh: number;
    };
  };
  schools: {
    external: Array<{ unidadeEscolar: string; _count: { id: number } }>;
    internal: Array<{ setorId: string; _count: { id: number } }>;
  };
  problems: {
    common: Array<{ problema: string; _count: { id: number } }>;
    status: Array<{ status: string; _count: { id: number } }>;
  };
  memorandums: {
    byType: Array<{ type: string; _count: { id: number } }>;
    bySchool: Array<{ schoolName: string; _count: { id: number } }>;
  };
  connectivity: {
    redeBr: { sim: number; nao: number };
    educacaoConectada: { sim: number; nao: number };
    naoHaProvedor: { sim: number; nao: number };
  };
}

const AdvancedStatisticsPage: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'temporal' | 'equipment' | 'performance'>('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    period: '12months',
    startDate: '',
    endDate: '',
    technician: '',
    school: '',
    status: '',
    osType: ''
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async (filterParams?: FiltersState) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filterParams) {
        Object.entries(filterParams).forEach(([key, value]) => {
          if (value && value !== '') {
            params.append(key, value);
          }
        });
      }
      
      const response = await fetch(`/api/advanced-statistics?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
    fetchStatistics(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FiltersState = {
      period: '12months',
      startDate: '',
      endDate: '',
      technician: '',
      school: '',
      status: '',
      osType: ''
    };
    setFilters(defaultFilters);
    fetchStatistics(defaultFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Erro ao carregar dados</p>
      </div>
    );
  }

  // Configurações dos gráficos - com verificação de segurança
  const temporalChartData = data.temporal ? {
    labels: data.temporal.internalOS?.map(item => item.month) || [],
    datasets: [
      {
        label: 'OS Internas',
        data: data.temporal.internalOS?.map(item => item.count) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'OS Externas (Novas)',
        data: data.temporal.osExterna?.map(item => item.count) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
      },
      {
        label: 'OS (Antigas)',
        data: data.temporal.os?.map(item => item.count) || [],
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        tension: 0.1,
      },
      {
        label: 'OS Assinadas',
        data: data.temporal.osAssinada?.map(item => item.count) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Memorandos',
        data: data.temporal.memorandums?.map(item => item.count) || [],
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.1,
      }
    ]
  } : { labels: [], datasets: [] };

  const equipmentChartData = data.equipment ? {
    labels: ['PCs', 'Notebooks', 'Monitores', 'Tablets'],
    datasets: [{
      data: [
        data.equipment?.totalPCs || 0,
        data.equipment?.totalNotebooks || 0,
        data.equipment?.totalMonitors || 0,
        data.equipment?.totalTablets || 0
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderWidth: 0
    }]
  } : { labels: [], datasets: [] };

  const statusChartData = data.problems?.status ? {
    labels: data.problems.status.map(item => item.status),
    datasets: [{
      data: data.problems.status.map(item => item._count.id),
      backgroundColor: [
        'rgba(245, 158, 11, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderWidth: 0
    }]
  } : { labels: [], datasets: [] };

  const connectivityChartData = data.connectivity ? {
    labels: ['Rede BR', 'Educação Conectada', 'Sem Provedor'],
    datasets: [
      {
        label: 'Sim',
        data: [
          data.connectivity.redeBr?.sim || 0,
          data.connectivity.educacaoConectada?.sim || 0,
          data.connectivity.naoHaProvedor?.sim || 0
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
      {
        label: 'Não',
        data: [
          data.connectivity.redeBr?.nao || 0,
          data.connectivity.educacaoConectada?.nao || 0,
          data.connectivity.naoHaProvedor?.nao || 0
        ],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      }
    ]
  } : { labels: [], datasets: [] };

  // Componente KPI Card
  const KPICard = ({ title, value, icon: Icon, color = 'blue', subtitle }: any) => (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard de Estatísticas Avançadas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Análise completa do sistema CSDT com insights detalhados
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Filter size={18} />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros Avançados</h3>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <RefreshCw size={14} />
                Limpar Filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro de Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Período
                </label>
                <select
                  value={filters.period}
                  onChange={(e) => {
                    const newFilters = { ...filters, period: e.target.value };
                    if (e.target.value !== 'custom') {
                      newFilters.startDate = '';
                      newFilters.endDate = '';
                    }
                    handleFilterChange(newFilters);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30days">Últimos 30 dias</option>
                  <option value="3months">Últimos 3 meses</option>
                  <option value="6months">Últimos 6 meses</option>
                  <option value="12months">Últimos 12 meses</option>
                  <option value="custom">Período personalizado</option>
                </select>
              </div>

              {/* Datas personalizadas */}
              {filters.period === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange({ ...filters, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange({ ...filters, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Filtro de Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Assinado">Assinado</option>
                </select>
              </div>

              {/* Filtro de Tipo de OS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de OS
                </label>
                <select
                  value={filters.osType}
                  onChange={(e) => handleFilterChange({ ...filters, osType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os tipos</option>
                  <option value="internal">OS Internas</option>
                  <option value="external">OS Externas (Novas)</option>
                  <option value="old">OS Antigas</option>
                  <option value="signed">OS Assinadas</option>
                </select>
              </div>

              {/* Filtro de Técnico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Técnico
                </label>
                <input
                  type="text"
                  placeholder="Nome do técnico"
                  value={filters.technician}
                  onChange={(e) => handleFilterChange({ ...filters, technician: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filtro de Escola */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Escola
                </label>
                <input
                  type="text"
                  placeholder="Nome da escola"
                  value={filters.school}
                  onChange={(e) => handleFilterChange({ ...filters, school: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Indicador de filtros ativos */}
            {(filters.technician || filters.school || filters.status || filters.osType || filters.period !== '12months') && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Filtros ativos:</span>
                {filters.period !== '12months' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                    {filters.period === 'custom' ? 'Período personalizado' : filters.period}
                    <button onClick={() => handleFilterChange({ ...filters, period: '12months', startDate: '', endDate: '' })}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs rounded-full">
                    Status: {filters.status}
                    <button onClick={() => handleFilterChange({ ...filters, status: '' })}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.osType && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                    Tipo: {filters.osType}
                    <button onClick={() => handleFilterChange({ ...filters, osType: '' })}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.technician && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 text-xs rounded-full">
                    Técnico: {filters.technician}
                    <button onClick={() => handleFilterChange({ ...filters, technician: '' })}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filters.school && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300 text-xs rounded-full">
                    Escola: {filters.school}
                    <button onClick={() => handleFilterChange({ ...filters, school: '' })}>
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: PieChart },
              { id: 'temporal', label: 'Análise Temporal', icon: TrendingUp },
              { id: 'equipment', label: 'Equipamentos', icon: Monitor },
              { id: 'performance', label: 'Performance', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total de OS"
                value={(data.kpis?.totalAllOS || 0).toLocaleString()}
                subtitle="Todas as categorias"
                icon={FileText}
                color="blue"
              />
              <KPICard
                title="OS Externas (Novas) Assinadas"
                value={`${data.kpis?.resolutionRate || 0}%`}
                subtitle="Percentual de OS assinadas eletronicamente"
                icon={CheckCircle}
                color="green"
              />
              <KPICard
                title="OS Externas (Novas) Pendentes"
                value={`${data.kpis?.pendingRate || 0}%`}
                subtitle="Percentual aguardando assinatura"
                icon={Clock}
                color="yellow"
              />
              <KPICard
                title="Memorandos"
                value={(data.kpis?.totalMemorandums || 0).toLocaleString()}
                subtitle="Total gerados"
                icon={Package}
                color="purple"
              />
            </div>

            {/* Breakdown por tipo de OS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="OS Internas"
                value={(data.kpis?.totalInternalOS || 0).toLocaleString()}
                icon={Users}
                color="indigo"
              />
              <KPICard
                title="OS Externas (Novas) - Total"
                value={(data.kpis?.totalOSExterna || 0).toLocaleString()}
                icon={School}
                color="teal"
              />
              <KPICard
                title="OS Externas (Antigas) - Pendentes"
                value={(data.kpis?.totalOS || 0).toLocaleString()}
                icon={FileText}
                color="gray"
              />
              <KPICard
                title="OS Assinadas"
                value={(data.kpis?.totalOsAssinada || 0).toLocaleString()}
                icon={CheckCircle}
                color="green"
              />
            </div>

            {/* Gráficos de Status e Equipamentos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Status das OS Externas
                </h3>
                <div className="h-64">
                  <Doughnut 
                    data={statusChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Distribuição de Equipamentos
                </h3>
                <div className="h-64">
                  <Pie 
                    data={equipmentChartData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Temporal Tab */}
        {activeTab === 'temporal' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Evolução Temporal (Últimos 12 meses)
              </h3>
              <div className="h-96">
                <Line 
                  data={temporalChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Top Escolas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Escolas com Mais OS Externas
                </h3>
                <div className="space-y-3">
                  {(data.schools?.external || []).slice(0, 5).map((school, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {school.unidadeEscolar}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {school._count.id} OS
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Problemas Mais Comuns
                </h3>
                <div className="space-y-3">
                  {(data.problems?.common || []).slice(0, 5).map((problem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {problem.problema}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {problem._count.id} ocorrências
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-8">
            {/* Equipamentos Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total de PCs"
                value={(data.equipment?.totalPCs || 0).toLocaleString()}
                icon={Monitor}
                color="blue"
              />
              <KPICard
                title="Total de Notebooks"
                value={(data.equipment?.totalNotebooks || 0).toLocaleString()}
                icon={Monitor}
                color="green"
              />
              <KPICard
                title="Total de Monitores"
                value={(data.equipment?.totalMonitors || 0).toLocaleString()}
                icon={Monitor}
                color="yellow"
              />
              <KPICard
                title="Total de Tablets"
                value={(data.equipment?.totalTablets || 0).toLocaleString()}
                icon={Monitor}
                color="purple"
              />
            </div>

            {/* Laboratórios e Impressoras */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Escolas por Tipo de Laboratório
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Com Laboratório</span>
                    <span className="font-semibold text-green-600">{data.equipment?.schoolsWithLab || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sem Laboratório</span>
                    <span className="font-semibold text-red-600">{data.equipment?.schoolsWithoutLab || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Impressoras por Marca
                </h3>
                <div className="space-y-4">
                  {Object.entries(data.equipment?.printerStats || {}).map(([brand, count]) => (
                    <div key={brand} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{brand}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Conectividade */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Análise de Conectividade
              </h3>
              <div className="h-64">
                <Bar 
                  data={connectivityChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-8">
            {/* Performance dos Técnicos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Top Técnicos - OS Internas
                </h3>
                <div className="space-y-3">
                  {(data.technicians?.internal || []).slice(0, 5).map((tech, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tech.displayName}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tech._count.id} OS
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Top Técnicos - OS Externas
                </h3>
                <div className="space-y-3">
                  {(data.technicians?.external || []).slice(0, 5).map((tech, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tech.tecnicoResponsavel}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tech._count.id} OS
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Top Técnicos - OS Antigas
                </h3>
                <div className="space-y-3">
                  {(data.technicians?.os || []).slice(0, 5).map((tech, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tech.tecnicoResponsavel}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tech._count.id} OS
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Análise de Memorandos
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Por Tipo</h4>
                    {(data.memorandums?.byType || []).map((memo, index) => (
                      <div key={index} className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{memo.type}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{memo._count.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Escolas Memorandos */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Escolas que Mais Recebem Memorandos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data.memorandums?.bySchool || []).slice(0, 6).map((school, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {school.schoolName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {school._count.id} memorandos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedStatisticsPage;