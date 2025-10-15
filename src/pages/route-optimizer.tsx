import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Select from 'react-select';
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { Clock, MapPin, Route, Users, Calculator, RefreshCw, Download } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

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

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const center = {
  lat: -22.7858, // Duque de Caxias
  lng: -43.3119
};

const RouteOptimizer: React.FC = () => {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<{ value: number; label: string } | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<{ value: number; label: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);

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
      
      if (result.success) {
        alert(`Geocoding concluído: ${result.summary.success} sucessos, ${result.summary.errors} erros`);
        fetchSchools(); // Atualiza lista
      }
    } catch (error) {
      console.error('Erro no geocoding:', error);
      alert('Erro ao geocodificar endereços');
    }
    setIsGeocoding(false);
  };

  const handleOptimize = async () => {
    if (!selectedTechnician || selectedSchools.length === 0) {
      alert('Selecione um técnico e pelo menos uma escola');
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
          schools: selectedSchools.map(s => s.value),
          startLocation
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setOptimizedRoute(result.optimization);
        
        // Gera rota no Google Maps
        if (result.optimization.visits.length > 1) {
          generateDirections(result.optimization.visits);
        }
        
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

  const generateDirections = (visits: RouteVisit[]) => {
    if (visits.length < 2) return;

    const waypoints = visits.slice(1, -1).map(visit => ({
      location: new google.maps.LatLng(
        visit.school.latitude!,
        visit.school.longitude!
      ),
      stopover: true
    }));

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new google.maps.LatLng(
          visits[0].school.latitude!,
          visits[0].school.longitude!
        ),
        destination: new google.maps.LatLng(
          visits[visits.length - 1].school.latitude!,
          visits[visits.length - 1].school.longitude!
        ),
        waypoints,
        optimizeWaypoints: false, // Já otimizamos
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirectionsResponse(result);
        }
      }
    );
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
    isDisabled: !school.latitude
  }));

  const technicianOptions = technicians.map(tech => ({
    value: tech.id,
    label: tech.name
  }));

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <Route className="inline-block mr-2" />
            Otimizador de Rotas
          </h1>
          <p className="text-gray-600">
            Otimize as rotas dos técnicos para reduzir tempo de deslocamento
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
                    className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center"
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
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
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

              <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={11}
                >
                  {/* Marcadores das escolas selecionadas */}
                  {selectedSchools.map((selected, index) => {
                    const school = schools.find(s => s.id === selected.value);
                    if (!school?.latitude || !school?.longitude) return null;
                    
                    return (
                      <Marker
                        key={school.id}
                        position={{ lat: school.latitude, lng: school.longitude }}
                        label={{
                          text: `${index + 1}`,
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                        title={school.name}
                      />
                    );
                  })}

                  {/* Rota otimizada */}
                  {directionsResponse && (
                    <DirectionsRenderer
                      directions={directionsResponse}
                      options={{
                        suppressMarkers: true, // Usa nossos marcadores customizados
                        polylineOptions: {
                          strokeColor: '#2563eb',
                          strokeWeight: 4
                        }
                      }}
                    />
                  )}
                </GoogleMap>
              </LoadScript>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default RouteOptimizer;