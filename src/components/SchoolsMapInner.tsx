import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface School {
  id: number;
  name: string;
  address: string;
  district: string;
  director: string | null;
  students: number | null;
  laboratorio: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface OptimizedRoute {
  visits: {
    school: School;
    visitOrder: number;
  }[];
}

interface StartLocation {
  lat: number;
  lng: number;
  name: string;
}

interface SchoolsMapInnerProps {
  schools: School[];
  getDistrictColor: (district: string) => string;
  selectedSchool: School | null;
  optimizedRoute?: OptimizedRoute | null;
  startLocation?: StartLocation;
  onRealRouteCalculated?: (data: { distance: number; duration: number }) => void;
  prioritySchoolIds?: number[];
}

// Componente interno para controlar o mapa
function MapController({ selectedSchool }: { selectedSchool: School | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSchool && selectedSchool.latitude && selectedSchool.longitude) {
      map.flyTo([selectedSchool.latitude, selectedSchool.longitude], 16, {
        duration: 1.5
      });
    }
  }, [selectedSchool, map]);

  return null;
}

const SchoolsMapInner: React.FC<SchoolsMapInnerProps> = ({ schools, getDistrictColor, selectedSchool, optimizedRoute, startLocation, onRealRouteCalculated, prioritySchoolIds = [] }) => {
  const markerRefs = useRef<{ [key: number]: L.Marker | null }>({});
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

  const createDistrictIcon = (color: string) => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: '',
    });
  };

  const createNumberedIcon = (number: number, isPriority: boolean = false) => {
    const bgColor = isPriority ? '#eab308' : '#2563eb'; // Amarelo para prioritárias, azul para normais
    const star = isPriority ? '⭐' : '';
    return L.divIcon({
      html: `<div style="background-color: ${bgColor}; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); position: relative;">
        ${number}
        ${star ? `<div style="position: absolute; top: -8px; right: -8px; font-size: 12px;">${star}</div>` : ''}
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      className: '',
    });
  };

  const createStartIcon = () => {
    return L.divIcon({
      html: `<div style="background-color: #059669; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">🏠</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: '',
    });
  };

  // Função para obter rota real usando OSRM
  const getRealRoute = async (points: [number, number][]): Promise<{
    polyline: [number, number][];
    distance: number; // em km
    duration: number; // em minutos
  }> => {
    if (points.length < 2) return { polyline: points, distance: 0, duration: 0 };

    try {
      const coordinates = points.map(p => `${p[1]},${p[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson&overview=full`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        const geometry = route.geometry;
        const polyline = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        const distance = route.distance / 1000; // metros para km
        const duration = Math.round(route.duration / 60); // segundos para minutos

        return { polyline, distance, duration };
      }
      return { polyline: points, distance: 0, duration: 0 };
    } catch (error) {
      console.error('Erro ao obter rota:', error);
      return { polyline: points, distance: 0, duration: 0 };
    }
  };

  // Busca rota real quando optimizedRoute muda
  useEffect(() => {
    if (optimizedRoute && optimizedRoute.visits.length >= 1) {
      const schoolPoints = optimizedRoute.visits
        .sort((a, b) => a.visitOrder - b.visitOrder)
        .filter(v => v.school.latitude !== null && v.school.longitude !== null)
        .map(v => [v.school.latitude!, v.school.longitude!] as [number, number]);

      // Adiciona CSDT como ponto inicial se existir
      const points = startLocation
        ? [[startLocation.lat, startLocation.lng] as [number, number], ...schoolPoints]
        : schoolPoints;

      if (points.length >= 2) {
        getRealRoute(points).then(result => {
          setRoutePolyline(result.polyline);

          // Passa os dados reais da rota para o componente pai
          if (onRealRouteCalculated && result.distance > 0) {
            onRealRouteCalculated({
              distance: result.distance,
              duration: result.duration
            });
          }
        });
      }
    } else {
      setRoutePolyline([]);
      if (onRealRouteCalculated) {
        onRealRouteCalculated({ distance: 0, duration: 0 });
      }
    }
  }, [optimizedRoute, startLocation, onRealRouteCalculated]);

  // Abrir popup da escola selecionada
  useEffect(() => {
    if (selectedSchool && markerRefs.current[selectedSchool.id]) {
      markerRefs.current[selectedSchool.id]?.openPopup();
    }
  }, [selectedSchool]);

  return (
    <MapContainer
      center={[-22.7858, -43.3119]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
    >
      <MapController selectedSchool={selectedSchool} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marcador do CSDT (ponto de partida) */}
      {startLocation && optimizedRoute && optimizedRoute.visits.length > 0 && (
        <Marker
          key="start-location"
          position={[startLocation.lat, startLocation.lng]}
          icon={createStartIcon()}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <div className="font-bold text-green-600 mb-1">
                🏠 PONTO DE PARTIDA
              </div>
              <p className="font-semibold text-gray-900">{startLocation.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                A rota otimizada começa daqui
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {schools
        .filter(school => school.latitude !== null && school.longitude !== null)
        .map((school) => {
          // Verifica se a escola está na rota otimizada
          const visitInRoute = optimizedRoute?.visits.find(v => v.school.id === school.id);
          const isPriority = prioritySchoolIds.includes(school.id);

          return (
            <Marker
              key={school.id}
              position={[school.latitude!, school.longitude!]}
              icon={visitInRoute
                ? createNumberedIcon(visitInRoute.visitOrder, isPriority)
                : createDistrictIcon(getDistrictColor(school.district))
              }
              ref={(ref) => {
                markerRefs.current[school.id] = ref;
              }}
            >
            <Popup>
              <div className="text-sm min-w-[200px]">
                {visitInRoute && (
                  <div className={`font-bold mb-1 ${isPriority ? 'text-yellow-600' : 'text-blue-600'}`}>
                    #{visitInRoute.visitOrder} na rota {isPriority && '⭐ PRIORITÁRIA'}
                  </div>
                )}
                <p className="font-semibold text-gray-900 mb-1">{school.name}</p>
                {school.address && (
                  <p className="text-gray-600 text-xs mb-1">{school.address}</p>
                )}
                {school.district && (
                  <p className="text-gray-500 text-xs">
                    <span className="font-medium">Distrito:</span> {school.district}
                  </p>
                )}
                {school.director && (
                  <p className="text-gray-500 text-xs">
                    <span className="font-medium">Diretor(a):</span> {school.director}
                  </p>
                )}
                {school.students != null && (
                  <p className="text-gray-500 text-xs">
                    <span className="font-medium">Alunos:</span> {school.students}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Polyline da rota otimizada */}
      {routePolyline.length > 0 && (
        <Polyline
          positions={routePolyline}
          color="#2563eb"
          weight={4}
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
};

export default SchoolsMapInner;
