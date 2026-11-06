import React, { useState, useEffect } from "react";
import Select from "react-select";

export interface DemandModalRoute {
  id: number;
  name: string;
  vehicle?: string | null;
}

interface DemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demand: {
    id?: number;
    schoolId: number;
    demand: string;
    routeId?: number | null;
    date?: string;
  }) => void;
  initialData?: {
    id?: number;
    schoolId: number;
    demand: string;
    routeId?: number | null;
  };
  schools: { id: number; name: string }[]; // Lista de escolas
  routes?: DemandModalRoute[];
  dateKey?: string;
  allowRouteSelection?: boolean;
}

const DemandModal: React.FC<DemandModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  schools,
  routes = [],
  dateKey,
  allowRouteSelection = true,
}) => {
  const [selectedSchool, setSelectedSchool] = useState<{ value: number; label: string } | null>(null);
  const [demand, setDemand] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<{ value: number; label: string } | null>(null);

  useEffect(() => {
    const initialRoute =
      initialData?.routeId != null
        ? routes.find((route) => route.id === initialData.routeId)
        : undefined;

    if (initialData) {
      const school = schools.find((s) => s.id === initialData.schoolId);
      setSelectedSchool(school ? { value: school.id, label: school.name } : null);
      setDemand(initialData.demand);
      setSelectedRoute(
        initialRoute
          ? {
              value: initialRoute.id,
              label: initialRoute.vehicle
                ? `${initialRoute.name} — ${initialRoute.vehicle}`
                : initialRoute.name,
            }
          : null
      );
    } else {
      setSelectedSchool(null);
      setDemand("");
      setSelectedRoute(null);
    }
  }, [initialData, schools, routes]);

  const handleSubmit = () => {
    if (!selectedSchool || !demand) {
      alert("Preencha todos os campos!");
      return;
    }

    onSave({
      id: initialData?.id,
      schoolId: selectedSchool.value,
      demand,
      routeId: selectedRoute?.value ?? null,
      date: dateKey,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-sm sm:max-w-md">
        <h2 className="text-lg sm:text-2xl font-bold mb-4">
          {initialData ? "Editar Demanda" : "Adicionar Demanda"}
        </h2>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Escola</label>
          <Select
            className="text-zinc-700"
            options={schools.map((school) => ({
              value: school.id,
              label: school.name,
            }))}
            value={selectedSchool}
            onChange={(option) => setSelectedSchool(option)}
            placeholder="Selecione uma escola..."
            isClearable
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Demanda</label>
          <textarea
            value={demand}
            onChange={(e) => setDemand(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            rows={4}
          />
        </div>
        {allowRouteSelection && routes.length > 0 && (
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Rota</label>
            <Select
              className="text-zinc-700"
              options={routes.map((route) => ({
                value: route.id,
                label: route.vehicle
                  ? `${route.name} — ${route.vehicle}`
                  : route.name,
              }))}
              value={selectedRoute}
              onChange={(option) => setSelectedRoute(option)}
              placeholder="Sem rota (fila administrativa)"
              isClearable
            />
            <p className="text-xs text-gray-500 mt-1">
              Demandas sem rota ficam visíveis apenas para a administração
              enquanto existirem rotas neste dia.
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 w-full sm:w-auto"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemandModal;
