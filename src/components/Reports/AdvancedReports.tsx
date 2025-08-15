import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Calendar, 
  Buildings,
  MapPin,
  Clock,
  ChartBar,
  Wrench,
  Archive
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

interface AdvancedReportsProps {
  items: Item[];
  schools: any[];
}

const AdvancedReports: React.FC<AdvancedReportsProps> = ({ items, schools }) => {
  const [selectedReportType, setSelectedReportType] = useState<'period' | 'school' | 'maintenance' | 'movement' | 'consolidated'>('consolidated');
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Obter distritos únicos
  const districts = useMemo(() => {
    return [...new Set(schools.map(s => s.district).filter(Boolean))].sort();
  }, [schools]);

  // Filtrar escolas por distrito
  const filteredSchools = useMemo(() => {
    if (!selectedDistrict) return schools;
    return schools.filter(s => s.district === selectedDistrict);
  }, [schools, selectedDistrict]);

  // Dados para relatórios
  const reportData = useMemo(() => {
    let filteredItems = [...items];

    // Filtro por período
    if (selectedPeriod.start && selectedPeriod.end) {
      const startDate = parseISO(selectedPeriod.start);
      const endDate = parseISO(selectedPeriod.end);
      
      filteredItems = filteredItems.filter(item => {
        const itemDate = parseISO(item.createdAt);
        return isWithinInterval(itemDate, { start: startDate, end: endDate });
      });
    }

    // Filtro por escola
    if (selectedSchool) {
      filteredItems = filteredItems.filter(item => item.School?.name === selectedSchool);
    }

    // Filtro por distrito
    if (selectedDistrict && !selectedSchool) {
      const districtSchools = schools.filter(s => s.district === selectedDistrict).map(s => s.name);
      filteredItems = filteredItems.filter(item => districtSchools.includes(item.School?.name));
    }

    return filteredItems;
  }, [items, schools, selectedPeriod, selectedSchool, selectedDistrict]);

  // Gerar relatório consolidado
  const generateConsolidatedReport = async () => {
    setIsGenerating(true);
    
    try {
      const workbook = XLSX.utils.book_new();
      
      // Aba 1: Resumo Executivo
      const summary = {
        'Total de Equipamentos': items.length,
        'Em Operação': items.filter(i => i.School?.name !== 'CSDT' && i.School?.name !== 'CHADA').length,
        'No Depósito (CSDT)': items.filter(i => i.School?.name === 'CSDT').length,
        'Em Manutenção (CHADA)': items.filter(i => i.School?.name === 'CHADA').length,
        'Total de Escolas Atendidas': new Set(items.map(i => i.School?.name).filter(name => name !== 'CSDT' && name !== 'CHADA')).size,
        'Período do Relatório': `${format(parseISO(selectedPeriod.start), 'dd/MM/yyyy', { locale: ptBR })} a ${format(parseISO(selectedPeriod.end), 'dd/MM/yyyy', { locale: ptBR })}`,
        'Data de Geração': format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
      };

      const summaryData = Object.entries(summary).map(([key, value]) => ({
        'Indicador': key,
        'Valor': value
      }));

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'Resumo Executivo');

      // Aba 2: Distribuição por Escola
      const schoolDistribution = schools.map(school => {
        const schoolItems = items.filter(item => item.School?.name === school.name);
        return {
          'Escola': school.name,
          'Distrito': school.district,
          'INEP': school.inep,
          'Total de Equipamentos': schoolItems.length,
          'Computadores': schoolItems.filter(i => i.name.toUpperCase().includes('COMPUTADOR')).length,
          'Notebooks': schoolItems.filter(i => i.name.toUpperCase().includes('NOTEBOOK')).length,
          'Monitores': schoolItems.filter(i => i.name.toUpperCase().includes('MONITOR')).length,
          'Periféricos': schoolItems.filter(i => 
            i.name.toUpperCase().includes('MOUSE') || 
            i.name.toUpperCase().includes('TECLADO') ||
            i.name.toUpperCase().includes('ESTABILIZADOR')
          ).length,
          'Status': school.name === 'CHADA' ? 'Manutenção' : school.name === 'CSDT' ? 'Depósito' : 'Operação'
        };
      }).sort((a, b) => b['Total de Equipamentos'] - a['Total de Equipamentos']);

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(schoolDistribution), 'Distribuição por Escola');

      // Aba 3: Detalhamento por Categoria
      const categories = ['COMPUTADOR', 'NOTEBOOK', 'MONITOR', 'MOUSE', 'TECLADO', 'ESTABILIZADOR', 'IMPRESSORA'];
      const categoryData = categories.map(category => {
        const categoryItems = items.filter(item => item.name.toUpperCase().includes(category));
        const inOperation = categoryItems.filter(i => i.School?.name !== 'CSDT' && i.School?.name !== 'CHADA').length;
        const inCSDT = categoryItems.filter(i => i.School?.name === 'CSDT').length;
        const inCHADA = categoryItems.filter(i => i.School?.name === 'CHADA').length;

        return {
          'Categoria': category,
          'Total': categoryItems.length,
          'Em Operação': inOperation,
          'No Depósito': inCSDT,
          'Em Manutenção': inCHADA,
          'Taxa de Utilização (%)': categoryItems.length > 0 ? ((inOperation / categoryItems.length) * 100).toFixed(1) : '0',
          'Taxa de Manutenção (%)': categoryItems.length > 0 ? ((inCHADA / categoryItems.length) * 100).toFixed(1) : '0'
        };
      });

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryData), 'Análise por Categoria');

      // Aba 4: Equipamentos Detalhados
      const detailedData = reportData.map(item => ({
        'ID': item.id,
        'Nome': item.name,
        'Marca': item.brand,
        'Número de Série': item.serialNumber,
        'Escola Atual': item.School?.name,
        'Distrito': schools.find(s => s.name === item.School?.name)?.district || 'N/A',
        'INEP': item.inep || 'N/A',
        'Status': item.School?.name === 'CHADA' ? 'Manutenção' : 
                 item.School?.name === 'CSDT' ? 'Depósito' : 'Em Operação',
        'Data de Cadastro': format(parseISO(item.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        'Cadastrado Por': item.Profile?.displayName || 'N/A',
        'Idade (dias)': Math.floor((new Date().getTime() - parseISO(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }));

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailedData), 'Equipamentos Detalhados');

      // Download do arquivo
      const filename = `relatorio-consolidado-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      alert(`Relatório consolidado gerado com sucesso!\nArquivo: ${filename}`);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar relatório por período
  const generatePeriodReport = async () => {
    setIsGenerating(true);
    
    try {
      const workbook = XLSX.utils.book_new();
      
      // Dados do período
      const periodData = reportData.map(item => ({
        'Data de Cadastro': format(parseISO(item.createdAt), 'dd/MM/yyyy', { locale: ptBR }),
        'Equipamento': item.name,
        'Marca': item.brand,
        'Série': item.serialNumber,
        'Escola': item.School?.name,
        'Distrito': schools.find(s => s.name === item.School?.name)?.district || 'N/A',
        'Responsável': item.Profile?.displayName,
        'Status Atual': item.School?.name === 'CHADA' ? 'Manutenção' : 
                       item.School?.name === 'CSDT' ? 'Depósito' : 'Em Operação'
      }));

      // Estatísticas do período
      const stats = [{
        'Período': `${format(parseISO(selectedPeriod.start), 'dd/MM/yyyy', { locale: ptBR })} a ${format(parseISO(selectedPeriod.end), 'dd/MM/yyyy', { locale: ptBR })}`,
        'Total de Equipamentos': reportData.length,
        'Equipamentos Cadastrados no Período': reportData.length,
        'Média por Dia': (reportData.length / Math.ceil((parseISO(selectedPeriod.end).getTime() - parseISO(selectedPeriod.start).getTime()) / (1000 * 60 * 60 * 24))).toFixed(1)
      }];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats), 'Estatísticas');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(periodData), 'Equipamentos do Período');

      const filename = `relatorio-periodo-${format(parseISO(selectedPeriod.start), 'yyyy-MM-dd')}-a-${format(parseISO(selectedPeriod.end), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      alert(`Relatório por período gerado com sucesso!\nArquivo: ${filename}`);

    } catch (error) {
      console.error('Erro ao gerar relatório por período:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar relatório de escola/distrito
  const generateSchoolReport = async () => {
    setIsGenerating(true);
    
    try {
      const workbook = XLSX.utils.book_new();
      
      let reportTitle = '';
      let reportScope = '';
      
      if (selectedSchool) {
        reportTitle = `Relatório da Escola: ${selectedSchool}`;
        reportScope = selectedSchool;
      } else if (selectedDistrict) {
        reportTitle = `Relatório do Distrito: ${selectedDistrict}`;
        reportScope = selectedDistrict;
        
        // Incluir lista de escolas do distrito
        const districtSchools = filteredSchools.map(school => ({
          'Escola': school.name,
          'INEP': school.inep,
          'Equipamentos': items.filter(item => item.School?.name === school.name).length
        }));
        
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(districtSchools), 'Escolas do Distrito');
      } else {
        reportTitle = 'Relatório Geral de Escolas';
        reportScope = 'Todas as Escolas';
      }

      // Dados detalhados
      const schoolData = reportData.map(item => ({
        'ID': item.id,
        'Equipamento': item.name,
        'Marca': item.brand,
        'Série': item.serialNumber,
        'Escola': item.School?.name,
        'Status': item.School?.name === 'CHADA' ? 'Manutenção' : 
                 item.School?.name === 'CSDT' ? 'Depósito' : 'Em Operação',
        'Data de Cadastro': format(parseISO(item.createdAt), 'dd/MM/yyyy', { locale: ptBR }),
        'Responsável': item.Profile?.displayName
      }));

      // Resumo
      const summary = [{
        'Escopo': reportScope,
        'Total de Equipamentos': reportData.length,
        'Data do Relatório': format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
      }];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Resumo');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(schoolData), 'Equipamentos');

      const filename = `relatorio-${selectedSchool ? 'escola' : 'distrito'}-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      alert(`${reportTitle} gerado com sucesso!\nArquivo: ${filename}`);

    } catch (error) {
      console.error('Erro ao gerar relatório de escola/distrito:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Gerar relatório de manutenção
  const generateMaintenanceReport = async () => {
    setIsGenerating(true);
    
    try {
      const maintenanceItems = items.filter(item => item.School?.name === 'CHADA');
      const workbook = XLSX.utils.book_new();
      
      const maintenanceData = maintenanceItems.map(item => ({
        'ID': item.id,
        'Equipamento': item.name,
        'Marca': item.brand,
        'Série': item.serialNumber,
        'Data de Entrada na CHADA': format(parseISO(item.createdAt), 'dd/MM/yyyy', { locale: ptBR }),
        'Tempo em Manutenção (dias)': Math.floor((new Date().getTime() - parseISO(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        'Responsável pelo Cadastro': item.Profile?.displayName,
        'Escola de Origem': 'A definir' // Isso viria do histórico
      }));

      // Estatísticas de manutenção
      const stats = [{
        'Total em Manutenção': maintenanceItems.length,
        'Percentual do Total': `${((maintenanceItems.length / items.length) * 100).toFixed(1)}%`,
        'Tempo Médio (dias)': maintenanceItems.length > 0 ? 
          (maintenanceItems.reduce((acc, item) => 
            acc + Math.floor((new Date().getTime() - parseISO(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)), 0
          ) / maintenanceItems.length).toFixed(1) : '0',
        'Data do Relatório': format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
      }];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stats), 'Estatísticas');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(maintenanceData), 'Equipamentos em Manutenção');

      const filename = `relatorio-manutencao-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.xlsx`;
      XLSX.writeFile(workbook, filename);

      alert(`Relatório de manutenção gerado com sucesso!\nArquivo: ${filename}`);

    } catch (error) {
      console.error('Erro ao gerar relatório de manutenção:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = () => {
    switch (selectedReportType) {
      case 'consolidated':
        generateConsolidatedReport();
        break;
      case 'period':
        generatePeriodReport();
        break;
      case 'school':
        generateSchoolReport();
        break;
      case 'maintenance':
        generateMaintenanceReport();
        break;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText size={24} className="text-blue-500" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Relatórios Avançados
        </h2>
      </div>

      {/* Seleção do tipo de relatório */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setSelectedReportType('consolidated')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedReportType === 'consolidated'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-200 dark:border-zinc-700 hover:border-blue-300'
          }`}
        >
          <ChartBar size={32} className={`mx-auto mb-2 ${selectedReportType === 'consolidated' ? 'text-blue-500' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800 dark:text-white">Consolidado</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Relatório completo com todas as métricas</p>
        </button>

        <button
          onClick={() => setSelectedReportType('period')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedReportType === 'period'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-gray-200 dark:border-zinc-700 hover:border-green-300'
          }`}
        >
          <Calendar size={32} className={`mx-auto mb-2 ${selectedReportType === 'period' ? 'text-green-500' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800 dark:text-white">Por Período</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Equipamentos por data de criação</p>
        </button>

        <button
          onClick={() => setSelectedReportType('school')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedReportType === 'school'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
              : 'border-gray-200 dark:border-zinc-700 hover:border-purple-300'
          }`}
        >
          <Buildings size={32} className={`mx-auto mb-2 ${selectedReportType === 'school' ? 'text-purple-500' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800 dark:text-white">Escola/Distrito</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Relatório específico por localização</p>
        </button>

        <button
          onClick={() => setSelectedReportType('maintenance')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedReportType === 'maintenance'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
              : 'border-gray-200 dark:border-zinc-700 hover:border-red-300'
          }`}
        >
          <Wrench size={32} className={`mx-auto mb-2 ${selectedReportType === 'maintenance' ? 'text-red-500' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800 dark:text-white">Manutenção</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Equipamentos na CHADA</p>
        </button>
      </div>

      {/* Filtros específicos por tipo */}
      <div className="space-y-4 mb-6">
        {(selectedReportType === 'period' || selectedReportType === 'consolidated') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={selectedPeriod.start}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={selectedPeriod.end}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>
        )}

        {selectedReportType === 'school' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Distrito
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedSchool(''); // Reset escola quando muda distrito
                }}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Todos os Distritos</option>
                {districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Escola Específica
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg dark:bg-zinc-800 dark:text-white"
                disabled={!selectedDistrict && filteredSchools.length > 20} // Disable se muitas escolas
              >
                <option value="">
                  {selectedDistrict ? 'Todas as Escolas do Distrito' : 'Selecione um Distrito primeiro'}
                </option>
                {filteredSchools.map(school => (
                  <option key={school.id} value={school.name}>{school.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Preview dos dados */}
      <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Prévia do Relatório
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{reportData.length}</div>
            <div className="text-gray-600 dark:text-gray-400">Equipamentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {reportData.filter(i => i.School?.name !== 'CSDT' && i.School?.name !== 'CHADA').length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Em Operação</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {reportData.filter(i => i.School?.name === 'CSDT').length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">No Depósito</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {reportData.filter(i => i.School?.name === 'CHADA').length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Em Manutenção</div>
          </div>
        </div>
      </div>

      {/* Botão de geração */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || reportData.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            isGenerating || reportData.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
          } text-white`}
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <Download size={20} />
          )}
          {isGenerating ? 'Gerando Relatório...' : 'Gerar Relatório Excel'}
        </button>
      </div>

      {reportData.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
          <Archive size={48} className="mx-auto mb-2 opacity-50" />
          <p>Nenhum equipamento encontrado com os filtros selecionados</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedReports;