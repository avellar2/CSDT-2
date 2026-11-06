import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle,
  Pencil,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { getAuthHeaders } from "@/utils/client-auth";
import {
  routeIsEmpty,
  type DailyRouteDTO,
  type RouteCounts,
  type RouteTechnicianDTO,
} from "@/utils/dailyRouteDto";

export type { DailyRouteDTO, RouteCounts, RouteTechnicianDTO };

export type RouteFilterValue = "all" | "unassigned" | number;

interface TechnicianOption {
  id: number;
  displayName: string;
  role: string;
}

interface DailyRoutesPanelProps {
  dateKey: string;
  routes: DailyRouteDTO[];
  canManage: boolean;
  selectedFilter: RouteFilterValue;
  onSelectFilter: (value: RouteFilterValue) => void;
  onChanged: () => void | Promise<void>;
  unassignedCount?: number;
  /** Falha ao carregar as rotas: não confundir com "nenhuma rota cadastrada". */
  routesUnavailable?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planejada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Encerrada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-gray-100 text-gray-600 border-gray-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data?.error || data?.message || fallback;
  } catch {
    return fallback;
  }
}

/** Contador desconhecido aparece como "—", nunca como zero. */
const RouteCountCell: React.FC<{ label: string; value: number | undefined }> = ({
  label,
  value,
}) => (
  <div className="bg-white rounded-lg p-2 border border-gray-100">
    <div className="text-base font-bold text-gray-800">
      {typeof value === "number" ? value : "—"}
    </div>
    <div className="text-[11px] text-gray-500">{label}</div>
  </div>
);

function routeTechniciansOf(route: DailyRouteDTO): RouteTechnicianDTO[] {
  return Array.isArray(route.technicians) ? route.technicians : [];
}

const DailyRoutesPanel: React.FC<DailyRoutesPanelProps> = ({
  dateKey,
  routes,
  canManage,
  selectedFilter,
  onSelectFilter,
  onChanged,
  unassignedCount = 0,
  routesUnavailable = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<DailyRouteDTO | null>(null);
  const [profiles, setProfiles] = useState<TechnicianOption[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [formTechnicianIds, setFormTechnicianIds] = useState<number[]>([]);

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR")),
    [profiles]
  );

  const loadProfiles = useCallback(async () => {
    if (profiles.length > 0) return;
    setLoadingProfiles(true);
    try {
      const response = await fetch("/api/routes/technicians", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(await readError(response, "Erro ao buscar técnicos"));
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao buscar técnicos");
    } finally {
      setLoadingProfiles(false);
    }
  }, [profiles.length]);

  const openCreateModal = () => {
    setEditingRoute(null);
    setFormName(`Rota ${routes.length + 1}`);
    setFormVehicle("");
    setFormTechnicianIds([]);
    setError(null);
    setIsModalOpen(true);
    void loadProfiles();
  };

  const openEditModal = (route: DailyRouteDTO) => {
    setEditingRoute(route);
    setFormName(route.name);
    setFormVehicle(route.vehicle || "");
    setFormTechnicianIds(
      routeTechniciansOf(route).map((tech) => tech.technicianId)
    );
    setError(null);
    setIsModalOpen(true);
    void loadProfiles();
  };

  const toggleTechnician = (technicianId: number) => {
    setFormTechnicianIds((current) =>
      current.includes(technicianId)
        ? current.filter((id) => id !== technicianId)
        : [...current, technicianId]
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError("Informe o nome da rota.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!editingRoute) {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            date: dateKey,
            name: formName.trim(),
            vehicle: formVehicle.trim() || null,
            technicianIds: formTechnicianIds,
          }),
        });

        if (!response.ok) {
          throw new Error(await readError(response, "Erro ao criar rota"));
        }
      } else {
        const response = await fetch(`/api/routes/${editingRoute.id}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formName.trim(),
            vehicle: formVehicle.trim() || null,
          }),
        });

        if (!response.ok) {
          throw new Error(await readError(response, "Erro ao atualizar rota"));
        }

        const currentIds = new Set(
          routeTechniciansOf(editingRoute).map((tech) => tech.technicianId)
        );
        const nextIds = new Set(formTechnicianIds);

        const toAdd = formTechnicianIds.filter((id) => !currentIds.has(id));
        const toRemove = routeTechniciansOf(editingRoute)
          .map((tech) => tech.technicianId)
          .filter((id) => !nextIds.has(id));

        for (const technicianId of toAdd) {
          const addResponse = await fetch(
            `/api/routes/${editingRoute.id}/technicians`,
            {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({ technicianId }),
            }
          );
          if (!addResponse.ok) {
            throw new Error(
              await readError(addResponse, "Erro ao adicionar técnico à rota")
            );
          }
        }

        for (const technicianId of toRemove) {
          const removeResponse = await fetch(
            `/api/routes/${editingRoute.id}/technicians`,
            {
              method: "DELETE",
              headers: getAuthHeaders(),
              body: JSON.stringify({ technicianId }),
            }
          );
          if (!removeResponse.ok) {
            throw new Error(
              await readError(removeResponse, "Erro ao remover técnico da rota")
            );
          }
        }
      }

      setIsModalOpen(false);
      await onChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar rota");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (route: DailyRouteDTO) => {
    const isClosed = route.status === "COMPLETED" || route.status === "CANCELLED";
    const nextStatus = isClosed ? "PLANNED" : "COMPLETED";

    const confirmed = confirm(
      isClosed
        ? `Reabrir a rota ${route.name}?`
        : `Encerrar a rota ${route.name}? As demandas e OS são preservadas.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/routes/${route.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await readError(response, "Erro ao alterar status"));
      await onChanged();
    } catch (statusError) {
      alert(statusError instanceof Error ? statusError.message : "Erro ao alterar status");
    }
  };

  const handleDelete = async (route: DailyRouteDTO) => {
    if (!routeIsEmpty(route)) {
      alert(
        "Esta rota possui demandas, chamados ou OS externas associados. Encerre a rota em vez de excluí-la."
      );
      return;
    }

    if (
      !confirm(
        `Excluir a rota ${route.name}? Só é possível excluir rotas sem demandas, chamados ou OS externas.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/routes/${route.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(await readError(response, "Erro ao excluir rota"));
      if (selectedFilter === route.id) onSelectFilter("all");
      await onChanged();
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "Erro ao excluir rota");
    }
  };

  useEffect(() => {
    if (canManage && isModalOpen) void loadProfiles();
  }, [canManage, isModalOpen, loadProfiles]);

  const isClosed = (status: string) =>
    status === "COMPLETED" || status === "CANCELLED";

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <RouteIcon size={20} className="text-indigo-500" />
          Rotas do dia
        </h2>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={16} />
            Adicionar Rota
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => onSelectFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selectedFilter === "all"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Todas
        </button>

        {routes.map((route) => (
          <button
            key={route.id}
            onClick={() => onSelectFilter(route.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedFilter === route.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {route.name}
          </button>
        ))}

        {canManage && (
          <button
            onClick={() => onSelectFilter("unassigned")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedFilter === "unassigned"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            Sem rota {unassignedCount > 0 ? `(${unassignedCount})` : ""}
          </button>
        )}
      </div>

      {routes.length === 0 ? (
        <p className="text-sm text-gray-500">
          {routesUnavailable
            ? "Não foi possível carregar as rotas deste dia. Tente novamente; as demandas continuam disponíveis."
            : "Nenhuma rota cadastrada para este dia. O funcionamento tradicional continua valendo enquanto não houver rotas."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {routes.map((route) => (
            <div
              key={route.id}
              className={`rounded-xl border p-4 ${
                isClosed(route.status)
                  ? "border-gray-200 bg-gray-50"
                  : "border-indigo-100 bg-indigo-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{route.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${
                        STATUS_STYLES[route.status] || STATUS_STYLES.PLANNED
                      }`}
                    >
                      {STATUS_LABELS[route.status] || route.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Car size={14} />
                    {route.vehicle || "Sem veículo informado"}
                  </p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(route)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Editar rota"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(route)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                      title={isClosed(route.status) ? "Reabrir rota" : "Encerrar rota"}
                    >
                      {isClosed(route.status) ? (
                        <RotateCcw size={15} />
                      ) : (
                        <CheckCircle size={15} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(route)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title={
                        routeIsEmpty(route)
                          ? "Excluir rota vazia"
                          : "Rota com demandas, chamados ou OS externas não pode ser excluída"
                      }
                      disabled={!routeIsEmpty(route)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Técnicos
                </p>
                <div className="flex flex-wrap gap-1">
                  {routeTechniciansOf(route).length > 0 ? (
                    routeTechniciansOf(route).map((tech, index) => (
                      <span
                        key={
                          tech.membershipId ??
                          `${route.id}-${tech.technicianId}-${index}`
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-indigo-100 text-indigo-700 text-xs rounded-full"
                      >
                        <Users size={12} />
                        {tech.displayName}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">Nenhum técnico</span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <RouteCountCell
                  label="Demandas"
                  value={route.counts?.demands}
                />
                <RouteCountCell
                  label="Chamados"
                  value={route.counts?.tickets}
                />
                <RouteCountCell
                  label="Reagend."
                  value={route.counts?.chamados}
                />
                <RouteCountCell
                  label="OS externas"
                  value={route.counts?.osExternas}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRoute ? `Editar ${editingRoute.name}` : "Adicionar Rota"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da rota
                </label>
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex.: Rota 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Veículo (opcional)
                </label>
                <input
                  value={formVehicle}
                  onChange={(event) => setFormVehicle(event.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ex.: Carro X"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Técnicos participantes
                </label>
                {loadingProfiles ? (
                  <p className="text-sm text-gray-500">Carregando técnicos...</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {sortedProfiles.map((profile) => {
                      const checked = formTechnicianIds.includes(profile.id);
                      return (
                        <label
                          key={profile.id}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTechnician(profile.id)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1">{profile.displayName}</span>
                          <span className="text-[11px] text-gray-400">
                            {profile.role}
                          </span>
                        </label>
                      );
                    })}
                    {sortedProfiles.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">
                        Nenhum técnico disponível.
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Um técnico não pode estar em duas rotas ativas no mesmo dia.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar rota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyRoutesPanel;
