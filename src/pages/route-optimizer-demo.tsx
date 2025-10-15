import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import dynamic from 'next/dynamic';
import { Clock, MapPin, Route, Users, Calculator, RefreshCw, Download, AlertCircle, CheckCircle, Info } from 'lucide-react';
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

// Coordenadas de exemplo para escolas de Duque de Caxias
const MOCK_COORDINATES = {
  // Centro de Duque de Caxias
  1: { lat: -22.7858, lng: -43.3119 },
  2: { lat: -22.7820, lng: -43.3089 },
  3: { lat: -22.7895, lng: -43.3145 },
  4: { lat: -22.7801, lng: -43.3156 },
  5: { lat: -22.7889, lng: -43.3078 },
  6: { lat: -22.7845, lng: -43.3201 },
  7: { lat: -22.7901, lng: -43.3098 },
  8: { lat: -22.7823, lng: -43.3167 },
  9: { lat: -22.7867, lng: -43.3134 },
  10: { lat: -22.7812, lng: -43.3111 },
};

const RouteOptimizerDemo: React.FC = () => {
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
      
      // Adiciona coordenadas mock às escolas
      const schoolsWithCoords = data.map((school: School) => ({
        ...school,
        latitude: MOCK_COORDINATES[school.id as keyof typeof MOCK_COORDINATES]?.lat,
        longitude: MOCK_COORDINATES[school.id as keyof typeof MOCK_COORDINATES]?.lng
      }));
      
      setSchools(schoolsWithCoords);
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
      const response = await fetch('/api/geocode-schools-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schoolIds: selectedSchoolIds
        })
      });

      const result = await response.json();
      setGeocodingResults(result);
      
      if (result.success) {
        // Atualiza as escolas localmente com as coordenadas obtidas
        const updatedSchools = schools.map(school => {
          const geocodedResult = result.results.find((r: any) => r.schoolId === school.id);
          if (geocodedResult?.coordinates) {
            return {
              ...school,
              latitude: geocodedResult.coordinates.lat,
              longitude: geocodedResult.coordinates.lng
            };
          }
          return school;
        });
        setSchools(updatedSchools);
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

  const handleOptimizeDemo = () => {
    if (!selectedTechnician || selectedSchools.length === 0) {
      alert('Selecione um técnico e pelo menos uma escola');
      return;
    }

    setIsOptimizing(true);

    // Simula otimização com dados mock
    setTimeout(() => {
      const visits: RouteVisit[] = selectedSchools.map((selected, index) => {
        const school = schools.find(s => s.id === selected.value)!;
        return {
          id: `visit-${school.id}`,
          schoolId: school.id,
          visitOrder: index + 1,
          estimatedTime: 30 + Math.floor(Math.random() * 30), // 30-60 min
          status: 'pending',
          school
        };
      });

      // Simula algoritmo de otimização simples (ordenação por distância)
      const center = { lat: -22.7858, lng: -43.3119 };
      visits.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow((a.school.latitude || 0) - center.lat, 2) + 
          Math.pow((a.school.longitude || 0) - center.lng, 2)
        );
        const distB = Math.sqrt(
          Math.pow((b.school.latitude || 0) - center.lat, 2) + 
          Math.pow((b.school.longitude || 0) - center.lng, 2)
        );
        return distA - distB;
      });

      // Recalcula ordem
      visits.forEach((visit, index) => {
        visit.visitOrder = index + 1;
      });

      const mockRoute: OptimizedRoute = {
        id: `route-${Date.now()}`,
        technicianId: selectedTechnician.value,
        date: selectedDate,
        totalDistance: 15.5 + Math.random() * 20, // 15-35 km
        totalTime: visits.reduce((sum, v) => sum + v.estimatedTime, 0) + 60, // tempo + deslocamento
        optimized: true,
        visits
      };

      setOptimizedRoute(mockRoute);
      setIsOptimizing(false);
      alert('Rota otimizada com sucesso! (Demo com dados simulados)');
    }, 2000);
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
    a.download = `rota-demo-${selectedTechnician?.label}-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const schoolOptions = schools.map(school => ({
    value: school.id,
    label: `${school.name} ${school.latitude ? '📍' : '🎯'}`, // 🎯 para mock coords
    isDisabled: false
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
            Otimizador de Rotas (Demo)
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <Info className="text-blue-600 mr-2 mt-0.5" size={16} />
              <div className="text-blue-800 text-sm">
                <div className="font-semibold mb-1">Modo Demonstração</div>
                <div>Esta é uma versão demo que funciona com coordenadas simuladas. 
                📍 = coordenadas reais do geocoding, 🎯 = coordenadas de exemplo para demonstração.</div>
              </div>
            </div>
          </div>
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
                    Escolas
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
                    onClick={handleOptimizeDemo}
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
                      {geocodingResults.warning && (
                        <div className="text-orange-600 mt-1">{geocodingResults.warning}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resultados */}
            {optimizedRoute && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Rota Otimizada (Demo)</h3>
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
                  <span>Com coordenadas: {selectedSchoolsData.filter(s => s.latitude).length}</span>
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

export default RouteOptimizerDemo;