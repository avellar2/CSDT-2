import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, SpinnerGap, Warning, MagnifyingGlass, PencilSimple, List, Check, Star } from 'phosphor-react';

interface School {
  id: number;
  name: string;
  address: string;
  district: string;
  director: string | null;
  students: number | null;
  laboratorio: number | null;
  geocoded: boolean;
  latitude: number | null;
  longitude: number | null;
}

// Cores por distrito
const districtColors: Record<string, string> = {
  '1': '#ef4444',
  '2': '#f97316',
  '3': '#eab308',
  '4': '#22c55e',
  '5': '#3b82f6',
  '6': '#8b5cf6',
  '7': '#ec4899',
  '8': '#14b8a6',
};

export function getDistrictColor(district: string): string {
  const match = district?.match(/\d+/);
  if (match) return districtColors[match[0]] || '#6b7280';
  const hash = district?.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) || 0;
  const colors = Object.values(districtColors);
  return colors[hash % colors.length] || '#6b7280';
}

const SchoolsMapInner = dynamic(() => import('./SchoolsMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
    </div>
  ),
});

interface SchoolsMapModalProps {
  onClose: () => void;
  userRole?: string | null;
}

const ADMIN_ROLES = ['ADMTOTAL', 'ADMIN'];

const SchoolsMapModal: React.FC<SchoolsMapModalProps> = ({ onClose, userRole }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Geocoding state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ done: 0, total: 0, current: '' });
  const stopGeocodingRef = useRef(false);

  // Panel state
  const [showPanel, setShowPanel] = useState(false);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [newAddress, setNewAddress] = useState('');
  const [editMode, setEditMode] = useState<'address' | 'coords'>('address');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Route optimization state
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<number[]>([]);
  const [prioritySchoolIds, setPrioritySchoolIds] = useState<number[]>([]); // Escolas prioritárias
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [realRouteData, setRealRouteData] = useState<{ distance: number; duration: number } | null>(null);

  // CSDT (ponto de partida) - Coordenadas do Centro de Suporte ao Desenvolvimento Tecnológico
  const CSDT_LOCATION = {
    lat: -22.78986385281102,
    lng: -43.30904663652884,
    name: 'CSDT - Centro de Suporte ao Desenvolvimento Tecnológico'
  };

  const fetchSchools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schools-with-coordinates');
      if (!response.ok) throw new Error('Erro ao buscar escolas');
      const data = await response.json();
      setSchools(data);
    } catch (err) {
      setError('Não foi possível carregar as escolas.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSchools = async () => {
    try {
      const response = await fetch('/api/all-schools');
      if (!response.ok) throw new Error('Erro ao buscar todas as escolas');
      const data = await response.json();
      setAllSchools(data);
    } catch (err) {
      console.error('Erro ao buscar todas as escolas:', err);
    }
  };

  const saveSchoolAddress = async () => {
    if (!editingSchool) return;

    setIsSaving(true);
    try {
      const body: Record<string, unknown> = { schoolId: editingSchool.id };

      if (editMode === 'coords') {
        if (!newLat.trim() || !newLng.trim()) return;
        body.latitude = newLat.trim();
        body.longitude = newLng.trim();
      } else {
        if (!newAddress.trim()) return;
        body.newAddress = newAddress.trim();
      }

      const response = await fetch('/api/update-school-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      await Promise.all([fetchSchools(), fetchAllSchools()]);

      setEditingSchool(null);
      setNewAddress('');
      setNewLat('');
      setNewLng('');

      if (editMode === 'coords') {
        alert('Coordenadas salvas! A escola já aparecerá no mapa.');
      } else {
        alert('Endereço atualizado! Clique em "Geocodificar" para atualizar o mapa.');
      }
    } catch (err) {
      alert('Erro ao atualizar.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => { fetchSchools(); }, []);

  useEffect(() => {
    if (showPanel) fetchAllSchools();
  }, [showPanel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const startGeocoding = async () => {
    setIsGeocoding(true);
    stopGeocodingRef.current = false;
    let done = 0;

    while (!stopGeocodingRef.current) {
      try {
        const res = await fetch('/api/geocode-next-school', { method: 'POST' });
        const data = await res.json();

        if (data.done) break;

        done++;
        setGeocodingProgress({
          done,
          total: done + (data.remaining ?? 0),
          current: data.school ?? '',
        });

        // Aguarda 1.1s para respeitar limite do Nominatim
        await new Promise(r => setTimeout(r, 1100));
      } catch {
        break;
      }
    }

    setIsGeocoding(false);
    // Recarrega escolas após geocodificação
    await fetchSchools();
  };

  const stopGeocoding = () => { stopGeocodingRef.current = true; };

  const handleRealRouteCalculated = (data: { distance: number; duration: number }) => {
    setRealRouteData(data);
  };

  const handleOptimizeRoute = async () => {
    if (selectedSchoolIds.length < 2) {
      alert('Selecione pelo menos 2 escolas');
      return;
    }

    setIsOptimizing(true);
    setRealRouteData(null); // Reset para mostrar "Calculando rota real..."
    try {
      const response = await fetch('/api/route-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId: 1, // Pode ser ajustado conforme necessário
          date: new Date().toISOString(),
          schools: selectedSchoolIds,
          prioritySchools: prioritySchoolIds, // Escolas prioritárias
          startLocation: CSDT_LOCATION // Ponto de partida: CSDT
        })
      });

      const result = await response.json();

      if (result.success && result.optimization) {
        // Normaliza a estrutura de dados para o formato esperado
        const normalizedRoute = {
          totalDistance: result.optimization.totalDistance,
          totalTime: result.optimization.totalTime,
          algorithm: result.metrics?.algorithm || 'nearest_neighbor',
          visits: (result.optimization.RouteVisit || []).map((visit: any) => ({
            id: visit.id,
            visitOrder: visit.visitOrder,
            school: visit.School
          }))
        };
        setOptimizedRoute(normalizedRoute);
      } else {
        alert('Erro ao otimizar rota: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      alert('Erro ao otimizar rota');
    } finally {
      setIsOptimizing(false);
    }
  };

  const isAdmin = ADMIN_ROLES.includes(userRole || '');
  const noSchools = !isLoading && !error && schools.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-teal-600 text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <MapPin size={22} weight="fill" />
          <h2 className="text-xl font-semibold">Mapa de Escolas</h2>
          {!isLoading && !error && schools.length > 0 && (
            <span className="bg-white/20 text-white text-sm px-2 py-0.5 rounded-full">
              {schools.length} escola{schools.length !== 1 ? 's' : ''}
            </span>
          )}
          {isAdmin && !isLoading && !isGeocoding && (
            <button
              onClick={startGeocoding}
              className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Geocodificar escolas restantes"
            >
              <MapPin size={16} weight="fill" />
              Geocodificar
            </button>
          )}
          {isAdmin && isGeocoding && (
            <button
              onClick={stopGeocoding}
              className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <SpinnerGap size={16} className="animate-spin" />
              Pausar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title={showPanel ? "Fechar lista" : "Ver todas as escolas"}
            >
              <List size={24} />
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Fechar (Esc)">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Painel Lateral */}
        {showPanel && isAdmin && (
          <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-[900]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar escola..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {allSchools.length} escolas • {allSchools.filter(s => s.geocoded && s.latitude && s.longitude).length} geocodificadas
              </p>

              {/* Route optimization section */}
              <div className="border-t pt-4 mt-4">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      {selectedSchoolIds.length} escola(s) selecionada(s)
                    </span>
                    {selectedSchoolIds.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedSchoolIds([]);
                          setPrioritySchoolIds([]);
                          setOptimizedRoute(null);
                          setRealRouteData(null);
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>
                  {prioritySchoolIds.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} weight="fill" className="text-yellow-500" />
                      <span className="text-xs text-yellow-600 dark:text-yellow-500">
                        {prioritySchoolIds.length} prioritária(s)
                      </span>
                    </div>
                  )}
                </div>

                {selectedSchoolIds.length >= 2 && (
                  <button
                    onClick={handleOptimizeRoute}
                    disabled={isOptimizing}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    {isOptimizing ? 'Otimizando...' : 'Otimizar Rota'}
                  </button>
                )}

                {/* Optimized route metrics */}
                {optimizedRoute && optimizedRoute.visits && Array.isArray(optimizedRoute.visits) && (
                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-white text-sm">Rota Otimizada</h4>
                    <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      {realRouteData && realRouteData.distance > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span>📏 Distância real:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {realRouteData.distance.toFixed(1)} km
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🚗 Tempo de viagem:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {Math.floor(realRouteData.duration / 60)}h {realRouteData.duration % 60}min
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>⏱ Tempo total:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {Math.floor((realRouteData.duration + (optimizedRoute.visits.length * 30)) / 60)}h {(realRouteData.duration + (optimizedRoute.visits.length * 30)) % 60}min
                            </span>
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 italic mt-1 flex items-center gap-1">
                            <span>✓</span>
                            <span>Rota real via OSRM (viagem + 30min/escola)</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <SpinnerGap size={14} className="animate-spin text-blue-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                              Calculando rota real via OSRM...
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            📏 Estimativa: {optimizedRoute.totalDistance?.toFixed(1) || 0} km (linha reta)
                          </div>
                        </>
                      )}
                      <div className="text-xs text-gray-600 dark:text-gray-400 pt-1 border-t border-blue-200 dark:border-blue-800">
                        Algoritmo: {optimizedRoute.algorithm === 'genetic' ? 'Genético' : 'Vizinho Mais Próximo'}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Ordem de visitas:</div>
                      <ol className="text-xs space-y-1">
                        {/* Ponto de partida */}
                        <li className="flex items-center gap-2 mb-1 pb-1 border-b border-blue-200 dark:border-blue-800">
                          <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">
                            🏠
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">CSDT (Início)</span>
                        </li>

                        {/* Escolas */}
                        {optimizedRoute.visits.map((visit: any, index: number) => {
                          const isPriority = prioritySchoolIds.includes(visit.school?.id);
                          return (
                            <li key={visit.id} className="flex items-center gap-2">
                              <span className={`${isPriority ? 'bg-yellow-500' : 'bg-blue-600'} text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0`}>
                                {index + 1}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                {visit.school?.name || 'Escola'}
                                {isPriority && <Star size={12} weight="fill" className="text-yellow-500" />}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {allSchools
                .filter(school =>
                  school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (school.address || '').toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(school => (
                  <div
                    key={school.id}
                    className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedSchool?.id === school.id ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-l-teal-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox para seleção de rota */}
                      {school.geocoded && school.latitude && school.longitude && (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="checkbox"
                            checked={selectedSchoolIds.includes(school.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedSchoolIds([...selectedSchoolIds, school.id]);
                              } else {
                                setSelectedSchoolIds(selectedSchoolIds.filter(id => id !== school.id));
                                // Remove da lista de prioritárias se desmarcar
                                setPrioritySchoolIds(prioritySchoolIds.filter(id => id !== school.id));
                              }
                            }}
                            className="w-4 h-4 flex-shrink-0 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />

                          {/* Estrela de prioridade - só aparece se a escola estiver selecionada */}
                          {selectedSchoolIds.includes(school.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (prioritySchoolIds.includes(school.id)) {
                                  setPrioritySchoolIds(prioritySchoolIds.filter(id => id !== school.id));
                                } else {
                                  setPrioritySchoolIds([...prioritySchoolIds, school.id]);
                                }
                              }}
                              className="flex-shrink-0 hover:scale-110 transition-transform"
                              title={prioritySchoolIds.includes(school.id) ? "Remover prioridade" : "Marcar como prioritária"}
                            >
                              <Star
                                size={16}
                                weight={prioritySchoolIds.includes(school.id) ? "fill" : "regular"}
                                className={prioritySchoolIds.includes(school.id) ? "text-yellow-500" : "text-gray-400"}
                              />
                            </button>
                          )}
                        </div>
                      )}

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (school.geocoded && school.latitude && school.longitude) {
                            setSelectedSchool(school);
                          }
                        }}
                      >
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {school.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {school.address || 'Sem endereço'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {school.geocoded && school.latitude && school.longitude ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Geocodificada
                            </span>
                          ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Não geocodificada
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSchool(school);
                          setNewAddress(school.address || '');
                          setNewLat(school.latitude?.toString() || '');
                          setNewLng(school.longitude?.toString() || '');
                          setEditMode('address');
                        }}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                        title="Editar endereço"
                      >
                        <PencilSimple size={18} className="text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {editingSchool && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Editar Localização
              </h3>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {editingSchool.name}
              </p>

              {/* Toggle endereço / coordenadas */}
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-4">
                <button
                  onClick={() => setEditMode('address')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    editMode === 'address'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Endereço
                </button>
                <button
                  onClick={() => setEditMode('coords')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    editMode === 'coords'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Latitude / Longitude
                </button>
              </div>

              {editMode === 'address' ? (
                <>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
                    Novo Endereço (copie do Google Maps)
                  </label>
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    placeholder="Cole o endereço completo do Google Maps aqui..."
                  />
                </>
              ) : (
                <>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
                    Coordenadas (do Google Maps ou outro serviço)
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Latitude</label>
                      <input
                        type="text"
                        value={newLat}
                        onChange={(e) => setNewLat(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="-22.7604274"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Longitude</label>
                      <input
                        type="text"
                        value={newLng}
                        onChange={(e) => setNewLng(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="-43.3021450"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    A escola será marcada como geocodificada imediatamente, sem precisar usar o botão Geocodificar.
                  </p>
                </>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveSchoolAddress}
                  disabled={
                    isSaving ||
                    (editMode === 'address' ? !newAddress.trim() : !newLat.trim() || !newLng.trim())
                  }
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Salvar
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingSchool(null);
                    setNewAddress('');
                    setNewLat('');
                    setNewLng('');
                  }}
                  disabled={isSaving}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative">
        {/* Carregando */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Carregando escolas...</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-red-500">
              <Warning size={48} className="mx-auto mb-3" />
              <p className="text-lg font-medium">{error}</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Nenhuma escola geocodificada */}
        {noSchools && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
              <MapPin size={56} className="mx-auto mb-4 text-teal-500" weight="duotone" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                Nenhuma escola no mapa ainda
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                As escolas precisam ser geocodificadas (converter endereço em coordenadas)
                antes de aparecerem no mapa.
              </p>

              {isAdmin && !isGeocoding && (
                <button
                  onClick={startGeocoding}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Geocodificar Escolas Automaticamente
                </button>
              )}

              {isAdmin && isGeocoding && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-teal-600">
                    <SpinnerGap size={20} className="animate-spin" />
                    <span className="font-medium text-sm">Geocodificando...</span>
                  </div>
                  {geocodingProgress.total > 0 && (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-teal-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${(geocodingProgress.done / geocodingProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {geocodingProgress.done} / {geocodingProgress.total} •{' '}
                        <span className="truncate">{geocodingProgress.current}</span>
                      </p>
                    </>
                  )}
                  <button
                    onClick={stopGeocoding}
                    className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Pausar
                  </button>
                </div>
              )}

              {!isAdmin && (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Solicite ao administrador para geocodificar as escolas.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Geocodificando com escolas já existentes (progresso flutuante) */}
        {isGeocoding && schools.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px]">
            <SpinnerGap size={20} className="animate-spin text-teal-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {geocodingProgress.done}/{geocodingProgress.total} geocodificadas
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <div
                  className="bg-teal-500 h-1.5 rounded-full transition-all"
                  style={{ width: geocodingProgress.total ? `${(geocodingProgress.done / geocodingProgress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <button onClick={stopGeocoding} className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0">
              Parar
            </button>
          </div>
        )}

        {/* Mapa */}
        {!isLoading && !error && schools.length > 0 && (
          <SchoolsMapInner
            schools={schools}
            getDistrictColor={getDistrictColor}
            selectedSchool={selectedSchool}
            optimizedRoute={optimizedRoute}
            startLocation={CSDT_LOCATION}
            onRealRouteCalculated={handleRealRouteCalculated}
            prioritySchoolIds={prioritySchoolIds}
          />
        )}
        </div>
      </div>
    </div>
  );
};

export default SchoolsMapModal;
