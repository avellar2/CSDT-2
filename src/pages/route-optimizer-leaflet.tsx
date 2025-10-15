import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import dynamic from 'next/dynamic';
import { Clock, MapPin, Route, Users, Calculator, RefreshCw, Download, AlertCircle, CheckCircle } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

// Importação dinâmica para evitar SSR issues com Leaflet
const MapWithRoutes = dynamic(() => import('@/components/MapWithRoutes'), { 
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
        <p>Carregando mapa...</p>
      </div>
    </div>
  )
});

interface School {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface Technician {
  id: number;
  name: string;
}

interface RouteVisit {
  id: string;
  schoolId: number;
  visitOrder: number;
  estimatedTime: number;
  status: string;
  school: School;
}

interface OptimizedRoute {
  id: string;
  technicianId: number;
  date: string;
  totalDistance: number;
  totalTime: number;
  optimized: boolean;
  visits: RouteVisit[];
}

const RouteOptimizerLeaflet: React.FC = () => {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<{ value: number; label: string } | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<{ value: number; label: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingResults, setGeocodingResults] = useState<any>(null);

  // Carrega dados iniciais
  useEffect(() => {
    fetchSchools();
    fetchTechnicians();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/get-school');
      const data = await response.json();
      setSchools(data);
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/get-technicians');
      const data = await response.json();
      setTechnicians(data);
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
    }
  };

  const handleGeocode = async () => {
    setIsGeocoding(true);
    setGeocodingResults(null);
    
    try {
      const selectedSchoolIds = selectedSchools.map(s => s.value);
      const response = await fetch('/api/geocode-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schoolIds: selectedSchoolIds,
          useOSM: true // Usa OpenStreetMap (gratuito)
        })
      });

      const result = await response.json();
      setGeocodingResults(result);
      
      if (result.success) {
        fetchSchools(); // Atualiza lista
      }
    } catch (error) {
      console.error('Erro no geocoding:', error);
      setGeocodingResults({ 
        success: false, 
        error: 'Erro ao geocodificar endereços' 
      });
    }
    setIsGeocoding(false);
  };

  const handleOptimize = async () => {
    if (!selectedTechnician || selectedSchools.length === 0) {
      alert('Selecione um técnico e pelo menos uma escola');
      return;
    }

    // Verifica se as escolas têm coordenadas
    const schoolsWithoutCoords = selectedSchools.filter(selected => {
      const school = schools.find(s => s.id === selected.value);
      return !school?.latitude || !school?.longitude;
    });

    if (schoolsWithoutCoords.length > 0) {
      alert('Algumas escolas não têm coordenadas. Execute o geocoding primeiro.');
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await fetch('/api/route-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId: selectedTechnician.value,
          date: selectedDate,
          schools: selectedSchools.map(s => s.value)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setOptimizedRoute(result.optimization);
        alert(`Rota otimizada! ${result.metrics.algorithm === 'genetic' ? 'Algoritmo Genético' : 'Vizinho Mais Próximo'} utilizado.`);
      } else {
        alert(result.error || 'Erro na otimização');
      }
    } catch (error) {
      console.error('Erro na otimização:', error);
      alert('Erro ao otimizar rota');
    }
    setIsOptimizing(false);
  };

  const exportRoute = () => {
    if (!optimizedRoute) return;

    const csv = [
      ['Ordem', 'Escola', 'Endereço', 'Tempo Estimado', 'Coordenadas'],
      ...optimizedRoute.visits.map(visit => [
        visit.visitOrder,
        visit.school.name,
        visit.school.address,
        `${visit.estimatedTime} min`,
        `${visit.school.latitude}, ${visit.school.longitude}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rota-${selectedTechnician?.label}-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const schoolOptions = schools.map(school => ({
    value: school.id,
    label: `${school.name} ${school.latitude ? '📍' : '❌'}`,
    isDisabled: false // Permite selecionar mesmo sem coordenadas para geocodificar depois
  }));

  const technicianOptions = technicians.map(tech => ({
    value: tech.id,
    label: tech.name
  }));

  // Escolas selecionadas para mostrar no mapa
  const selectedSchoolsData = schools.filter(school => 
    selectedSchools.some(selected => selected.value === school.id)
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Route className="inline-block mr-2" />
            Otimizador de Rotas
          </h1>
          <p className="text-gray-600">
            Otimize as rotas dos técnicos para reduzir tempo de deslocamento (usando OpenStreetMap gratuito)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de Configuração */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                <Users className="inline-block mr-2" />
                Configuração da Rota
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Técnico
                  </label>
                  <Select
                    options={technicianOptions}
                    value={selectedTechnician}
                    onChange={setSelectedTechnician}
                    placeholder="Selecione um técnico"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Visita
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escolas (📍 = geocodificada, ❌ = sem coordenadas)
                  </label>
                  <Select
                    isMulti
                    options={schoolOptions}
                    value={selectedSchools}
                    onChange={(selected) => setSelectedSchools(selected ? Array.from(selected) : [])}
                    placeholder="Selecione as escolas"
                    className="text-sm"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleGeocode}
                    disabled={isGeocoding || selectedSchools.length === 0}
                    className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center text-sm"
                  >
                    {isGeocoding ? (
                      <RefreshCw className="animate-spin mr-2" size={16} />
                    ) : (
                      <MapPin className="mr-2" size={16} />
                    )}
                    Geocodificar
                  </button>
                  
                  <button
                    onClick={handleOptimize}
                    disabled={isOptimizing || selectedSchools.length === 0 || !selectedTechnician}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center text-sm"
                  >
                    {isOptimizing ? (
                      <RefreshCw className="animate-spin mr-2" size={16} />
                    ) : (
                      <Calculator className="mr-2" size={16} />
                    )}
                    Otimizar
                  </button>
                </div>
              </div>

              {/* Resultado do Geocoding */}
              {geocodingResults && (
                <div className={`mt-4 p-3 rounded-lg ${geocodingResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center mb-2">
                    {geocodingResults.success ? (
                      <CheckCircle className="text-green-600 mr-2" size={16} />
                    ) : (
                      <AlertCircle className="text-red-600 mr-2" size={16} />
                    )}
                    <span className="text-sm font-medium">
                      {geocodingResults.success ? 'Geocoding Concluído' : 'Erro no Geocoding'}
                    </span>
                  </div>
                  {geocodingResults.success && geocodingResults.summary && (
                    <div className="text-xs text-gray-600">
                      <div>Sucessos: {geocodingResults.summary.success}</div>
                      <div>Erros: {geocodingResults.summary.errors}</div>
                      <div>Total: {geocodingResults.summary.total}</div>
                      <div>Serviço: {geocodingResults.usedService}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resultados */}
            {optimizedRoute && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Rota Otimizada</h3>
                  <button
                    onClick={exportRoute}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center"
                  >
                    <Download className="mr-1" size={14} />
                    Exportar
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm">
                    <Route className="mr-2" size={16} />
                    <span>Distância: {optimizedRoute.totalDistance.toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="mr-2" size={16} />
                    <span>Tempo: {Math.floor(optimizedRoute.totalTime / 60)}h {optimizedRoute.totalTime % 60}min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {optimizedRoute.visits.map((visit, index) => (
                    <div
                      key={visit.id}
                      className="flex items-center p-2 bg-gray-50 rounded border-l-4 border-blue-500"
                    >
                      <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">
                        {visit.visitOrder}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{visit.school.name}</div>
                        <div className="text-xs text-gray-500">{visit.estimatedTime} min</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mapa */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                <MapPin className="inline-block mr-2" />
                Visualização da Rota
              </h2>

              <MapWithRoutes
                schools={selectedSchoolsData}
                route={optimizedRoute?.visits}
              />

              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Escolas selecionadas: {selectedSchools.length}</span>
                  <span>Geocodificadas: {selectedSchoolsData.filter(s => s.latitude).length}</span>
                </div>
                {optimizedRoute && (
                  <div className="text-blue-600 font-medium">
                    Rota otimizada com {optimizedRoute.visits.length} paradas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default RouteOptimizerLeaflet;