import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TreeStructure, 
  Buildings, 
  Laptop, 
  CalendarBlank, 
  MapPin,
  Clock,
  Trash,
  CaretDown,
  CaretRight,
  ChartBar
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

interface GroupedData {
  [key: string]: Item[];
}

interface SmartGroupingProps {
  items: Item[];
  schools: any[];
  onHistoryClick: (item: Item) => void;
  onDeleteClick: (item: Item) => void;
  userId: string | null;
  groupBy: 'school' | 'type' | 'status' | 'date' | 'district';
  onGroupByChange: (groupBy: 'school' | 'type' | 'status' | 'date' | 'district') => void;
}

const SmartGrouping: React.FC<SmartGroupingProps> = ({
  items,
  schools,
  onHistoryClick,
  onDeleteClick,
  userId,
  groupBy,
  onGroupByChange
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(true);

  // Agrupar itens baseado no critério selecionado
  const groupedData = useMemo<GroupedData>(() => {
    const groups: GroupedData = {};

    items.forEach(item => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'school':
          groupKey = item.School?.name || 'Sem Escola';
          break;
          
        case 'type':
          const itemName = item.name.toUpperCase();
          if (itemName.includes('COMPUTADOR')) groupKey = 'COMPUTADORES';
          else if (itemName.includes('NOTEBOOK')) groupKey = 'NOTEBOOKS';
          else if (itemName.includes('MONITOR')) groupKey = 'MONITORES';
          else if (itemName.includes('MOUSE')) groupKey = 'MOUSES';
          else if (itemName.includes('TECLADO')) groupKey = 'TECLADOS';
          else if (itemName.includes('ESTABILIZADOR')) groupKey = 'ESTABILIZADORES';
          else if (itemName.includes('IMPRESSORA')) groupKey = 'IMPRESSORAS';
          else groupKey = 'OUTROS';
          break;
          
        case 'status':
          if (item.School?.name === 'CSDT') groupKey = '📦 No Depósito (CSDT)';
          else if (item.School?.name === 'CHADA') groupKey = '🔧 Em Manutenção (CHADA)';
          else groupKey = '🏫 Em Operação nas Escolas';
          break;
          
        case 'date':
          const date = new Date(item.createdAt);
          groupKey = format(date, 'MMMM yyyy', { locale: ptBR });
          groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
          break;
          
        case 'district':
          const school = schools.find(s => s.name === item.School?.name);
          groupKey = school?.district || 'Sem Distrito';
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    // Ordenar os grupos
    const sortedGroups: GroupedData = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Ordenação especial para datas
      if (groupBy === 'date') {
        return b.localeCompare(a); // Mais recente primeiro
      }
      
      // Ordenação especial para status
      if (groupBy === 'status') {
        const order = ['🏫 Em Operação nas Escolas', '📦 No Depósito (CSDT)', '🔧 Em Manutenção (CHADA)'];
        return order.indexOf(a) - order.indexOf(b);
      }
      
      // Ordenação por quantidade (decrescente) para outros casos
      return groups[b].length - groups[a].length;
    });

    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return sortedGroups;
  }, [items, schools, groupBy]);

  // Estatísticas dos grupos
  const groupStats = useMemo(() => {
    const stats = Object.entries(groupedData).map(([groupName, groupItems]) => ({
      name: groupName,
      count: groupItems.length,
      percentage: ((groupItems.length / items.length) * 100).toFixed(1),
      lastUpdate: groupItems.length > 0 
        ? format(new Date(Math.max(...groupItems.map(item => new Date(item.createdAt).getTime()))), 'dd/MM/yyyy', { locale: ptBR })
        : 'N/A'
    }));

    return stats;
  }, [groupedData, items.length]);

  // Toggle expansão do grupo
  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // Expandir/colapsar todos
  const toggleAllGroups = () => {
    if (expandedGroups.size === Object.keys(groupedData).length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(Object.keys(groupedData)));
    }
  };

  // Ícones para diferentes tipos de agrupamento
  const getGroupIcon = (groupBy: string) => {
    switch (groupBy) {
      case 'school': return <Buildings size={20} />;
      case 'type': return <Laptop size={20} />;
      case 'status': return <MapPin size={20} />;
      case 'date': return <CalendarBlank size={20} />;
      case 'district': return <MapPin size={20} />;
      default: return <TreeStructure size={20} />;
    }
  };

  // Cores para diferentes grupos
  const getGroupColor = (groupName: string, index: number) => {
    if (groupName.includes('CHADA') || groupName.includes('Manutenção')) {
      return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
    }
    if (groupName.includes('CSDT') || groupName.includes('Depósito')) {
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    }
    if (groupName.includes('Operação')) {
      return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    }
    
    const colors = [
      'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
      'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
      'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
      'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
      'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700'
    ];
    
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* Controles de agrupamento */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            {getGroupIcon(groupBy)}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Agrupamento Inteligente
            </h2>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-800 dark:text-white"
            >
              <option value="school">Por Escola</option>
              <option value="type">Por Tipo de Equipamento</option>
              <option value="status">Por Status</option>
              <option value="date">Por Data de Criação</option>
              <option value="district">Por Distrito</option>
            </select>
            
            <button
              onClick={toggleAllGroups}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
            >
              {expandedGroups.size === Object.keys(groupedData).length ? 'Colapsar Todos' : 'Expandir Todos'}
            </button>
            
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
            >
              <ChartBar size={16} />
              {showStats ? 'Ocultar' : 'Mostrar'} Stats
            </button>
          </div>
        </div>

        {/* Estatísticas dos grupos */}
        {showStats && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groupStats.map((stat, index) => (
              <div
                key={stat.name}
                className={`p-3 rounded-lg border ${getGroupColor(stat.name, index)}`}
              >
                <div className="text-sm font-medium text-gray-800 dark:text-white truncate" title={stat.name}>
                  {stat.name}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {stat.percentage}% do total • Última atualização: {stat.lastUpdate}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grupos de itens */}
      <div className="space-y-3">
        {Object.entries(groupedData).map(([groupName, groupItems], groupIndex) => (
          <div
            key={groupName}
            className={`border rounded-lg overflow-hidden ${getGroupColor(groupName, groupIndex)}`}
          >
            {/* Header do grupo */}
            <button
              onClick={() => toggleGroup(groupName)}
              className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                {expandedGroups.has(groupName) ? (
                  <CaretDown size={20} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <CaretRight size={20} className="text-gray-600 dark:text-gray-400" />
                )}
                
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {groupName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {groupItems.length} {groupItems.length === 1 ? 'equipamento' : 'equipamentos'}
                    {groupItems.length > 0 && (
                      <span className="ml-2">
                        • Última adição: {format(new Date(groupItems[0].createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {groupItems.length}
              </div>
            </button>

            {/* Itens do grupo */}
            {expandedGroups.has(groupName) && (
              <div className="border-t border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-zinc-800/50">
                <div className="p-4 space-y-3">
                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-semibold text-gray-800 dark:text-white">
                              {item.name}
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <p>
                                <span className="font-medium">Marca:</span> {item.brand} • 
                                <span className="font-medium"> Série:</span> {item.serialNumber}
                              </p>
                              <p>
                                <span className="font-medium">Escola:</span> {item.School?.name} • 
                                <span className="font-medium"> Criado:</span> {format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: ptBR })} • 
                                <span className="font-medium"> Por:</span> {item.Profile?.displayName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => onHistoryClick(item)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Ver Histórico"
                        >
                          <Clock size={20} />
                        </button>
                        {item.Profile?.userId === userId && (
                          <button
                            onClick={() => onDeleteClick(item)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Deletar Item"
                          >
                            <Trash size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(groupedData).length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <TreeStructure size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum equipamento encontrado para agrupar</p>
        </div>
      )}
    </div>
  );
};

export default SmartGrouping;