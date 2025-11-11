import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MagnifyingGlass, 
  MapPin, 
  Phone, 
  EnvelopeSimple,
  Users,
  GraduationCap,
  Eye,
  List,
  SquaresFour,
  Funnel,
  SortAscending,
  SortDescending,
  X,
  Monitor,
  Desktop
} from 'phosphor-react';
import axios from 'axios';

interface School {
  id: number;
  name: string;
  inep: number;
  district: string;
  address: string;
  director: string;
  phone: string;
  email: string;
  students?: number;
  laboratorio?: number;
  parentSchoolId?: number;
  parentSchool?: School;
  School?: School;
  annexes?: School[];
  other_School?: School[];
}

const districtColors: { [key: string]: string } = {
  '1': 'bg-blue-300',
  '2': 'bg-green-300',
  '3': 'bg-orange-300',
  '4': 'bg-purple-300',
  '5': 'bg-red-300',
  // Adicione mais distritos e cores conforme necessário
};

const getDistrictColor = (district: string) => {
  return districtColors[district] || 'bg-gray-400';
};

const SchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    district: '',
    director: '',
    minStudents: '',
    maxStudents: '',
    laboratorio: '',
    anexos: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });
  const [schoolStats, setSchoolStats] = useState<{[key: number]: any}>({});
  const [loadingStats, setLoadingStats] = useState<{[key: number]: boolean}>({});

  // Função para abrir o mapa
  const openMap = (address: string, schoolName: string) => {
    const encodedAddress = encodeURIComponent(`${address}, ${schoolName}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  // Função para carregar estatísticas de uma escola
  const loadSchoolStats = async (schoolId: number) => {
    if (schoolStats[schoolId] || loadingStats[schoolId]) {
      return; // Já carregado ou carregando
    }

    setLoadingStats(prev => ({ ...prev, [schoolId]: true }));
    
    try {
      const response = await axios.get(`/api/schools/${schoolId}/stats`);
      setSchoolStats(prev => ({ ...prev, [schoolId]: response.data }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas da escola:', error);
    } finally {
      setLoadingStats(prev => ({ ...prev, [schoolId]: false }));
    }
  };

  useEffect(() => {
    // Função para buscar os dados das escolas do banco de dados
    const fetchSchools = async () => {
      try {
        const response = await axios.get('/api/schools');
        const data = await response.data;
        if (Array.isArray(data)) {
          setSchools(data);
        } else {
          setError('Unexpected response format');
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        setError('Error fetching schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  // Filtrar apenas escolas principais (não anexos) e depois aplicar filtros
  const mainSchools = schools.filter(school => !school.parentSchoolId);
  
  // Função de filtragem avançada
  const filteredSchools = mainSchools.filter((school) => {
    // Filtro por termo de pesquisa (nome da escola)
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por distrito
    const matchesDistrict = !filters.district || school.district === filters.district;
    
    // Filtro por diretor
    const matchesDirector = !filters.director || 
      school.director.toLowerCase().includes(filters.director.toLowerCase());
    
    // Filtro por número de alunos
    const studentCount = school.students || 0;
    const matchesMinStudents = !filters.minStudents || 
      studentCount >= parseInt(filters.minStudents);
    const matchesMaxStudents = !filters.maxStudents || 
      studentCount <= parseInt(filters.maxStudents);
    
    // Filtro por laboratório
    const matchesLaboratorio = !filters.laboratorio || 
      (filters.laboratorio === 'com' && school.laboratorio && school.laboratorio > 0) ||
      (filters.laboratorio === 'sem' && (!school.laboratorio || school.laboratorio === 0));
    
    // Filtro por anexos
    const matchesAnexos = !filters.anexos || 
      (filters.anexos === 'com' && school.other_School && school.other_School.length > 0) ||
      (filters.anexos === 'sem' && (!school.other_School || school.other_School.length === 0));
    
    return matchesSearch && matchesDistrict && matchesDirector && 
           matchesMinStudents && matchesMaxStudents && matchesLaboratorio && matchesAnexos;
  }).sort((a, b) => {
    // Ordenação
    let valueA: any, valueB: any;
    
    switch (filters.sortBy) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'district':
        valueA = a.district;
        valueB = b.district;
        break;
      case 'students':
        valueA = a.students || 0;
        valueB = b.students || 0;
        break;
      case 'director':
        valueA = a.director.toLowerCase();
        valueB = b.director.toLowerCase();
        break;
      default:
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
    }
    
    if (filters.sortOrder === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  }); 

  console.log(schools);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Escolas do Sistema
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie e visualize todas as escolas cadastradas no sistema
              </p>
            </div>
            
            {/* Toggle de Visualização */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-zinc-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <SquaresFour size={18} />
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <List size={18} />
                Lista
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa e Filtros */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar escolas por nome..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Botão de Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
            >
              <Funnel size={20} />
              Filtros
            </button>
            
            {/* Ordenação Rápida */}
            <div className="flex items-center gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="px-3 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Nome</option>
                <option value="district">Distrito</option>
                <option value="students">Alunos</option>
                <option value="director">Diretor</option>
              </select>
              
              <button
                onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                className="flex items-center justify-center w-12 h-12 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
              >
                {filters.sortOrder === 'asc' ? <SortAscending size={20} /> : <SortDescending size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Painel de Filtros Avançados */}
        {showFilters && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filtros Avançados
              </h3>
              <button
                onClick={() => {
                  setFilters({
                    district: '',
                    director: '',
                    minStudents: '',
                    maxStudents: '',
                    laboratorio: '',
                    anexos: '',
                    sortBy: 'name',
                    sortOrder: 'asc'
                  });
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={16} />
                Limpar Filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Filtro por Distrito */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Distrito
                </label>
                <select
                  value={filters.district}
                  onChange={(e) => setFilters({...filters, district: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os distritos</option>
                  {Array.from(new Set(schools.map(school => school.district).filter(Boolean))).map(district => (
                    <option key={district} value={district}>Distrito {district}</option>
                  ))}
                </select>
              </div>
              
              {/* Filtro por Laboratório */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Desktop size={14} className="inline mr-1" />
                  Laboratório
                </label>
                <select
                  value={filters.laboratorio}
                  onChange={(e) => setFilters({...filters, laboratorio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas as escolas</option>
                  <option value="com">Com laboratório</option>
                  <option value="sem">Sem laboratório</option>
                </select>
              </div>
              
              {/* Filtro por Anexos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="mr-1">📍</span>
                  Anexos
                </label>
                <select
                  value={filters.anexos}
                  onChange={(e) => setFilters({...filters, anexos: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas as escolas</option>
                  <option value="com">Com anexos</option>
                  <option value="sem">Sem anexos</option>
                </select>
              </div>
              
              {/* Filtro por Diretor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Diretor
                </label>
                <input
                  type="text"
                  placeholder="Nome do diretor..."
                  value={filters.director}
                  onChange={(e) => setFilters({...filters, director: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Filtro por Número Mínimo de Alunos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mín. Alunos
                </label>
                <input
                  type="number"
                  placeholder="Ex: 100"
                  value={filters.minStudents}
                  onChange={(e) => setFilters({...filters, minStudents: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Filtro por Número Máximo de Alunos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Máx. Alunos
                </label>
                <input
                  type="number"
                  placeholder="Ex: 1000"
                  value={filters.maxStudents}
                  onChange={(e) => setFilters({...filters, maxStudents: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Escolas Principais</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mainSchools.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Alunos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {schools.reduce((sum, school) => sum + (school.students || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Distritos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Set(schools.map(school => school.district).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Desktop className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Com Laboratório</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {schools.filter(school => school.laboratorio && school.laboratorio > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <span className="text-lg">📍</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Anexos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {schools.filter(school => school.parentSchoolId).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="flex items-center">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/20 rounded-lg">
                <Eye className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Encontradas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredSchools.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        {viewMode === 'grid' ? (
          /* Visualização em Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <div
                key={school.id}
                className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Header do Card com Distrito */}
                <div className={`h-2 ${getDistrictColor(school.district)}`}></div>
                
                <div className="p-6">
                  {/* Nome da Escola */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {school.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <MapPin size={14} className="mr-1" />
                      Distrito {school.district || 'N/A'}
                    </div>
                  </div>

                  {/* Informações Básicas */}
                  <div className="space-y-2 mb-4">
                    {school.director && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <GraduationCap size={14} className="mr-2" />
                        {school.director}
                      </div>
                    )}
                    {school.students && school.students > 0 && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users size={14} className="mr-2" />
                        {school.students.toLocaleString()} alunos
                      </div>
                    )}
                    {school.laboratorio !== undefined && school.laboratorio > 0 && (
                      <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                        <Desktop size={14} className="mr-2" />
                        Laboratório: {school.laboratorio} equipamentos
                      </div>
                    )}
                    {school.other_School && school.other_School.length > 0 && (
                      <div className="flex items-start text-sm text-purple-600 dark:text-purple-400">
                        <span className="mr-2 mt-1">📍</span>
                        <div>
                          <span className="font-medium">Anexos ({school.other_School.length}):</span>
                          <div className="mt-1 space-y-1">
                            {school.other_School.map((annex) => (
                              <div key={annex.id} className="text-xs bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                                {annex.name.replace(/^ANEXO\s*(\([^)]*\))?\s*:?\s*/i, '')}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Endereço Clicável */}
                  {school.address && (
                    <div 
                      onClick={() => openMap(school.address, school.name)}
                      className="flex items-start text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <MapPin size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                      <span className="hover:underline">{school.address}</span>
                    </div>
                  )}

                  {/* Contatos */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {school.phone && (
                      <a
                        href={`tel:${school.phone}`}
                        className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded-full hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <Phone size={12} />
                        {school.phone}
                      </a>
                    )}
                    {school.email && (
                      <a
                        href={`mailto:${school.email}`}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-900/30 transition-colors"
                      >
                        <EnvelopeSimple size={12} />
                        Email
                      </a>
                    )}
                  </div>

                  {/* Estatísticas da Escola */}
                  {schoolStats[school.id] && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Estatísticas</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">OS Total:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{schoolStats[school.id].totalOS}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Itens:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{schoolStats[school.id].items}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Memorandos:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{schoolStats[school.id].memorandos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">OS Externas:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{schoolStats[school.id].osExternas}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadSchoolStats(school.id)}
                      disabled={loadingStats[school.id]}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      {loadingStats[school.id] ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Carregando...
                        </>
                      ) : schoolStats[school.id] ? (
                        <>📊 Atualizar</>
                      ) : (
                        <>📊 Ver Stats</>
                      )}
                    </button>
                    <Link href={`/schools/${school.id}`}>
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                        <Eye size={16} />
                        Ver Detalhes
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Visualização em Lista/Tabela */
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                <thead className="bg-gray-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Escola
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Distrito
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Diretor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Alunos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Laboratório
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
                  {filteredSchools.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${getDistrictColor(school.district)}`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {school.name}
                              {school.other_School && school.other_School.length > 0 && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                  {school.other_School.length} anexo{school.other_School.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {school.other_School && school.other_School.length > 0 && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                {school.other_School.map((annex, index) => (
                                  <span key={annex.id}>
                                    {annex.name.replace(/^ANEXO\s*(\([^)]*\))?\s*:?\s*/i, '')}
                                    {index < school.other_School!.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                            {school.address && (
                              <div 
                                onClick={() => openMap(school.address, school.name)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer hover:underline flex items-center mt-1"
                              >
                                <MapPin size={12} className="mr-1" />
                                Ver no mapa
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {school.district || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {school.director || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {school.students && school.students > 0 ? school.students.toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {school.laboratorio && school.laboratorio > 0 ? (
                          <div className="flex items-center text-blue-600 dark:text-blue-400">
                            <Desktop size={16} className="mr-1" />
                            {school.laboratorio} equipamentos
                          </div>
                        ) : (
                          <span className="text-gray-400">Sem laboratório</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {school.phone && (
                            <a
                              href={`tel:${school.phone}`}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              <Phone size={16} />
                            </a>
                          )}
                          {school.email && (
                            <a
                              href={`mailto:${school.email}`}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <EnvelopeSimple size={16} />
                            </a>
                          )}
                          <Link href={`/schools/${school.id}`}>
                            <span className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                              <Eye size={16} />
                            </span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {filteredSchools.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma escola encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tente ajustar o termo de pesquisa ou verificar se há escolas cadastradas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolsPage;