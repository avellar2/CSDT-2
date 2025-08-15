import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Trash, Eye, GridFour, Table, ListBullets } from 'phosphor-react';

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

interface DeviceViewsProps {
  items: Item[];
  viewMode: 'list' | 'grid' | 'table';
  onViewModeChange: (mode: 'list' | 'grid' | 'table') => void;
  onHistoryClick: (item: Item) => void;
  onDeleteClick: (item: Item) => void;
  userId: string | null;
}

const DeviceViews: React.FC<DeviceViewsProps> = ({
  items,
  viewMode,
  onViewModeChange,
  onHistoryClick,
  onDeleteClick,
  userId
}) => {
  // Componente de seletor de visualização
  const ViewModeSelector = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => onViewModeChange('list')}
        className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${
          viewMode === 'list'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
        }`}
        title="Lista Compacta"
      >
        <ListBullets size={18} />
        <span className="hidden sm:inline">Lista</span>
      </button>
      
      <button
        onClick={() => onViewModeChange('grid')}
        className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${
          viewMode === 'grid'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
        }`}
        title="Grade de Cards"
      >
        <GridFour size={18} />
        <span className="hidden sm:inline">Grid</span>
      </button>
      
      <button
        onClick={() => onViewModeChange('table')}
        className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${
          viewMode === 'table'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
        }`}
        title="Tabela Detalhada"
      >
        <Table size={18} />
        <span className="hidden sm:inline">Tabela</span>
      </button>
    </div>
  );

  // Vista em Lista (atual/compacta)
  const ListView = () => (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={`p-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center transition-all hover:shadow-lg ${
            item.School?.name === "CHADA"
              ? "bg-rose-900 opacity-70"
              : "bg-gray-900"
          }`}
        >
          <div className="flex items-center mb-4 md:mb-0">
            <div>
              <h2 className="text-lg font-semibold text-white">{item.name}</h2>
              <p className="text-gray-400">
                <span className="font-extrabold">Marca:</span> {item?.brand}
              </p>
              <p className="text-gray-400">
                <span className="font-extrabold">Serial:</span> {item?.serialNumber}
              </p>
              <p className="text-gray-400">
                <span className="font-extrabold">Escola:</span> {item.School?.name}
              </p>
              <p className="text-gray-400">
                <span className="font-extrabold">Data de Criação:</span>{" "}
                {format(new Date(item.createdAt), "dd/MM/yyyy, HH:mm:ss", {
                  locale: ptBR,
                })}
              </p>
              <p className="text-gray-400">
                <span className="font-extrabold">Adicionado por:</span>{" "}
                {item.Profile?.displayName}
              </p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onHistoryClick(item)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Ver Histórico"
            >
              <Clock size={24} />
            </button>
            {item.Profile?.userId === userId && (
              <button
                onClick={() => onDeleteClick(item)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Deletar Item"
              >
                <Trash size={24} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Vista em Grid
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={`p-4 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-105 ${
            item.School?.name === "CHADA"
              ? "bg-rose-900 opacity-70"
              : "bg-gray-900"
          }`}
        >
          {/* Header do card */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white truncate" title={item.name}>
                {item.name}
              </h3>
              <p className="text-sm text-gray-400">{item.brand}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onHistoryClick(item)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                title="Ver Histórico"
              >
                <Clock size={20} />
              </button>
              {item.Profile?.userId === userId && (
                <button
                  onClick={() => onDeleteClick(item)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Deletar Item"
                >
                  <Trash size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Informações principais */}
          <div className="space-y-2 text-sm">
            <div className="bg-gray-800 rounded p-2">
              <p className="text-gray-300">
                <span className="font-semibold">Serial:</span> {item.serialNumber}
              </p>
            </div>
            
            <div className="bg-gray-800 rounded p-2">
              <p className="text-gray-300">
                <span className="font-semibold">Escola:</span>{" "}
                <span className={`font-medium ${
                  item.School?.name === 'CHADA' ? 'text-red-400' :
                  item.School?.name === 'CSDT' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {item.School?.name}
                </span>
              </p>
            </div>
            
            <div className="bg-gray-800 rounded p-2">
              <p className="text-gray-300">
                <span className="font-semibold">Criado em:</span>{" "}
                {format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            
            <div className="bg-gray-800 rounded p-2">
              <p className="text-gray-300">
                <span className="font-semibold">Por:</span> {item.Profile?.displayName}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              item.School?.name === 'CHADA' ? 'bg-red-100 text-red-800' :
              item.School?.name === 'CSDT' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {item.School?.name === 'CHADA' ? '🔧 Manutenção' :
               item.School?.name === 'CSDT' ? '📦 Depósito' : '🏫 Em Operação'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Vista em Tabela
  const TableView = () => (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
          <thead className="bg-gray-50 dark:bg-zinc-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Equipamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Marca/Serial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Localização
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Data de Criação
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Responsável
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
            {items.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                  item.School?.name === "CHADA" ? "bg-red-50 dark:bg-red-900/10" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <div>{item.brand}</div>
                    <div className="text-xs">{item.serialNumber}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                    {item.School?.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.School?.name === 'CHADA' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : item.School?.name === 'CSDT'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {item.School?.name === 'CHADA' ? 'Manutenção' :
                     item.School?.name === 'CSDT' ? 'Depósito' : 'Operação'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div>{format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}</div>
                  <div className="text-xs">{format(new Date(item.createdAt), "HH:mm:ss", { locale: ptBR })}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.Profile?.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onHistoryClick(item)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Ver Histórico"
                    >
                      <Clock size={20} />
                    </button>
                    {item.Profile?.userId === userId && (
                      <button
                        onClick={() => onDeleteClick(item)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Deletar Item"
                      >
                        <Trash size={20} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Eye size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum equipamento encontrado</p>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <ViewModeSelector />
      
      <div className="mt-4">
        {viewMode === 'list' && <ListView />}
        {viewMode === 'grid' && <GridView />}
        {viewMode === 'table' && <TableView />}
      </div>
    </div>
  );
};

export default DeviceViews;