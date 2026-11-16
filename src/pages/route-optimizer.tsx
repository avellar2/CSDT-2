import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calculator,
  Car,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Flag,
  Info,
  MapPin,
  Navigation,
  RefreshCw,
  Route as RouteIcon,
  Save,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getAuthHeaders } from '@/utils/client-auth';
import { getDistrictColor } from '@/utils/districtColors';
import { formatDuration } from '@/utils/routePlanner/schedule';
import type { PlanResult } from '@/utils/routePlanner/types';

const SchoolsMapInner = dynamic(() => import('@/components/SchoolsMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-500">
        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
        <p className="text-sm">Carregando mapa...</p>
      </div>
    </div>
  ),
});

const CSDT_START = {
  lat: -22.78986385281102,
  lng: -43.30904663652884,
  name: 'CSDT - Centro de Suporte ao Desenvolvimento Tecnológico',
};

interface SchoolOption {
  id: number;
  name: string;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded: boolean;
}

interface DailyRouteOption {
  id: number;
  name: string;
  vehicle: string | null;
  status: string;
  technicians: Array<{ technicianId: number; displayName: string }>;
}

const todayKey = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
};

const hasCoords = (school: SchoolOption) =>
  typeof school.latitude === 'number' &&
  typeof school.longitude === 'number' &&
  Number.isFinite(school.latitude) &&
  Number.isFinite(school.longitude);

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

const RouteOptimizer: React.FC = () => {
  const [allSchools, setAllSchools] = useState<SchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [priorityIds, setPriorityIds] = useState<number[]>([]);
  const [firstSchoolId, setFirstSchoolId] = useState<number | null>(null);

  const [dateKey, setDateKey] = useState(todayKey);
  const [dailyRoutes, setDailyRoutes] = useState<DailyRouteOption[]>([]);
  const [dailyRouteId, setDailyRouteId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const [serviceMinutes, setServiceMinutes] = useState(30);
  const [startTime, setStartTime] = useState('08:00');
  const [returnToStart, setReturnToStart] = useState(false);
  const [startPoint, setStartPoint] = useState(CSDT_START);

  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  /* ------------------------------ carregamento ------------------------------ */

  useEffect(() => {
    const load = async () => {
      setSchoolsLoading(true);
      try {
        const response = await fetch('/api/get-school', { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Erro ao carregar escolas');
        const data = (await response.json()) as SchoolOption[];
        setAllSchools(Array.isArray(data) ? data : []);
      } catch {
        setError('Não foi possível carregar as escolas.');
      } finally {
        setSchoolsLoading(false);
      }
    };
    load();
  }, []);

  const loadDailyRoutes = useCallback(async (date: string) => {
    try {
      const response = await fetch(`/api/routes?date=${date}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao carregar rotas');
      const data = await response.json();
      setDailyRoutes(Array.isArray(data.routes) ? data.routes : []);
    } catch {
      setDailyRoutes([]);
    }
  }, []);

  useEffect(() => {
    loadDailyRoutes(dateKey);
  }, [dateKey, loadDailyRoutes]);

  /* -------------------------------- seleção -------------------------------- */

  const schoolsById = useMemo(
    () => new Map(allSchools.map((school) => [school.id, school])),
    [allSchools]
  );

  const filteredSchools = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = allSchools.filter((school) => {
      if (!term) return true;
      return (
        school.name.toLowerCase().includes(term) ||
        (school.district || '').toLowerCase().includes(term) ||
        (school.address || '').toLowerCase().includes(term)
      );
    });
    return list
      .slice()
      .sort((a, b) => Number(hasCoords(b)) - Number(hasCoords(a)) || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 200);
  }, [allSchools, search]);

  const selectedSchools = useMemo(
    () =>
      selectedIds
        .map((id) => schoolsById.get(id))
        .filter((school): school is SchoolOption => Boolean(school)),
    [selectedIds, schoolsById]
  );

  const selectedWithoutCoords = selectedSchools.filter((school) => !hasCoords(school));

  const toggleSchool = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
      setPriorityIds(priorityIds.filter((item) => item !== id));
      if (firstSchoolId === id) setFirstSchoolId(null);
      return;
    }

    setSelectedIds([...selectedIds, id]);
  };

  const togglePriority = (id: number) => {
    setPriorityIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setPriorityIds([]);
    setFirstSchoolId(null);
    setPlan(null);
    setOrder([]);
    setOrderDirty(false);
    setSavedId(null);
  };

  const importFromDailyRoute = async () => {
    if (!dailyRouteId) return;
    setImporting(true);
    setError(null);
    try {
      const response = await fetch(`/api/routes/${dailyRouteId}/stops`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(await readError(response, 'Erro ao importar'));

      const data = await response.json();
      const importedIds: number[] = (data.schools || []).map(
        (school: { id: number }) => school.id
      );

      if (importedIds.length === 0) {
        setNotice('Esta rota operacional não tem escolas atribuídas.');
        return;
      }

      setSelectedIds((previous) => Array.from(new Set([...previous, ...importedIds])));
      setPlan(null);
      setOrder([]);
      setOrderDirty(false);

      const unmatched = (data.unmatched || []).length;
      setNotice(
        `${importedIds.length} escola(s) importada(s) da rota "${data.route?.name ?? ''}".` +
          (unmatched > 0
            ? ` ${unmatched} registro(s) não casaram com o cadastro de escolas.`
            : '')
      );
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  /* ------------------------------- otimização ------------------------------- */

  const buildPayload = (useOrder: boolean) => ({
    dateKey,
    schools: selectedIds,
    order: useOrder ? order : undefined,
    prioritySchools: priorityIds,
    fixedFirstSchoolId: useOrder ? null : firstSchoolId,
    start: startPoint,
    returnToStart,
    serviceMinutes,
    startTime,
    dailyRouteId,
    allowApproximate: false,
  });

  const runOptimization = async (useOrder: boolean, allowApproximate = false) => {
    if (selectedIds.length === 0) {
      setError('Selecione ao menos uma escola.');
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...buildPayload(useOrder),
          allowApproximate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.code === 'ROUTING_UNAVAILABLE' && !allowApproximate) {
          const confirmed = window.confirm(
            `${data.error}\n\nDeseja calcular uma ESTIMATIVA por linha reta? ` +
              'Ela não representa a distância real percorrida.'
          );
          if (confirmed) {
            setIsOptimizing(false);
            await runOptimization(useOrder, true);
            return;
          }
        }
        setError(data.error || 'Não foi possível otimizar a rota.');
        return;
      }

      const nextPlan = data.plan as PlanResult;
      setPlan(nextPlan);
      setOrder(nextPlan.stops.map((stop) => stop.schoolId));
      setOrderDirty(false);
      setSavedId(null);
    } catch {
      setError('Erro ao otimizar a rota.');
    } finally {
      setIsOptimizing(false);
    }
  };

  /** A regra de prioridade é obrigatória também no ajuste manual. */
  const violatesPriority = (nextOrder: number[]) => {
    let seenNormal = false;
    for (const id of nextOrder) {
      if (priorityIds.includes(id)) {
        if (seenNormal) return true;
      } else {
        seenNormal = true;
      }
    }
    return false;
  };

  const applyOrder = (next: number[]) => {
    if (violatesPriority(next)) {
      setError(
        'Todas as escolas prioritárias precisam ser visitadas antes das escolas comuns. ' +
          'Remova a prioridade da escola se ela não deve mais ir primeiro.'
      );
      return;
    }
    setOrder(next);
    setOrderDirty(true);
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    applyOrder(next);
  };

  const makeFirst = (schoolId: number) => {
    applyOrder([schoolId, ...order.filter((id) => id !== schoolId)]);
  };

  /* ------------------------------- persistência ------------------------------ */

  const saveRoute = async () => {
    if (!plan || order.length === 0) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/routes/optimizations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...buildPayload(true),
          order,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Não foi possível salvar a rota.');
        return;
      }

      setSavedId(data.optimization.id);
      setNotice(
        data.replaced
          ? 'Rota salva (versão anterior desta data/equipe atualizada).'
          : 'Rota salva com sucesso.'
      );
      setPlan({ ...plan });
      setOrderDirty(false);
    } catch {
      setError('Erro ao salvar a rota.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------------------------- mapa ---------------------------------- */

  /** Escolas visíveis no mapa: as da rota calculada ou todas com coordenadas. */
  const planSchools = useMemo(() => {
    if (plan) {
      return plan.stops.map((stop) => ({
        id: stop.schoolId,
        name: stop.name,
        address: stop.address || '',
        district: stop.district || '',
        director: null as string | null,
        students: null as number | null,
        laboratorio: null as number | null,
        latitude: stop.latitude,
        longitude: stop.longitude,
      }));
    }

    return allSchools
      .filter((school) => hasCoords(school))
      .map((school) => ({
        id: school.id,
        name: school.name,
        address: school.address || '',
        district: school.district || '',
        director: null as string | null,
        students: null as number | null,
        laboratorio: null as number | null,
        latitude: school.latitude as number,
        longitude: school.longitude as number,
      }));
  }, [plan, allSchools]);

  const mapRoute = useMemo(
    () =>
      plan
        ? {
            visits: plan.stops.map((stop) => ({
              school: {
                id: stop.schoolId,
                name: stop.name,
                address: stop.address || '',
                district: stop.district || '',
                director: null,
                students: null,
                laboratorio: null,
                latitude: stop.latitude,
                longitude: stop.longitude,
              },
              visitOrder: stop.order,
            })),
          }
        : null,
    [plan]
  );

  const stopDetails = useMemo(() => {
    if (!plan) return undefined;
    return Object.fromEntries(
      plan.stops.map((stop) => [
        stop.schoolId,
        {
          order: stop.order,
          arrivalLabel: timeLabel(stop.arrivalTime),
          travelLabel: formatDuration(stop.legDurationSeconds / 60),
          distanceLabel: `${(stop.legDistanceMeters / 1000).toFixed(1)} km`,
          priority: stop.priority,
        },
      ])
    );
  }, [plan]);

  /* --------------------------------- ações ---------------------------------- */

  const orderedStops = useMemo(() => {
    if (!plan) return [];
    const byId = new Map(plan.stops.map((stop) => [stop.schoolId, stop]));
    return order
      .map((id) => byId.get(id))
      .filter((stop): stop is PlanResult['stops'][number] => Boolean(stop));
  }, [plan, order]);

  const googleMapsUrl = useMemo(() => {
    if (!plan || orderedStops.length === 0) return '';
    const points = [
      `${startPoint.lat},${startPoint.lng}`,
      ...orderedStops.map((stop) => `${stop.latitude},${stop.longitude}`),
    ];
    if (returnToStart) points.push(`${startPoint.lat},${startPoint.lng}`);
    return `https://www.google.com/maps/dir/${points.join('/')}`;
  }, [plan, orderedStops, startPoint, returnToStart]);

  const exportCsv = () => {
    if (!plan) return;
    const rows = [
      ['Ordem', 'Escola', 'Endereço', 'Prioritária', 'Chegada', 'Saída', 'Trecho (km)', 'Trecho (min)'],
      ...orderedStops.map((stop) => [
        String(stop.order),
        stop.name,
        stop.address || '',
        stop.priority ? 'Sim' : 'Não',
        timeLabel(stop.arrivalTime),
        timeLabel(stop.departureTime),
        (stop.legDistanceMeters / 1000).toFixed(2),
        (stop.legDurationSeconds / 60).toFixed(0),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rota-${dateKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const routeOptions = useMemo(
    () =>
      dailyRoutes.map((route) => ({
        value: route.id,
        label: `${route.name}${route.vehicle ? ` · ${route.vehicle}` : ''} — ${
          route.technicians.map((technician) => technician.displayName).join(', ') ||
          'sem técnicos'
        }`,
      })),
    [dailyRoutes]
  );

  const selectedRoute = dailyRoutes.find((route) => route.id === dailyRouteId) || null;

  /* --------------------------------- render --------------------------------- */

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-[1700px] px-4 py-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <RouteIcon className="text-blue-600" />
              Planejador de Rotas
            </h1>
            <p className="text-gray-600 mt-1">
              Ordem de visitas calculada pelas vias reais, com prioridades operacionais e horários
              estimados em America/Sao_Paulo.
            </p>
          </header>

          {(error || notice) && (
            <div className="mb-4 space-y-2">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} aria-label="Fechar aviso">
                    <X size={16} />
                  </button>
                </div>
              )}
              {notice && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{notice}</span>
                  <button onClick={() => setNotice(null)} aria-label="Fechar aviso">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-6">
            {/* ------------------------------ configuração ------------------------------ */}
            <aside className="space-y-4">
              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <Car size={16} /> Atendimento
                </h2>

                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Data do atendimento
                </label>
                <input
                  type="date"
                  value={dateKey}
                  onChange={(event) => {
                    setDateKey(event.target.value);
                    setDailyRouteId(null);
                    setPlan(null);
                  }}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />

                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Carro / equipe (rota operacional)
                </label>
                <Select
                  isClearable
                  options={routeOptions}
                  value={routeOptions.find((option) => option.value === dailyRouteId) || null}
                  onChange={(option) => setDailyRouteId(option ? option.value : null)}
                  placeholder={
                    dailyRoutes.length === 0
                      ? 'Nenhuma rota operacional nesta data'
                      : 'Selecione o carro/equipe'
                  }
                  noOptionsMessage={() => 'Nenhuma rota operacional nesta data'}
                  className="text-sm"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                />

                {selectedRoute && (
                  <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      {selectedRoute.technicians.length > 0
                        ? selectedRoute.technicians.map((t) => t.displayName).join(', ')
                        : 'Sem técnicos atribuídos'}
                    </div>
                    <button
                      onClick={importFromDailyRoute}
                      disabled={importing}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {importing ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      Importar escolas desta rota
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <Navigation size={16} /> Trajeto
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tempo de atendimento
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={480}
                        step={5}
                        value={serviceMinutes}
                        onChange={(event) => setServiceMinutes(Number(event.target.value))}
                        className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">min</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Saída
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ponto de partida
                  </label>
                  <input
                    type="text"
                    value={startPoint.name}
                    onChange={(event) =>
                      setStartPoint({ ...startPoint, name: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.000001"
                      value={startPoint.lat}
                      onChange={(event) =>
                        setStartPoint({ ...startPoint, lat: Number(event.target.value) })
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      aria-label="Latitude do ponto de partida"
                    />
                    <input
                      type="number"
                      step="0.000001"
                      value={startPoint.lng}
                      onChange={(event) =>
                        setStartPoint({ ...startPoint, lng: Number(event.target.value) })
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      aria-label="Longitude do ponto de partida"
                    />
                  </div>
                  <button
                    onClick={() => setStartPoint(CSDT_START)}
                    className="mt-1 text-xs text-blue-600 hover:underline"
                  >
                    Restaurar CSDT
                  </button>
                </div>

                <div className="mt-3 flex rounded-lg border border-gray-200 p-1 text-xs">
                  <button
                    onClick={() => setReturnToStart(false)}
                    className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${
                      !returnToStart ? 'bg-blue-600 text-white' : 'text-gray-600'
                    }`}
                  >
                    Somente ida
                  </button>
                  <button
                    onClick={() => setReturnToStart(true)}
                    className={`flex-1 rounded-md px-2 py-1.5 font-medium transition ${
                      returnToStart ? 'bg-blue-600 text-white' : 'text-gray-600'
                    }`}
                  >
                    Ida e volta
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                      <MapPin size={16} /> Escolas
                    </h2>
                    <span className="text-xs text-gray-500">
                      {selectedIds.length} selecionada(s)
                      {priorityIds.length > 0 && ` · ${priorityIds.length} prioritária(s)`}
                    </span>
                  </div>

                  <div className="relative mt-3">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar por nome, distrito ou endereço"
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  {selectedIds.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="mt-2 text-xs text-red-600 hover:underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {schoolsLoading && (
                    <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
                      <RefreshCw size={16} className="animate-spin" /> Carregando escolas...
                    </div>
                  )}

                  {!schoolsLoading &&
                    filteredSchools.map((school) => {
                      const selected = selectedIds.includes(school.id);
                      const priority = priorityIds.includes(school.id);
                      const usable = hasCoords(school);

                      return (
                        <div
                          key={school.id}
                          className={`flex items-start gap-2 border-b border-gray-50 px-3 py-2 text-sm ${
                            selected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSchool(school.id)}
                            className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600"
                            aria-label={`Selecionar ${school.name}`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="truncate font-medium text-gray-800">
                                {school.name}
                              </span>
                              {priority && (
                                <Star size={12} className="flex-shrink-0 fill-yellow-400 text-yellow-500" />
                              )}
                            </div>
                            <div className="truncate text-xs text-gray-500">
                              {school.district ? `Distrito ${school.district} · ` : ''}
                              {school.address || 'Sem endereço'}
                            </div>
                            {!usable && (
                              <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                <AlertTriangle size={10} /> sem coordenadas confiáveis
                              </div>
                            )}
                          </div>

                          {selected && (
                            <button
                              onClick={() => togglePriority(school.id)}
                              title={priority ? 'Remover prioridade' : 'Marcar como prioritária'}
                              className="mt-0.5 flex-shrink-0 rounded p-1 hover:bg-yellow-50"
                            >
                              <Star
                                size={16}
                                className={
                                  priority ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400'
                                }
                              />
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {!schoolsLoading && filteredSchools.length === 0 && (
                    <div className="p-6 text-center text-sm text-gray-500">
                      Nenhuma escola encontrada.
                    </div>
                  )}
                </div>
              </section>

              <div className="space-y-2">
                <button
                  onClick={() => runOptimization(false)}
                  disabled={isOptimizing || selectedIds.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isOptimizing ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Calculator size={18} />
                  )}
                  {isOptimizing ? 'Calculando...' : 'Otimizar rota'}
                </button>

                {plan && (
                  <button
                    onClick={() => runOptimization(orderDirty)}
                    disabled={isOptimizing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                  >
                    <RefreshCw size={16} />
                    Recalcular {orderDirty ? 'nesta ordem' : ''}
                  </button>
                )}
              </div>

              {selectedWithoutCoords.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <AlertTriangle size={14} />
                    {selectedWithoutCoords.length} escola(s) sem coordenadas
                  </div>
                  <p>
                    Elas não entram no trajeto até a localização ser corrigida em{' '}
                    <span className="font-medium">Mapa de Escolas</span>. Nenhuma escola é
                    removida da seleção sem aviso.
                  </p>
                </div>
              )}
            </aside>

            {/* -------------------------------- resultado -------------------------------- */}
            <main className="space-y-4">
              <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="h-[420px] overflow-hidden rounded-lg">
                  {planSchools.length > 0 ? (
                    <SchoolsMapInner
                      schools={planSchools}
                      getDistrictColor={getDistrictColor}
                      selectedSchool={null}
                      optimizedRoute={mapRoute}
                      startLocation={plan?.start ?? startPoint}
                      prioritySchoolIds={priorityIds}
                      routeGeometry={plan?.geometry ?? null}
                      stopDetails={stopDetails}
                      selectedSchoolIds={selectedIds}
                      onToggleSelect={toggleSchool}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-50 text-gray-400">
                      <MapPin size={40} />
                      <p className="text-sm">
                        Nenhuma escola com coordenadas para exibir no mapa.
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-2 px-1 text-xs text-gray-500">
                  Clique em um marcador para adicionar ou remover a escola da rota.
                  {selectedIds.length > 0 &&
                    ' As escolas selecionadas entram na otimização.'}
                </p>
              </section>

              {plan && (
                <>
                  {plan.approximate && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle size={16} />
                        Rota aproximada — não é o trajeto real
                      </div>
                      <p className="mt-1 text-xs">
                        O serviço de roteamento estava indisponível. Distâncias e tempos foram
                        estimados por linha reta com fator de vias. A ordem também é uma
                        estimativa, não a solução ótima.
                      </p>
                    </div>
                  )}

                  {plan.warnings.length > 0 && !plan.approximate && (
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-gray-700">
                        <Info size={14} /> Observações
                      </div>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {plan.warnings.slice(0, 6).map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.excluded.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle size={16} />
                        {plan.excluded.length} escola(s) ficaram fora da rota
                      </div>
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {plan.excluded.map((item) => (
                          <li key={item.schoolId}>
                            <span className="font-medium">{item.name}</span> — {item.reason}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs">
                        Um administrador pode corrigir a localização no Mapa de Escolas.
                      </p>
                    </div>
                  )}

                  <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-xs text-gray-500">Distância total</div>
                      <div className="text-xl font-bold text-gray-900">
                        {(plan.totals.distanceMeters / 1000).toFixed(1)} km
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-xs text-gray-500">Tempo de condução</div>
                      <div className="text-xl font-bold text-blue-700">
                        {formatDuration(plan.totals.drivingSeconds / 60)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-xs text-gray-500">Atendimento</div>
                      <div className="text-xl font-bold text-emerald-700">
                        {formatDuration(plan.totals.serviceMinutes)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-xs text-gray-500">Jornada completa</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatDuration(plan.totals.totalMinutes)}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-800">
                          Ordem das visitas
                        </h2>
                        <p className="text-xs text-gray-500">
                          {plan.algorithm === 'exact'
                            ? 'Ordem exata (menor tempo viário)'
                            : plan.algorithm === 'manual'
                            ? 'Ordem ajustada manualmente'
                            : 'Vizinho mais próximo + 2-opt'}
                          {' · '}
                          {plan.stops.length} parada(s)
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {orderDirty && (
                          <button
                            onClick={() => runOptimization(true)}
                            disabled={isOptimizing}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Recalcular nesta ordem
                          </button>
                        )}
                        <button
                          onClick={saveRoute}
                          disabled={isSaving || orderDirty}
                          title={orderDirty ? 'Recalcule antes de salvar' : 'Salvar rota'}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Salvar rota
                        </button>
                        <a
                          href={googleMapsUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 ${
                            googleMapsUrl ? '' : 'pointer-events-none opacity-50'
                          }`}
                        >
                          <ExternalLink size={14} />
                          Google Maps
                        </a>
                        <button
                          onClick={exportCsv}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Download size={14} />
                          CSV
                        </button>
                      </div>
                    </div>

                    {savedId && (
                      <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
                        Rota salva (id {savedId}).
                      </div>
                    )}

                    <ol className="divide-y divide-gray-100">
                      {orderedStops.map((stop, index) => (
                        <li key={stop.schoolId} className="flex gap-3 px-4 py-3">
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                              stop.priority ? 'bg-yellow-500' : 'bg-blue-600'
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-gray-900">
                                {index + 1}ª parada — {stop.name}
                              </span>
                              {stop.priority && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-800">
                                  <Star size={10} className="fill-yellow-500 text-yellow-600" />
                                  prioritária
                                </span>
                              )}
                            </div>

                            <div className="truncate text-xs text-gray-500">
                              {stop.address || 'Sem endereço'}
                              {stop.district ? ` · Distrito ${stop.district}` : ''}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> Chegada {timeLabel(stop.arrivalTime)} · saída{' '}
                                {timeLabel(stop.departureTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Navigation size={12} />
                                {(stop.legDistanceMeters / 1000).toFixed(1)} km ·{' '}
                                {formatDuration(stop.legDurationSeconds / 60)} desde a parada
                                anterior
                              </span>
                              <span className="flex items-center gap-1 text-gray-400">
                                <Info size={12} /> atendimento {stop.serviceMinutes} min
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 flex-col gap-1">
                            <div className="flex gap-1">
                              <button
                                onClick={() => moveStop(index, -1)}
                                disabled={index === 0}
                                className="rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                                aria-label="Mover para cima"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => moveStop(index, 1)}
                                disabled={index === orderedStops.length - 1}
                                className="rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                                aria-label="Mover para baixo"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                            <button
                              onClick={() => makeFirst(stop.schoolId)}
                              disabled={index === 0}
                              className="flex items-center justify-center gap-1 rounded border border-gray-200 px-1 py-1 text-[10px] text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                              title="Fixar como primeira parada"
                            >
                              <Flag size={10} /> 1ª
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>

                    {returnToStart && (
                      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 text-xs text-gray-600">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                          🏠
                        </div>
                        Retorno ao ponto de partida · {formatDuration(plan.totals.returnMinutes)}
                      </div>
                    )}
                  </section>
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default RouteOptimizer;
export const getServerSideProps = async () => ({ props: {} });
