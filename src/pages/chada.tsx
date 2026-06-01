import React from "react";
import {
  CheckCircle,
  Package,
  Wrench,
  Clock,
  Calendar,
  Search,
  Plus,
  X,
  FileText,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Download,
  RefreshCw,
  Printer,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useChada } from "@/hooks/useChada";
import type { ChadaItem, ChadaStatus, TabType, SortField, DiagnosticStatus } from "@/hooks/useChada";
import ChadaItemsList from "@/components/Chada/ChadaItemsList";
import ChadaDiagnostics from "@/components/Chada/ChadaDiagnostics";
import ChadaModals from "@/components/Chada/ChadaModals";

const ChadaPage: React.FC = () => {
  const ctx = useChada();

  // UI rendering helpers
  const renderTimeline = (item: ChadaItem) => {
    const steps = [
      { status: 'PENDENTE', label: 'Enviado', icon: Package },
      { status: 'RECEBIDO', label: 'Recebido', icon: CheckCircle },
      { status: 'EM_ANALISE', label: 'Em Análise', icon: Wrench },
      { status: 'CONSERTADO', label: 'Finalizado', icon: CheckCircle }
    ];

    const currentIndex = steps.findIndex(step => step.status === item.statusChada);

    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.status} className="flex items-center">
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-full border-2
                ${isActive
                  ? isCurrent
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-green-500 border-green-500 text-white'
                  : 'bg-gray-200 border-gray-300 text-gray-400'
                }
              `}>
                <Icon size={12} />
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSortButton = (field: SortField, label: string) => {
    const isActive = ctx.sortField === field;
    const Icon = isActive
      ? (ctx.sortDirection === 'asc' ? ChevronUp : ChevronDown)
      : ChevronDown;

    return (
      <button
        onClick={() => ctx.handleSort(field)}
        className={`
          flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors
          ${isActive
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'text-gray-600 hover:bg-gray-100'
          }
        `}
      >
        <span>{label}</span>
        <Icon size={12} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
      </button>
    );
  };

  const handleOpenBaixa = (item: ChadaItem) => {
    ctx.setBaixaItemId(item.id);
    ctx.setShowBaixaModal(true);
    ctx.setNovoModelo("");
    ctx.setNovoSerial("");
    ctx.setChadaStatus('CONSERTADO');
    ctx.setObservacoes("");
  };

  // Loading skeleton
  if (ctx.loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Controle CHADA</h1>
          <p className="text-gray-600">Gestão de equipamentos enviados para conserto</p>
        </div>

        {/* Alerta para itens antigos */}
        {ctx.stats.itensComAlerta > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-xl">
            <div className="flex items-center">
              <AlertCircle size={20} className="text-red-500 mr-2" />
              <div>
                <p className="text-red-800 font-medium">
                  Atenção! {ctx.stats.itensComAlerta} {ctx.stats.itensComAlerta === 1 ? 'item está' : 'itens estão'} há mais de 15 dias na CHADA
                </p>
                <p className="text-red-600 text-sm">Verifique se é necessário tomar alguma ação</p>
              </div>
            </div>
          </div>
        )}

        {/* Alerta para diagnósticos atrasados (3+ dias) */}
        {ctx.diagnostics.filter(d => d.isDelayed && d.status === 'AGUARDANDO_PECA').length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-xl">
            <div className="flex items-center">
              <Printer size={20} className="text-orange-500 mr-2" />
              <div>
                <p className="text-orange-800 font-medium">
                  🚨 {ctx.diagnostics.filter(d => d.isDelayed && d.status === 'AGUARDANDO_PECA').length} impressora(s) aguardando peças há mais de 3 dias!
                </p>
                <p className="text-orange-600 text-sm">
                  Verifique o status das peças solicitadas na aba "Diagnósticos"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <ClipboardList size={20} className="text-gray-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{ctx.stats.totalEnviados}</p>
                <p className="text-sm text-gray-600">Total Enviados</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Package size={20} className="text-orange-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{ctx.stats.naChada}</p>
                <p className="text-sm text-gray-600">Na CHADA</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <CheckCircle size={20} className="text-green-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-green-600">{ctx.stats.devolvidos}</p>
                <p className="text-sm text-gray-600">Devolvidos</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Clock size={20} className="text-blue-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{ctx.stats.tempoMedioDias}</p>
                <p className="text-sm text-gray-600">Dias Médios</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Printer size={20} className="text-purple-500 mr-2" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {ctx.diagnostics.filter(d => d.status === 'AGUARDANDO_PECA').length}
                </p>
                <p className="text-sm text-gray-600">Esperando Peças</p>
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-xl border border-gray-200 dark:border-zinc-700 p-1 mb-6 shadow-sm">
          <div className="grid grid-cols-4 gap-1">
            {[
              { key: 'na_chada', label: 'Na CHADA', count: ctx.stats.naChada, icon: '📦', color: 'orange' },
              { key: 'devolvidos', label: 'Devolvidos', count: ctx.stats.devolvidos, icon: '✅', color: 'green' },
              { key: 'todos', label: 'Todos', count: ctx.stats.totalEnviados, icon: '📊', color: 'blue' },
              { key: 'diagnosticos', label: 'Diagnósticos', count: ctx.diagnostics.length, icon: '🔧', color: 'purple', alert: ctx.diagnostics.filter(d => d.isDelayed && d.status === 'AGUARDANDO_PECA').length > 0 }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => ctx.setActiveTab(tab.key as TabType)}
                className={`
                  relative flex flex-col items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200
                  ${ctx.activeTab === tab.key
                    ? tab.color === 'orange' ? 'bg-orange-500 text-white shadow-md' :
                      tab.color === 'green' ? 'bg-green-500 text-white shadow-md' :
                      tab.color === 'blue' ? 'bg-blue-500 text-white shadow-md' :
                      'bg-purple-500 text-white shadow-md'
                    : `bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200`
                  }
                `}
              >
                {tab.alert && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
                <span className="text-lg">{tab.icon}</span>
                <div className="text-center">
                  <div className="text-sm font-semibold leading-tight">{tab.label}</div>
                  <div className={`text-xs mt-1 ${ctx.activeTab === tab.key ? 'text-white/90' : 'text-gray-500'}`}>
                    ({tab.count})
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Ações Rápidas */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => { ctx.setModalIsOpen(true); ctx.fetchAllItems(); }}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Enviar para CHADA</span>
                <span className="sm:hidden">Enviar</span>
              </button>

              <button
                onClick={() => ctx.setShowDiagnosticModal(true)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm sm:text-base"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Novo Diagnóstico</span>
                <span className="sm:hidden">Diagnóstico</span>
              </button>

              <button
                onClick={ctx.handleRefresh}
                disabled={ctx.refreshing}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <RefreshCw size={16} className={ctx.refreshing ? 'animate-spin' : ''} />
                {ctx.refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>

              <div className="flex gap-2 flex-1 sm:flex-initial">
                <button
                  onClick={ctx.handleCheckEmails}
                  disabled={ctx.checkingEmails}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm flex-1 sm:flex-initial disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Verificar emails da CHADA e capturar números de OS"
                >
                  <span className="text-lg">{ctx.checkingEmails ? '⏳' : '📧'}</span>
                  <span className="hidden sm:inline">{ctx.checkingEmails ? 'Verificando...' : 'Verificar Emails'}</span>
                  <span className="sm:hidden">{ctx.checkingEmails ? '...' : 'Email'}</span>
                </button>

                <button
                  onClick={ctx.exportOSImpressoras}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm flex-1 sm:flex-initial"
                  title="Exportar planilha OS Impressoras (BASE SME)"
                >
                  <span className="text-lg">🖨️</span>
                  <span className="hidden sm:inline">OS Impressoras</span>
                  <span className="sm:hidden">OS</span>
                </button>

                <button
                  onClick={ctx.exportToExcel}
                  className="relative flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex-1 sm:flex-initial"
                  title={ctx.getActiveFiltersCount() > 0
                    ? `Exportar relatório com ${ctx.getActiveFiltersCount()} filtro(s) aplicado(s)`
                    : "Exportar relatório completo em Excel"}
                >
                  {ctx.getActiveFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      {ctx.getActiveFiltersCount()}
                    </span>
                  )}
                  <span className="text-lg">📊</span>
                  <span className="hidden sm:inline">Exportar Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>

                <button
                  onClick={ctx.exportToCSV}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm flex-1 sm:flex-initial"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </button>

                <button
                  onClick={ctx.exportToPDF}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex-1 sm:flex-initial"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              </div>
            </div>

            {/* Busca */}
            <div className="w-full">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={ctx.searchTerm}
                  onChange={(e) => ctx.setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Indicador de Filtros Ativos */}
            {ctx.getActiveFiltersCount() > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {ctx.getActiveFiltersCount()} {ctx.getActiveFiltersCount() === 1 ? 'filtro ativo' : 'filtros ativos'}
                    </span>
                    <span className="text-sm text-blue-700">
                      Mostrando {ctx.filteredAndSortedItems.length} de {ctx.items.length} itens
                    </span>
                  </div>
                  <button
                    onClick={ctx.resetFilters}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    <X size={16} />
                    Limpar Todos
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ctx.getActiveFiltersResume().map((filter: string, index: number) => (
                    <span key={index} className="bg-white border border-blue-300 text-blue-800 px-2 py-1 rounded text-xs">
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filtros Rápidos */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">🚀 Filtros Rápidos</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { key: 'none', label: 'Todos', color: 'gray-700' },
                  { key: 'alert', label: '⚠️ Com Alerta', color: 'red-500' },
                  { key: 'withOS', label: '📋 Com OS', color: 'green-500' },
                  { key: 'withoutOS', label: '📋 Sem OS', color: 'orange-500' },
                  { key: 'emailSent', label: '📧 Email Enviado', color: 'blue-500' },
                  { key: 'emailNotSent', label: '📧 Sem Email', color: 'purple-500' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => ctx.setQuickFilter(f.key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      ctx.quickFilter === f.key
                        ? `bg-${f.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtros Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Setor</label>
                <select value={ctx.sectorFilter} onChange={(e) => ctx.setSectorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="all">Todos os Setores</option>
                  {ctx.uniqueSectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Status CHADA</label>
                <select value={ctx.statusFilter} onChange={(e) => ctx.setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="all">Todos os Status</option>
                  {ctx.uniqueStatus.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de Item</label>
                <select value={ctx.itemTypeFilter} onChange={(e) => ctx.setItemTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="all">Todos os Tipos</option>
                  <option value="impressora">🖨️ Impressora</option>
                  <option value="computador">💻 Computador</option>
                  <option value="notebook">💼 Notebook</option>
                  <option value="monitor">🖥️ Monitor</option>
                  <option value="projetor">📽️ Projetor</option>
                  <option value="outros">📦 Outros</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tempo na CHADA</label>
                <select value={ctx.daysInChadaFilter} onChange={(e) => ctx.setDaysInChadaFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                  <option value="all">Qualquer tempo</option>
                  <option value="<15">⚡ Menos de 15 dias</option>
                  <option value=">15">⚠️ Mais de 15 dias</option>
                  <option value=">30">🔴 Mais de 30 dias</option>
                </select>
              </div>
            </div>

            {/* Filtro de Período */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">📅 Período de Envio</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {['all', '7', '15', '30', '60', 'custom'].map(p => (
                  <button
                    key={p}
                    onClick={() => ctx.setPeriodFilter(p)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      ctx.periodFilter === p
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p === 'all' ? 'Todos' : p === 'custom' ? 'Personalizado' : `${p} dias`}
                  </button>
                ))}
              </div>

              {ctx.periodFilter === 'custom' && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Data Início</label>
                    <input type="date" value={ctx.customStartDate} onChange={(e) => ctx.setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Data Fim</label>
                    <input type="date" value={ctx.customEndDate} onChange={(e) => ctx.setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                  </div>
                </div>
              )}
            </div>

            {/* Ordenação */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <div className="flex flex-wrap gap-1">
                {renderSortButton('createdAt', 'Envio')}
                {renderSortButton('updatedAt', 'Atualização')}
                {renderSortButton('sector', 'Setor')}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        {ctx.activeTab === 'diagnosticos' ? (
          <ChadaDiagnostics
            diagnostics={ctx.diagnostics}
            loadingDiagnostics={ctx.loadingDiagnostics}
            onUpdateDiagnosticStatus={ctx.handleUpdateDiagnosticStatus}
          />
        ) : (
          <ChadaItemsList
            filteredAndSortedItems={ctx.filteredAndSortedItems}
            items={ctx.items}
            activeTab={ctx.activeTab}
            searchTerm={ctx.searchTerm}
            sectorFilter={ctx.sectorFilter}
            statusFilter={ctx.statusFilter}
            stats={ctx.stats}
            getDaysInChada={ctx.getDaysInChada}
            needsAlert={ctx.needsAlert}
            getStatusBadge={ctx.getStatusBadge}
            resetFilters={ctx.resetFilters}
            renderTimeline={renderTimeline}
            onUpdateStatus={handleOpenBaixa}
            onPrintOS={ctx.handlePrintOS}
            onUploadOS={ctx.handleUploadOS}
            onCancel={ctx.openCancelModal}
            onEdit={ctx.openEditModal}
            onSendPhoto={ctx.openSendPhotoModal}
          />
        )}
      </div>

      {/* Modals */}
      <ChadaModals
        modalIsOpen={ctx.modalIsOpen} setModalIsOpen={ctx.setModalIsOpen}
        allItems={ctx.allItems} selectedItem={ctx.selectedItem} setSelectedItem={ctx.setSelectedItem}
        problem={ctx.problem} setProblem={ctx.setProblem}
        sector={ctx.sector} setSector={ctx.setSector}
        manutencaoSemMovimentacao={ctx.manutencaoSemMovimentacao} setManutencaoSemMovimentacao={ctx.setManutencaoSemMovimentacao}
        semSerial={ctx.semSerial} setSemSerial={ctx.setSemSerial}
        itemNameSemSerial={ctx.itemNameSemSerial} setItemNameSemSerial={ctx.setItemNameSemSerial}
        itemTypeSemSerial={ctx.itemTypeSemSerial} setItemTypeSemSerial={ctx.setItemTypeSemSerial}
        itemBrandSemSerial={ctx.itemBrandSemSerial} setItemBrandSemSerial={ctx.setItemBrandSemSerial}
        chadaPhoto={ctx.chadaPhoto} setChadaPhoto={ctx.setChadaPhoto}
        handleAddToChada={ctx.handleAddToChada}
        showBaixaModal={ctx.showBaixaModal} setShowBaixaModal={ctx.setShowBaixaModal}
        baixaItemId={ctx.baixaItemId} setBaixaItemId={ctx.setBaixaItemId}
        novoModelo={ctx.novoModelo} setNovoModelo={ctx.setNovoModelo}
        novoSerial={ctx.novoSerial} setNovoSerial={ctx.setNovoSerial}
        chadaStatus={ctx.chadaStatus} setChadaStatus={ctx.setChadaStatus}
        observacoes={ctx.observacoes} setObservacoes={ctx.setObservacoes}
        userName={ctx.userName} setItems={ctx.setItems}
        showDiagnosticModal={ctx.showDiagnosticModal} setShowDiagnosticModal={ctx.setShowDiagnosticModal}
        printers={ctx.printers} sectors={ctx.sectors}
        selectedPrinter={ctx.selectedPrinter} setSelectedPrinter={ctx.setSelectedPrinter}
        selectedSector={ctx.selectedSector} setSelectedSector={ctx.setSelectedSector}
        technicianChada={ctx.technicianChada} setTechnicianChada={ctx.setTechnicianChada}
        diagnostic={ctx.diagnostic} setDiagnostic={ctx.setDiagnostic}
        requestedPart={ctx.requestedPart} setRequestedPart={ctx.setRequestedPart}
        handleAddDiagnostic={ctx.handleAddDiagnostic}
        showCsdtWarningModal={ctx.showCsdtWarningModal} setShowCsdtWarningModal={ctx.setShowCsdtWarningModal}
        showEditModal={ctx.showEditModal} setShowEditModal={ctx.setShowEditModal}
        editItemId={ctx.editItemId} setEditItemId={ctx.setEditItemId}
        editProblem={ctx.editProblem} setEditProblem={ctx.setEditProblem}
        editSector={ctx.editSector} setEditSector={ctx.setEditSector}
        editSemSerial={ctx.editSemSerial} setEditSemSerial={ctx.setEditSemSerial}
        editSelectedItem={ctx.editSelectedItem} setEditSelectedItem={ctx.setEditSelectedItem}
        editItemNameSemSerial={ctx.editItemNameSemSerial} setEditItemNameSemSerial={ctx.setEditItemNameSemSerial}
        editItemTypeSemSerial={ctx.editItemTypeSemSerial} setEditItemTypeSemSerial={ctx.setEditItemTypeSemSerial}
        editItemBrandSemSerial={ctx.editItemBrandSemSerial} setEditItemBrandSemSerial={ctx.setEditItemBrandSemSerial}
        handleCorrectChada={ctx.handleCorrectChada}
        showCancelModal={ctx.showCancelModal} setShowCancelModal={ctx.setShowCancelModal}
        cancelItemId={ctx.cancelItemId} setCancelItemId={ctx.setCancelItemId}
        cancelLoading={ctx.cancelLoading}
        handleCancelChada={ctx.handleCancelChada}
        // Send Photo modal
        showSendPhotoModal={ctx.showSendPhotoModal}
        setShowSendPhotoModal={ctx.setShowSendPhotoModal}
        sendPhotoItemId={ctx.sendPhotoItemId}
        setSendPhotoItemId={ctx.setSendPhotoItemId}
        sendPhotoFile={ctx.sendPhotoFile}
        setSendPhotoFile={ctx.setSendPhotoFile}
        sendingPhoto={ctx.sendingPhoto}
        handleSendPhoto={ctx.handleSendPhoto}
      />
    </div>
  );
};

export default function ProtectedChadaPage() {
  return (
    <ProtectedRoute>
      <ChadaPage />
    </ProtectedRoute>
  );
}

export const getServerSideProps = async () => ({ props: {} });
