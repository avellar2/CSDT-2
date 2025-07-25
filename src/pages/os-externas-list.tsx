import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useHeaderContext } from '@/context/HeaderContext';
import { CheckCircle, Clock, Eye, Calendar, User } from 'phosphor-react';
import { Button } from '@/components/ui/button';

// Atualizar a interface para incluir todos os campos do schema
interface OsExterna {
  id: number;
  numeroOs: string;
  data: string;
  hora: string;
  unidadeEscolar: string;
  tecnicoResponsavel: string;
  emailResponsavel: string;
  fotosAntes: string[];
  fotosDepois: string[];
  pcsProprio?: number;
  pcsLocado?: number;
  notebooksProprio?: number;
  notebooksLocado?: number;
  monitoresProprio?: number;
  monitoresLocado?: number;
  estabilizadoresProprio?: number;
  estabilizadoresLocado?: number;
  tabletsProprio?: number;
  tabletsLocado?: number;
  pcsProprioOutrosLocais?: number;
  pcsLocadoOutrosLocais?: number;
  notebooksProprioOutrosLocais?: number;
  notebooksLocadoOutrosLocais?: number;
  monitoresProprioOutrosLocais?: number;
  monitoresLocadoOutrosLocais?: number;
  estabilizadoresProprioOutrosLocais?: number;
  estabilizadoresLocadoOutrosLocais?: number;
  tabletsProprioOutrosLocais?: number;
  tabletsLocadoOutrosLocais?: number;
  pecasOuMaterial?: string;
  relatorio?: string;
  solicitacaoDaVisita?: string;
  temLaboratorio?: boolean;
  redeBr?: string;
  educacaoConectada?: string;
  naoHaProvedor?: string;
  rack?: number;
  switch?: number;
  roteador?: number;
  oki?: number;
  kyocera?: number;
  hp?: number;
  ricoh?: number;
  outrasImpressoras?: number;
  solucionado?: string;
  status: string;
  assinado?: string;
  cpf?: string;
  cargoResponsavel?: string;
  updatedAt: string;
  createdAt: string;
}

const OsExternasList: React.FC = () => {
  const { userName } = useHeaderContext();
  const [osExternas, setOsExternas] = useState<OsExterna[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOs, setSelectedOs] = useState<OsExterna | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOsExternas();
  }, []);

  const fetchOsExternas = async () => {
    try {
      const response = await fetch('/api/get-all-os-externas');
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos:', data); // Debug para ver os dados
        setOsExternas(data);
      } else {
        console.error('Erro ao buscar OS Externas');
      }
    } catch (error) {
      console.error('Erro ao buscar OS Externas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para filtrar OS baseada na pesquisa
  const filterOsBySearch = (osList: OsExterna[]) => {
    if (!searchTerm.trim()) return osList;

    return osList.filter(os =>
      os.numeroOs?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.unidadeEscolar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.tecnicoResponsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.emailResponsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.assinado?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Aplicar filtros de pesquisa
  const osExternasPendentes = filterOsBySearch(osExternas.filter(os => os.status === 'Pendente'));
  const osExternasAssinadas = filterOsBySearch(osExternas.filter(os => os.status === 'Assinado'));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleViewDetails = (os: OsExterna) => {
    console.log('OS selecionada:', os); // Debug para ver os dados da OS
    setSelectedOs(os);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOs(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando OS Externas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            OS Externas - Controle Geral
          </h1>
          <p className="text-gray-600">
            Total: {osExternas.length} | Pendentes: {osExternas.filter(os => os.status === 'Pendente').length} | Assinadas: {osExternas.filter(os => os.status === 'Assinado').length}
          </p>
        </div>

        {/* Barra de Pesquisa */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por número da OS, escola, técnico, email ou responsável..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600 text-center">
              Mostrando resultados para: "<span className="font-medium text-gray-800">{searchTerm}</span>"
              | Pendentes: {osExternasPendentes.length} | Assinadas: {osExternasAssinadas.length}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna Esquerda - OS Pendentes */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <Clock size={24} className="text-orange-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">
                OS Pendentes ({osExternasPendentes.length})
              </h2>
            </div>

            {osExternasPendentes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                <p>{searchTerm ? 'Nenhuma OS pendente encontrada' : 'Nenhuma OS pendente'}</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {osExternasPendentes.map((os) => (
                  <div key={os.id} className="border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">
                            {os.numeroOs}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            {formatDate(os.data)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                          {os.unidadeEscolar}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          <User size={16} className="inline mr-1" />
                          {os.tecnicoResponsavel}
                        </p>
                        <p className="text-xs text-gray-500">
                          Criada: {formatDateTime(os.createdAt)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleViewDetails(os)}
                        size="sm"
                        className="ml-4 bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Eye size={16} className="mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita - OS Assinadas */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <CheckCircle size={24} className="text-green-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">
                OS Assinadas ({osExternasAssinadas.length})
              </h2>
            </div>

            {osExternasAssinadas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>{searchTerm ? 'Nenhuma OS assinada encontrada' : 'Nenhuma OS assinada'}</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {osExternasAssinadas.map((os) => (
                  <div key={os.id} className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                            {os.numeroOs}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            {formatDate(os.data)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                          {os.unidadeEscolar}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          <User size={16} className="inline mr-1" />
                          {os.tecnicoResponsavel}
                        </p>
                        <p className="text-sm text-green-600 mb-2">
                          <CheckCircle size={16} className="inline mr-1" />
                          Assinado por: {os.assinado}
                        </p>
                        <p className="text-xs text-gray-500">
                          Criada: {formatDateTime(os.createdAt)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleViewDetails(os)}
                        size="sm"
                        className="ml-4 bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Eye size={16} className="mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal com TODOS os dados baseados no schema */}
      {showModal && selectedOs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedOs.unidadeEscolar}
                  </h3>
                  <p className="text-gray-600">OS Externa - Detalhes Completos</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Informações Principais */}
              <div className="bg-white border border-gray-200 rounded-lg mb-6">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50 w-1/3">
                        Técnico Responsável
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.tecnicoResponsavel}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Número OS
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.numeroOs}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Assinatura
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.status === 'Assinado' ? selectedOs.assinado : 'Pendente'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        CPF/Matrícula
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.cpf || 'Não informado'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Data
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.data}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Hora
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.hora}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Status
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedOs.status === 'Pendente'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {selectedOs.status === 'Pendente' ? 'Pendente' : 'Confirmada'}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        E-mail Responsável
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.emailResponsavel}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Cargo do Responsável
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.cargoResponsavel || 'Não informado'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-700 bg-gray-50">
                        Tem Laboratório ?
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {selectedOs.temLaboratorio ? 'Não' : 'Sim'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Solicitação da Visita */}
              <div className="bg-white border border-gray-200 rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-bold text-gray-700">Solicitação da Visita</h4>
                </div>
                <div className="px-4 py-3">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.solicitacaoDaVisita}</p>
                </div>
              </div>

              {/* Relatório */}
              {selectedOs.relatorio && (
                <div className="bg-white border border-gray-200 rounded-lg mb-6">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700">Relatório</h4>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.relatorio}</p>
                  </div>
                </div>
              )}

              {/* Equipamentos - Laboratório */}
              <div className="bg-white border border-gray-200 rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-bold text-gray-700">Equipamentos - Laboratório</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Próprio</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Locado</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">PC</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.pcsProprio || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.pcsLocado || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.pcsProprio || 0) + (selectedOs.pcsLocado || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Notebook</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.notebooksProprio || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.notebooksLocado || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.notebooksProprio || 0) + (selectedOs.notebooksLocado || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Tablet</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.tabletsProprio || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.tabletsLocado || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.tabletsProprio || 0) + (selectedOs.tabletsLocado || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Monitor</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.monitoresProprio || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.monitoresLocado || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.monitoresProprio || 0) + (selectedOs.monitoresLocado || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Estabilizador</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.estabilizadoresProprio || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.estabilizadoresLocado || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.estabilizadoresProprio || 0) + (selectedOs.estabilizadoresLocado || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Equipamentos - Outros Locais */}
              <div className="bg-white border border-gray-200 rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-bold text-gray-700">Equipamentos - Outros Locais</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Próprio</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Locado</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">PC</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.pcsProprioOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.pcsLocadoOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.pcsProprioOutrosLocais || 0) + (selectedOs.pcsLocadoOutrosLocais || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Notebook</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.notebooksProprioOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.notebooksLocadoOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.notebooksProprioOutrosLocais || 0) + (selectedOs.notebooksLocadoOutrosLocais || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Tablet</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.tabletsProprioOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.tabletsLocadoOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.tabletsProprioOutrosLocais || 0) + (selectedOs.tabletsLocadoOutrosLocais || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Monitor</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.monitoresProprioOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.monitoresLocadoOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.monitoresProprioOutrosLocais || 0) + (selectedOs.monitoresLocadoOutrosLocais || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Estabilizador</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.estabilizadoresProprioOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.estabilizadoresLocadoOutrosLocais || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.estabilizadoresProprioOutrosLocais || 0) + (selectedOs.estabilizadoresLocadoOutrosLocais || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Impressoras */}
              <div className="bg-white border border-gray-200 rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-bold text-gray-700">Impressoras</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">OKI</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Kyocera</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">HP</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Ricoh</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Outras</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Impressora</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.oki || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.kyocera || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.hp || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.ricoh || 0}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.outrasImpressoras || 0}</td>
                        <td className="px-4 py-2 text-center font-medium text-gray-900">
                          {(selectedOs.oki || 0) + (selectedOs.kyocera || 0) + (selectedOs.hp || 0) + (selectedOs.ricoh || 0) + (selectedOs.outrasImpressoras || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Internet e Rede */}
              <div className="bg-white border border-gray-200 rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-bold text-gray-700">Internet e Rede</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Rede BR</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Educação Conectada</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Não Há Provedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2 font-medium text-gray-700">Internet</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.redeBr || '-'}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.educacaoConectada || '-'}</td>
                        <td className="px-4 py-2 text-center text-gray-900">{selectedOs.naoHaProvedor || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Equipamentos de Rede */}
                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium text-gray-700">Rack:</span>
                      <span className="ml-2 text-gray-900">{selectedOs.rack || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Switch:</span>
                      <span className="ml-2 text-gray-900">{selectedOs.switch || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Roteador:</span>
                      <span className="ml-2 text-gray-900">{selectedOs.roteador || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peças ou Material */}
              {selectedOs.pecasOuMaterial && (
                <div className="bg-white border border-gray-200 rounded-lg mb-6">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700">Peças ou Material</h4>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.pecasOuMaterial}</p>
                  </div>
                </div>
              )}

              {/* Solucionado */}
              {selectedOs.solucionado && (
                <div className="bg-white border border-gray-200 rounded-lg mb-6">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700">Problema Solucionado</h4>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedOs.solucionado}</p>
                  </div>
                </div>
              )}

              {/* Fotos Antes */}
              {selectedOs.fotosAntes && selectedOs.fotosAntes.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg mb-6">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700">Fotos Antes</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedOs.fotosAntes.map((foto, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={foto}
                            alt={`Antes ${index + 1}`}
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(foto, '_blank')}
                          />
                          <p className="text-center text-sm text-gray-600 mt-1">
                            Foto Antes {index + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Fotos Depois */}
              {selectedOs.fotosDepois && selectedOs.fotosDepois.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg mb-6">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700">Fotos Depois</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedOs.fotosDepois.map((foto, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={foto}
                            alt={`Depois ${index + 1}`}
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(foto, '_blank')}
                          />
                          <p className="text-center text-sm text-gray-600 mt-1">
                            Foto Depois {index + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Informações do Sistema */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg">
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <h4 className="font-bold text-gray-700">Informações do Sistema</h4>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">ID da OS:</span>
                      <span className="ml-2 text-gray-900">{selectedOs.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Criada em:</span>
                      <span className="ml-2 text-gray-900">{formatDateTime(selectedOs.createdAt)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Atualizada em:</span>
                      <span className="ml-2 text-gray-900">{formatDateTime(selectedOs.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={closeModal} className="bg-gray-500 hover:bg-gray-600 text-white">
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OsExternasList;