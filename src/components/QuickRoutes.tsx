import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  Car, 
  NavigationArrow,
  Copy,
  CheckCircle,
  WaveTriangle,
  Plus,
  X,
  ArrowRight,
  Path,
  ArrowSquareOut
} from 'phosphor-react';

interface School {
  id: number;
  name: string;
  address: string;
  district: string;
}

interface Technician {
  id: string;
  name: string;
  technicianId: number;
}

interface RoutePoint {
  school: School;
  order: number;
  estimatedTime?: number;
}

interface QuickRoute {
  technician: Technician;
  points: RoutePoint[];
  totalDistance?: string;
  totalTime?: string;
  googleMapsUrl?: string;
}

interface QuickRoutesProps {
  technicians: Technician[];
  onClose: () => void;
}

const QuickRoutes: React.FC<QuickRoutesProps> = ({ technicians, onClose }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [routes, setRoutes] = useState<QuickRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const [copiedUrls, setCopiedUrls] = useState<string[]>([]);

  // Fetch schools on component mount
  useEffect(() => {
    fetchSchools();
  }, []);

  // Initialize routes when technicians change
  useEffect(() => {
    if (technicians.length > 0) {
      const initialRoutes = technicians.map(tech => ({
        technician: tech,
        points: []
      }));
      setRoutes(initialRoutes);
    }
  }, [technicians]);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/all-schools');
      if (response.ok) {
        const data = await response.json();
        // Filter schools with addresses
        const schoolsWithAddress = data.filter((school: School) => 
          school.address && school.address.trim() !== ''
        );
        setSchools(schoolsWithAddress);
      }
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
    }
  };

  const addSchoolToRoute = (technicianId: string, school: School) => {
    setRoutes(prev => prev.map(route => {
      if (route.technician.id === technicianId) {
        const newPoint: RoutePoint = {
          school,
          order: route.points.length + 1,
          estimatedTime: 60 // Default 1 hour
        };
        return {
          ...route,
          points: [...route.points, newPoint]
        };
      }
      return route;
    }));
  };

  const removeSchoolFromRoute = (technicianId: string, schoolId: number) => {
    setRoutes(prev => prev.map(route => {
      if (route.technician.id === technicianId) {
        const newPoints = route.points
          .filter(point => point.school.id !== schoolId)
          .map((point, index) => ({ ...point, order: index + 1 }));
        return {
          ...route,
          points: newPoints
        };
      }
      return route;
    }));
  };

  const updateEstimatedTime = (technicianId: string, schoolId: number, time: number) => {
    setRoutes(prev => prev.map(route => {
      if (route.technician.id === technicianId) {
        const newPoints = route.points.map(point => 
          point.school.id === schoolId 
            ? { ...point, estimatedTime: time }
            : point
        );
        return { ...route, points: newPoints };
      }
      return route;
    }));
  };

  const generateGoogleMapsUrl = (points: RoutePoint[]): string => {
    if (points.length === 0) return '';
    
    const baseUrl = 'https://www.google.com/maps/dir/';
    const addresses = points
      .sort((a, b) => a.order - b.order)
      .map(point => encodeURIComponent(`${point.school.address}, Duque de Caxias, RJ`))
      .join('/');
    
    return `${baseUrl}${addresses}`;
  };

  const generateOptimalRoute = async (technicianId: string) => {
    const route = routes.find(r => r.technician.id === technicianId);
    if (!route || route.points.length < 2) return;

    setLoading(true);
    try {
      // Simple optimization: sort by district first, then by name
      const optimizedPoints = [...route.points].sort((a, b) => {
        if (a.school.district !== b.school.district) {
          return a.school.district.localeCompare(b.school.district);
        }
        return a.school.name.localeCompare(b.school.name);
      }).map((point, index) => ({ ...point, order: index + 1 }));

      const googleMapsUrl = generateGoogleMapsUrl(optimizedPoints);
      const totalTime = optimizedPoints.reduce((sum, point) => sum + (point.estimatedTime || 60), 0);

      setRoutes(prev => prev.map(r => 
        r.technician.id === technicianId 
          ? { 
              ...r, 
              points: optimizedPoints,
              googleMapsUrl,
              totalTime: `${Math.floor(totalTime / 60)}h ${totalTime % 60}min`
            }
          : r
      ));
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyUrlToClipboard = async (url: string, technicianId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrls(prev => [...prev.filter(id => id !== technicianId), technicianId]);
      setTimeout(() => {
        setCopiedUrls(prev => prev.filter(id => id !== technicianId));
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar URL:', error);
    }
  };

  const getTotalSchoolsInRoutes = () => {
    return routes.reduce((total, route) => total + route.points.length, 0);
  };

  const getAvailableSchools = () => {
    const usedSchoolIds = new Set(
      routes.flatMap(route => route.points.map(point => point.school.id))
    );
    return schools.filter(school => !usedSchoolIds.has(school.id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Path size={28} />
                Rotas Rápidas
              </h2>
              <p className="text-blue-100 mt-1">
                Organize rotas otimizadas para {technicians.length} técnico(s)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Schools Selection */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-blue-500" />
                Escolas Disponíveis ({getAvailableSchools().length})
              </h3>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {getAvailableSchools().map(school => (
                  <div
                    key={school.id}
                    className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 text-sm">{school.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{school.district}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{school.address}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        {routes.map(route => (
                          <button
                            key={route.technician.id}
                            onClick={() => addSchoolToRoute(route.technician.id, school)}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            title={`Adicionar à rota de ${route.technician.name}`}
                          >
                            <Plus size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {getAvailableSchools().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Todas as escolas foram atribuídas</p>
                </div>
              )}
            </div>

            {/* Routes */}
            <div className="lg:col-span-2 space-y-6">
              {routes.map((route, routeIndex) => (
                <div key={route.technician.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {route.technician.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{route.technician.name}</h3>
                        <p className="text-xs text-gray-600">{route.points.length} escola(s)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {route.points.length > 1 && (
                        <button
                          onClick={() => generateOptimalRoute(route.technician.id)}
                          disabled={loading}
                          className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <NavigationArrow size={14} className="inline mr-1" />
                          Otimizar
                        </button>
                      )}
                      
                      {route.googleMapsUrl && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyUrlToClipboard(route.googleMapsUrl!, route.technician.id)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            {copiedUrls.includes(route.technician.id) ? (
                              <CheckCircle size={14} className="text-green-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          
                          <a
                            href={route.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                          >
                            <ArrowSquareOut size={14} className="inline mr-1" />
                            Abrir Rota
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route Points */}
                  <div className="space-y-3">
                    {route.points
                      .sort((a, b) => a.order - b.order)
                      .map((point, pointIndex) => (
                        <div key={point.school.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                            {point.order}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 text-sm">{point.school.name}</h4>
                            <p className="text-xs text-gray-600">{point.school.district}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <select
                              value={point.estimatedTime || 60}
                              onChange={(e) => updateEstimatedTime(
                                route.technician.id, 
                                point.school.id, 
                                Number(e.target.value)
                              )}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value={30}>30min</option>
                              <option value={60}>1h</option>
                              <option value={90}>1h30</option>
                              <option value={120}>2h</option>
                              <option value={180}>3h</option>
                            </select>
                            
                            <button
                              onClick={() => removeSchoolFromRoute(route.technician.id, point.school.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Route Summary */}
                  {route.points.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            <Clock size={14} className="inline mr-1" />
                            Tempo estimado: {route.totalTime || 'Calculando...'}
                          </span>
                        </div>
                        
                        {route.points.length > 1 && (
                          <div className="text-xs text-gray-500">
                            <ArrowRight size={12} className="inline mr-1" />
                            Rota otimizada por distrito
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {route.points.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Car size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Adicione escolas à rota deste técnico</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {getTotalSchoolsInRoutes() > 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Resumo das Rotas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Total de escolas:</span>
                  <div className="text-2xl font-bold text-blue-800">{getTotalSchoolsInRoutes()}</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Técnicos ativos:</span>
                  <div className="text-2xl font-bold text-blue-800">
                    {routes.filter(r => r.points.length > 0).length}
                  </div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Rotas geradas:</span>
                  <div className="text-2xl font-bold text-blue-800">
                    {routes.filter(r => r.googleMapsUrl).length}
                  </div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Escolas disponíveis:</span>
                  <div className="text-2xl font-bold text-blue-800">{getAvailableSchools().length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickRoutes;