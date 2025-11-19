import { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import {
  Desktop,
  Laptop,
  DeviceTablet,
  Monitor,
  Power,
  Printer,
  Buildings,
  MagnifyingGlass,
  Download,
  ArrowClockwise,
  ChartBar,
  ListBullets,
  Package,
  X
} from "phosphor-react";
import * as XLSX from 'xlsx';

const LocadosPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locados");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pega os nomes únicos
  const uniqueNames = Array.from(
    new Set(items.map((item) => item.name).filter(Boolean))
  ).sort();

  // Filtra os itens
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filtro por escola selecionada
    if (selectedName) {
      filtered = filtered.filter((item) => item.name === selectedName);
    }

    // Filtro por busca de texto
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [items, selectedName, searchTerm]);

  // Calcular totais
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        pcs: acc.pcs + (item.pcs ?? 0),
        notebooks: acc.notebooks + (item.notebooks ?? 0),
        tablets: acc.tablets + (item.tablets ?? 0),
        monitors: acc.monitors + (item.monitors ?? 0),
        estabilizadores: acc.estabilizadores + (item.estabilizadores ?? 0),
        impressoras: acc.impressoras + (item.impressoras ?? 0),
      }),
      { pcs: 0, notebooks: 0, tablets: 0, monitors: 0, estabilizadores: 0, impressoras: 0 }
    );
  }, [filteredItems]);

  const grandTotal = totals.pcs + totals.notebooks + totals.tablets + totals.monitors + totals.estabilizadores + totals.impressoras;

  const options = uniqueNames.map((name) => ({
    value: name,
    label: name,
  }));

  // Função para exportar Excel
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba 1: Resumo
      const resumoData = [
        { 'Tipo': 'PCs/Desktops', 'Quantidade': totals.pcs },
        { 'Tipo': 'Notebooks', 'Quantidade': totals.notebooks },
        { 'Tipo': 'Tablets', 'Quantidade': totals.tablets },
        { 'Tipo': 'Monitores', 'Quantidade': totals.monitors },
        { 'Tipo': 'Estabilizadores', 'Quantidade': totals.estabilizadores },
        { 'Tipo': 'Impressoras', 'Quantidade': totals.impressoras },
        { 'Tipo': '', 'Quantidade': '' },
        { 'Tipo': 'TOTAL', 'Quantidade': grandTotal },
      ];
      const ws1 = XLSX.utils.json_to_sheet(resumoData);
      ws1['!cols'] = [{ wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

      // Aba 2: Detalhado por Escola
      const detalhadoData = filteredItems.map(item => ({
        'Escola/Setor': item.name,
        'PCs': item.pcs || 0,
        'Notebooks': item.notebooks || 0,
        'Tablets': item.tablets || 0,
        'Monitores': item.monitors || 0,
        'Estabilizadores': item.estabilizadores || 0,
        'Impressoras': item.impressoras || 0,
        'Total': (item.pcs || 0) + (item.notebooks || 0) + (item.tablets || 0) +
                 (item.monitors || 0) + (item.estabilizadores || 0) + (item.impressoras || 0),
      }));
      const ws2 = XLSX.utils.json_to_sheet(detalhadoData);
      ws2['!cols'] = [
        { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(wb, ws2, 'Por Escola');

      const fileName = `Equipamentos_Locados_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      alert('Relatório Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar relatório Excel.');
    }
  };

  // Reset filtros
  const resetFilters = () => {
    setSelectedName('');
    setSearchTerm('');
  };

  const hasFilters = selectedName || searchTerm;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Package size={32} className="text-blue-600" />
                Equipamentos Locados
              </h1>
              <p className="text-gray-600 mt-1">
                Gestão de equipamentos distribuídos nas escolas e setores
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchItems}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ArrowClockwise size={18} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Indicador de Filtros Ativos */}
        {hasFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Filtros ativos
                </span>
                <span className="text-sm text-blue-700">
                  Mostrando {filteredItems.length} de {items.length} escolas/setores
                </span>
              </div>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <X size={16} />
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Buscar Escola/Setor
              </label>
              <div className="relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Select de escola */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Filtrar por Escola/Setor
              </label>
              <Select
                options={[{ value: "", label: "Todas as escolas" }, ...options]}
                value={
                  options.find((opt) => opt.value === selectedName) || {
                    value: "",
                    label: "Todas as escolas",
                  }
                }
                onChange={(opt) => setSelectedName(opt?.value || "")}
                placeholder="Selecione uma escola..."
                isClearable
                classNamePrefix="react-select"
                className="text-gray-800"
              />
            </div>
          </div>

          {/* Alternar visualização */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Visualização:</span>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                viewMode === 'cards'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChartBar size={16} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ListBullets size={16} />
              Tabela
            </button>
          </div>
        </div>

        {loading ? (
          // Loading skeleton
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Cards de Totais */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-xl p-4 border border-blue-400">
                <div className="flex items-center justify-between mb-2">
                  <Desktop size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{totals.pcs.toLocaleString()}</div>
                <div className="text-sm text-blue-100">PCs/Desktops</div>
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg rounded-xl p-4 border border-indigo-400">
                <div className="flex items-center justify-between mb-2">
                  <Laptop size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{totals.notebooks.toLocaleString()}</div>
                <div className="text-sm text-indigo-100">Notebooks</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg rounded-xl p-4 border border-purple-400">
                <div className="flex items-center justify-between mb-2">
                  <DeviceTablet size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{totals.tablets.toLocaleString()}</div>
                <div className="text-sm text-purple-100">Tablets</div>
              </div>

              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg rounded-xl p-4 border border-cyan-400">
                <div className="flex items-center justify-between mb-2">
                  <Monitor size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{totals.monitors.toLocaleString()}</div>
                <div className="text-sm text-cyan-100">Monitores</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg rounded-xl p-4 border border-orange-400">
                <div className="flex items-center justify-between mb-2">
                  <Power size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{totals.estabilizadores.toLocaleString()}</div>
                <div className="text-sm text-orange-100">Estabilizadores</div>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg rounded-xl p-4 border border-pink-400">
                <div className="flex items-center justify-between mb-2">
                  <Printer size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{totals.impressoras.toLocaleString()}</div>
                <div className="text-sm text-pink-100">Impressoras</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg rounded-xl p-4 border border-green-400">
                <div className="flex items-center justify-between mb-2">
                  <Package size={24} weight="duotone" />
                </div>
                <div className="text-3xl font-bold mb-1">{grandTotal.toLocaleString()}</div>
                <div className="text-sm text-green-100">Total Geral</div>
              </div>
            </div>

            {/* Tabela ou Lista */}
            {viewMode === 'table' ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Escola/Setor
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PCs
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notebooks
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tablets
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monitores
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estabiliz.
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Impressoras
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider font-bold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item, idx) => {
                        const itemTotal =
                          (item.pcs || 0) +
                          (item.notebooks || 0) +
                          (item.tablets || 0) +
                          (item.monitors || 0) +
                          (item.estabilizadores || 0) +
                          (item.impressoras || 0);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Buildings size={18} className="text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {item.pcs || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {item.notebooks || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {item.tablets || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {item.monitors || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {item.estabilizadores || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {item.impressoras || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 bg-gray-50">
                              {itemTotal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          TOTAL GERAL
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">
                          {totals.pcs.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-indigo-600">
                          {totals.notebooks.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">
                          {totals.tablets.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-cyan-600">
                          {totals.monitors.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-orange-600">
                          {totals.estabilizadores.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-pink-600">
                          {totals.impressoras.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-green-600 bg-green-50">
                          {grandTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const itemTotal =
                    (item.pcs || 0) +
                    (item.notebooks || 0) +
                    (item.tablets || 0) +
                    (item.monitors || 0) +
                    (item.estabilizadores || 0) +
                    (item.impressoras || 0);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Buildings size={20} className="text-blue-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {item.pcs > 0 && (
                          <div className="flex items-center gap-2">
                            <Desktop size={16} className="text-blue-500" />
                            <span className="text-gray-600">PCs:</span>
                            <span className="font-semibold text-gray-900">{item.pcs}</span>
                          </div>
                        )}
                        {item.notebooks > 0 && (
                          <div className="flex items-center gap-2">
                            <Laptop size={16} className="text-indigo-500" />
                            <span className="text-gray-600">Notebooks:</span>
                            <span className="font-semibold text-gray-900">{item.notebooks}</span>
                          </div>
                        )}
                        {item.tablets > 0 && (
                          <div className="flex items-center gap-2">
                            <DeviceTablet size={16} className="text-purple-500" />
                            <span className="text-gray-600">Tablets:</span>
                            <span className="font-semibold text-gray-900">{item.tablets}</span>
                          </div>
                        )}
                        {item.monitors > 0 && (
                          <div className="flex items-center gap-2">
                            <Monitor size={16} className="text-cyan-500" />
                            <span className="text-gray-600">Monitores:</span>
                            <span className="font-semibold text-gray-900">{item.monitors}</span>
                          </div>
                        )}
                        {item.estabilizadores > 0 && (
                          <div className="flex items-center gap-2">
                            <Power size={16} className="text-orange-500" />
                            <span className="text-gray-600">Estabiliz.:</span>
                            <span className="font-semibold text-gray-900">
                              {item.estabilizadores}
                            </span>
                          </div>
                        )}
                        {item.impressoras > 0 && (
                          <div className="flex items-center gap-2">
                            <Printer size={16} className="text-pink-500" />
                            <span className="text-gray-600">Impressoras:</span>
                            <span className="font-semibold text-gray-900">{item.impressoras}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total:</span>
                          <span className="text-lg font-bold text-green-600">{itemTotal}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                <Buildings size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Nenhuma escola/setor encontrado</p>
                <p className="text-gray-400 text-sm mt-2">
                  Tente ajustar os filtros de busca
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LocadosPage;
