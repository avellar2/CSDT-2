import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet
const iconRetinaUrl = '/leaflet/marker-icon-2x.png';
const iconUrl = '/leaflet/marker-icon.png';
const shadowUrl = '/leaflet/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface School {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface RouteVisit {
  id: string;
  schoolId: number;
  visitOrder: number;
  estimatedTime: number;
  status: string;
  school: School;
}

interface MapProps {
  schools: School[];
  route?: RouteVisit[];
  center?: [number, number];
  zoom?: number;
}

// Função para obter rota real usando OSRM (Open Source Routing Machine)
async function getRealRoute(points: [number, number][]): Promise<[number, number][]> {
  if (points.length < 2) return points;

  try {
    // Constrói a URL do OSRM
    const coordinates = points.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson&overview=full`;
    
    console.log('Buscando rota real:', url);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const geometry = data.routes[0].geometry;
      console.log('Rota real obtida:', geometry.coordinates.length, 'pontos');
      
      // Converte coordenadas [lng, lat] para [lat, lng]
      return geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
    }

    console.warn('Falha no roteamento, usando linha reta');
    return points;
  } catch (error) {
    console.error('Erro ao obter rota real:', error);
    return points;
  }
}

const MapWithRealRoutes: React.FC<MapProps> = ({ 
  schools, 
  route, 
  center = [-22.7858, -43.3119], // Duque de Caxias
  zoom = 11 
}) => {
  const mapRef = useRef<L.Map>(null);
  const [realRoutePoints, setRealRoutePoints] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Cria ícones numerados para a rota
  const createNumberedIcon = (number: number, color: string = '#2563eb') => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${number}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Gera pontos básicos da rota
  const getRoutePoints = () => {
    if (!route || route.length < 2) return [];
    
    return route
      .filter(visit => visit.school.latitude && visit.school.longitude)
      .sort((a, b) => a.visitOrder - b.visitOrder)
      .map(visit => [visit.school.latitude!, visit.school.longitude!] as [number, number]);
  };

  // Busca rota real quando a rota muda
  useEffect(() => {
    const points = getRoutePoints();
    if (points.length >= 2) {
      setIsLoadingRoute(true);
      getRealRoute(points).then(realPoints => {
        setRealRoutePoints(realPoints);
        setIsLoadingRoute(false);
      });
    } else {
      setRealRoutePoints([]);
    }
  }, [route]);

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      {isLoadingRoute && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm z-[1000]">
          Traçando rota real...
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        {/* Camada do mapa */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores das escolas */}
        {schools.map((school, index) => {
          if (!school.latitude || !school.longitude) return null;
          
          const routeVisit = route?.find(v => v.schoolId === school.id);
          const isInRoute = !!routeVisit;
          const visitOrder = routeVisit?.visitOrder;
          
          return (
            <Marker
              key={school.id}
              position={[school.latitude, school.longitude]}
              icon={isInRoute && visitOrder ? 
                createNumberedIcon(visitOrder, '#2563eb') : 
                createNumberedIcon(index + 1, '#6b7280')
              }
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{school.name}</div>
                  <div className="text-gray-600">{school.address}</div>
                  {routeVisit && (
                    <div className="mt-2 text-blue-600">
                      <div>Ordem: {routeVisit.visitOrder}</div>
                      <div>Tempo: {routeVisit.estimatedTime}min</div>
                      <div>Status: {routeVisit.status}</div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Rota real (seguindo ruas) */}
        {realRoutePoints.length > 1 && (
          <Polyline
            positions={realRoutePoints}
            color="#2563eb"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Linha básica (fallback) */}
        {realRoutePoints.length === 0 && route && route.length > 1 && (
          <Polyline
            positions={getRoutePoints()}
            color="#dc2626"
            weight={2}
            opacity={0.5}
            dashArray="5, 10"
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapWithRealRoutes;