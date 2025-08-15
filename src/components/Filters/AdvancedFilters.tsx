import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Select from 'react-select';
import { 
  FunnelSimple, 
  X, 
  FloppyDisk, 
  Trash,
  CalendarBlank,
  MagnifyingGlass,
  SortAscending,
  FileArrowDown
} from 'phosphor-react';

interface Item {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  createdAt: string;
  inep: string;
  Profile: {
    displayName: string;
    userId: string;
  };
  School: {
    name: string;
  };
}

interface FilterOptions {
  searchTerm: string;
  selectedSchools: string[];
  selectedTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
  createdBy: string[];
  status: 'all' | 'csdt' | 'schools' | 'chada';
  sortBy: 'name' | 'date' | 'school' | 'type';
  sortOrder: 'asc' | 'desc';
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  createdAt: string;
}

interface AdvancedFiltersProps {
  items: Item[];
  schools: any[];
  onFiltersChange: (filteredItems: Item[], activeFilters: FilterOptions) => void;
  onFilterSave?: (savedFilters: SavedFilter[]) => void;
  onGenerateReport?: (filteredItems: Item[], filters: FilterOptions) => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  items,
  schools,
  onFiltersChange,
  onFilterSave,
  onGenerateReport
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    selectedSchools: [],
    selectedTypes: [],
    dateRange: { start: '', end: '' },
    createdBy: [],
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('deviceFilters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar filtros salvos:', error);
      }
    }
  }, []);

  // Opções para selects
  const schoolOptions = schools.map(school => ({
    value: school.name,
    label: school.name
  }));

  const typeOptions = [
    { value: 'COMPUTADOR', label: 'Computador' },
    { value: 'NOTEBOOK', label: 'Notebook' },
    { value: 'MONITOR', label: 'Monitor' },
    { value: 'MOUSE', label: 'Mouse' },
    { value: 'TECLADO', label: 'Teclado' },
    { value: 'ESTABILIZADOR', label: 'Estabilizador' },
    { value: 'IMPRESSORA', label: 'Impressora' }
  ];

  const createdByOptions = [...new Set(items.map(item => item.Profile?.displayName))]
    .filter(Boolean)
    .map(name => ({ value: name, label: name }));

  const sortOptions = [
    { value: 'name', label: 'Nome' },
    { value: 'date', label: 'Data de Criação' },
    { value: 'school', label: 'Escola' },
    { value: 'type', label: 'Tipo' }
  ];

  // Função para aplicar filtros
  const applyFilters = useCallback(() => {
    let filteredItems = [...items];

    // Filtro de texto
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower) ||
        item.serialNumber.toLowerCase().includes(searchLower) ||
        item.School?.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por escola
    if (filters.selectedSchools.length > 0) {
      filteredItems = filteredItems.filter(item =>
        filters.selectedSchools.includes(item.School?.name)
      );
    }

    // Filtro por tipo de equipamento
    if (filters.selectedTypes.length > 0) {
      filteredItems = filteredItems.filter(item =>
        filters.selectedTypes.some(type => 
          item.name.toUpperCase().includes(type)
        )
      );
    }

    // Filtro por data
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = startOfDay(parseISO(filters.dateRange.start));
      const endDate = endOfDay(parseISO(filters.dateRange.end));
      
      filteredItems = filteredItems.filter(item => {
        const itemDate = parseISO(item.createdAt);
        return isAfter(itemDate, startDate) && isBefore(itemDate, endDate) || 
               itemDate.getTime() === startDate.getTime() || 
               itemDate.getTime() === endDate.getTime();
      });
    }

    // Filtro por criador
    if (filters.createdBy.length > 0) {
      filteredItems = filteredItems.filter(item =>
        filters.createdBy.includes(item.Profile?.displayName)
      );
    }

    // Filtro por status
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'csdt':
          filteredItems = filteredItems.filter(item => item.School?.name === 'CSDT');
          break;
        case 'chada':
          filteredItems = filteredItems.filter(item => item.School?.name === 'CHADA');
          break;
        case 'schools':
          filteredItems = filteredItems.filter(item => 
            item.School?.name !== 'CSDT' && item.School?.name !== 'CHADA'
          );
          break;
      }
    }

    // Ordenação
    filteredItems.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'school':
          comparison = (a.School?.name || '').localeCompare(b.School?.name || '');
          break;
        case 'type':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    onFiltersChange(filteredItems, filters);
  }, [items, filters]);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Salvar filtro
  const saveFilter = () => {
    if (!filterName.trim()) {
      alert('Por favor, digite um nome para o filtro');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    localStorage.setItem('deviceFilters', JSON.stringify(updatedFilters));
    
    setFilterName('');
    setShowSaveDialog(false);
    onFilterSave?.(updatedFilters);
    
    alert('Filtro salvo com sucesso!');
  };

  // Carregar filtro salvo
  const loadFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
  };

  // Deletar filtro salvo
  const deleteFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedFilters);
    localStorage.setItem('deviceFilters', JSON.stringify(updatedFilters));
    onFilterSave?.(updatedFilters);
  };

  // Limpar todos os filtros
  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      selectedSchools: [],
      selectedTypes: [],
      dateRange: { start: '', end: '' },
      createdBy: [],
      status: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  // Contar filtros ativos
  const activeFiltersCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.selectedSchools.length > 0) count++;
    if (filters.selectedTypes.length > 0) count++;
    if (filters.dateRange.start && filters.dateRange.end) count++;
    if (filters.createdBy.length > 0) count++;
    if (filters.status !== 'all') count++;
    return count;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <FunnelSimple size={20} />
          Filtros Avançados
          {activeFiltersCount() > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {activeFiltersCount()}
            </span>
          )}
        </button>
        
        <div className="flex gap-2">
          {activeFiltersCount() > 0 && (
            <button
              onClick={clearFilters}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Limpar Filtros"
            >
              <X size={20} />
            </button>
          )}
          
          <button
            onClick={() => setShowSaveDialog(true)}
            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
            title="Salvar Filtros Atuais"
          >
            <FloppyDisk size={20} />
          </button>

          {onGenerateReport && activeFiltersCount() > 0 && (
            <button
              onClick={() => {
                let filteredItems = [...items];

                // Aplicar todos os filtros (mesma lógica do useEffect)
                if (filters.searchTerm) {
                  const searchLower = filters.searchTerm.toLowerCase();
                  filteredItems = filteredItems.filter(item =>
                    item.name.toLowerCase().includes(searchLower) ||
                    item.brand.toLowerCase().includes(searchLower) ||
                    item.serialNumber.toLowerCase().includes(searchLower) ||
                    item.School?.name.toLowerCase().includes(searchLower)
                  );
                }

                if (filters.selectedSchools.length > 0) {
                  filteredItems = filteredItems.filter(item =>
                    filters.selectedSchools.includes(item.School?.name)
                  );
                }

                if (filters.selectedTypes.length > 0) {
                  filteredItems = filteredItems.filter(item =>
                    filters.selectedTypes.some(type => 
                      item.name.toUpperCase().includes(type)
                    )
                  );
                }

                if (filters.dateRange.start && filters.dateRange.end) {
                  const startDate = startOfDay(parseISO(filters.dateRange.start));
                  const endDate = endOfDay(parseISO(filters.dateRange.end));
                  
                  filteredItems = filteredItems.filter(item => {
                    const itemDate = parseISO(item.createdAt);
                    return isAfter(itemDate, startDate) && isBefore(itemDate, endDate) || 
                           itemDate.getTime() === startDate.getTime() || 
                           itemDate.getTime() === endDate.getTime();
                  });
                }

                if (filters.createdBy.length > 0) {
                  filteredItems = filteredItems.filter(item =>
                    filters.createdBy.includes(item.Profile?.displayName)
                  );
                }

                if (filters.status !== 'all') {
                  switch (filters.status) {
                    case 'csdt':
                      filteredItems = filteredItems.filter(item => item.School?.name === 'CSDT');
                      break;
                    case 'chada':
                      filteredItems = filteredItems.filter(item => item.School?.name === 'CHADA');
                      break;
                    case 'schools':
                      filteredItems = filteredItems.filter(item => 
                        item.School?.name !== 'CSDT' && item.School?.name !== 'CHADA'
                      );
                      break;
                  }
                }

                // Aplicar ordenação
                filteredItems.sort((a, b) => {
                  let comparison = 0;
                  
                  switch (filters.sortBy) {
                    case 'name':
                      comparison = a.name.localeCompare(b.name);
                      break;
                    case 'date':
                      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      break;
                    case 'school':
                      comparison = (a.School?.name || '').localeCompare(b.School?.name || '');
                      break;
                    case 'type':
                      comparison = a.name.localeCompare(b.name);
                      break;
                  }
                  
                  return filters.sortOrder === 'asc' ? comparison : -comparison;
                });

                onGenerateReport(filteredItems, filters);
              }}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title="Gerar Relatório com Filtros Aplicados"
            >
              <FileArrowDown size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Linha 1 - Busca e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MagnifyingGlass size={16} className="inline mr-1" />
                Buscar
              </label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="Nome, marca, série ou escola..."
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              >
                <option value="all">Todos</option>
                <option value="schools">Em Escolas</option>
                <option value="csdt">No CSDT</option>
                <option value="chada">Na CHADA</option>
              </select>
            </div>
          </div>

          {/* Linha 2 - Escolas e Tipos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Escolas
              </label>
              <Select
                isMulti
                value={schoolOptions.filter(option => filters.selectedSchools.includes(option.value))}
                onChange={(selected) => setFilters(prev => ({ 
                  ...prev, 
                  selectedSchools: selected ? selected.map(s => s.value) : [] 
                }))}
                options={schoolOptions}
                placeholder="Selecionar escolas..."
                className="text-black"
                noOptionsMessage={() => "Nenhuma escola encontrada"}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipos de Equipamento
              </label>
              <Select
                isMulti
                value={typeOptions.filter(option => filters.selectedTypes.includes(option.value))}
                onChange={(selected) => setFilters(prev => ({ 
                  ...prev, 
                  selectedTypes: selected ? selected.map(s => s.value) : [] 
                }))}
                options={typeOptions}
                placeholder="Selecionar tipos..."
                className="text-black"
                noOptionsMessage={() => "Nenhum tipo encontrado"}
              />
            </div>
          </div>

          {/* Linha 3 - Datas e Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CalendarBlank size={16} className="inline mr-1" />
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, start: e.target.value } 
                }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, end: e.target.value } 
                }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Criado por
              </label>
              <Select
                isMulti
                value={createdByOptions.filter(option => filters.createdBy.includes(option.value))}
                onChange={(selected) => setFilters(prev => ({ 
                  ...prev, 
                  createdBy: selected ? selected.map(s => s.value) : [] 
                }))}
                options={createdByOptions}
                placeholder="Selecionar responsáveis..."
                className="text-black"
                noOptionsMessage={() => "Nenhum responsável encontrado"}
              />
            </div>
          </div>

          {/* Linha 4 - Ordenação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <SortAscending size={16} className="inline mr-1" />
                Ordenar por
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ordem
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
            </div>
          </div>

          {/* Filtros Salvos */}
          {savedFilters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtros Salvos
              </label>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map(savedFilter => (
                  <div
                    key={savedFilter.id}
                    className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-lg text-sm"
                  >
                    <button
                      onClick={() => loadFilter(savedFilter)}
                      className="hover:underline"
                      title={`Criado em ${format(parseISO(savedFilter.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
                    >
                      {savedFilter.name}
                    </button>
                    <button
                      onClick={() => deleteFilter(savedFilter.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Deletar filtro"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog para salvar filtro */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Salvar Filtros
            </h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Nome do filtro..."
              className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg mb-4 dark:bg-zinc-700 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && saveFilter()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveFilter}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;