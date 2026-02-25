import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  latitude: number;
  longitude: number;
}

interface SchoolsMapInnerProps {
  schools: School[];
  getDistrictColor: (district: string) => string;
  selectedSchool: School | null;
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

const SchoolsMapInner: React.FC<SchoolsMapInnerProps> = ({ schools, getDistrictColor, selectedSchool }) => {
  const markerRefs = useRef<{ [key: number]: L.Marker | null }>({});

  const createDistrictIcon = (color: string) => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: '',
    });
  };

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

      {schools.map((school) => (
        <Marker
          key={school.id}
          position={[school.latitude, school.longitude]}
          icon={createDistrictIcon(getDistrictColor(school.district))}
          ref={(ref) => {
            markerRefs.current[school.id] = ref;
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
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
      ))}
    </MapContainer>
  );
};

export default SchoolsMapInner;
