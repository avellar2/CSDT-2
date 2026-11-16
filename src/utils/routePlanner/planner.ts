import prisma from "@/utils/prisma";
import { isValidDateKey } from "@/utils/operationalRoutes";
import {
  ExcludedSchool,
  LatLng,
  PlanRequest,
  PlanResult,
  PlannedStop,
  PlannerSchool,
  PlannerStart,
  RoutingError,
  RoutingProvider,
} from "./types";
import { inspectSchoolGeometry, haversineMeters } from "./geo";
import { solveRoute, validatePriorityOrder } from "./solver";
import {
  buildSchedule,
  DEFAULT_START_TIME,
  normalizeServiceMinutes,
  parseStartTime,
} from "./schedule";

export class PlannerError extends Error {
  statusCode: number;
  code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "PlannerError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** Limite de paradas por cálculo (protege o provedor e o tempo da função). */
export const MAX_STOPS = 40;

/** Fator de correção de linha reta → vias (estimativa conservadora). */
export const APPROXIMATE_ROAD_FACTOR = 1.35;
/** Velocidade média urbana usada apenas no modo aproximado (km/h). */
export const APPROXIMATE_SPEED_KMH = 25;

export const CSDT_START: PlannerStart = {
  lat: -22.78986385281102,
  lng: -43.30904663652884,
  name: "CSDT - Centro de Suporte ao Desenvolvimento Tecnológico",
};

export interface PlannerDeps {
  provider: RoutingProvider;
  loadSchools?: (ids: number[]) => Promise<PlannerSchool[]>;
}

async function defaultLoadSchools(ids: number[]): Promise<PlannerSchool[]> {
  const schools = await prisma.school.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      address: true,
      district: true,
      latitude: true,
      longitude: true,
      geocoded: true,
    },
  });

  return schools;
}

function normalizeStart(start: unknown): PlannerStart {
  if (!start || typeof start !== "object") return { ...CSDT_START };

  const candidate = start as Partial<PlannerStart>;
  const lat = Number(candidate.lat);
  const lng = Number(candidate.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...CSDT_START };
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ...CSDT_START };

  return {
    lat,
    lng,
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name.trim()
        : "Ponto de partida",
  };
}

function normalizeIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
  return Array.from(new Set(ids));
}

/** Matriz aproximada usada somente quando o provedor falha e isso é aceito. */
function buildApproximateMatrix(points: LatLng[]) {
  const durations: number[][] = [];
  const distances: number[][] = [];

  for (let i = 0; i < points.length; i++) {
    durations.push([]);
    distances.push([]);
    for (let j = 0; j < points.length; j++) {
      if (i === j) {
        durations[i][j] = 0;
        distances[i][j] = 0;
        continue;
      }

      const straight = haversineMeters(
        points[i].lat,
        points[i].lng,
        points[j].lat,
        points[j].lng
      );
      const roadMeters = straight * APPROXIMATE_ROAD_FACTOR;
      distances[i][j] = roadMeters;
      // duração em segundos a partir da velocidade média urbana
      durations[i][j] = (roadMeters / 1000 / APPROXIMATE_SPEED_KMH) * 3600;
    }
  }

  return { durations, distances };
}

interface PreparedPlan {
  dateKey: string;
  start: PlannerStart;
  startTime: string;
  serviceMinutes: number;
  returnToStart: boolean;
  usableSchools: PlannerSchool[];
  /** Índices da matriz (1..n) das escolas prioritárias. */
  priorityNodes: number[];
  fixedFirstNode: number | null;
  excluded: ExcludedSchool[];
  warnings: string[];
  points: LatLng[];
  durations: number[][];
  distances: number[][];
  approximate: boolean;
  providerName: string;
  provider: RoutingProvider;
}

async function preparePlan(
  request: PlanRequest,
  deps: PlannerDeps
): Promise<PreparedPlan> {
  if (!isValidDateKey(request.dateKey)) {
    throw new PlannerError(
      "INVALID_DATE",
      "A data deve estar no formato YYYY-MM-DD."
    );
  }

  const requestedIds = normalizeIds(request.schools);
  if (requestedIds.length === 0) {
    throw new PlannerError(
      "NO_SCHOOLS",
      "Selecione ao menos uma escola para montar a rota."
    );
  }

  const loadSchools = deps.loadSchools ?? defaultLoadSchools;
  const loaded = await loadSchools(requestedIds);
  const byId = new Map(loaded.map((school) => [school.id, school]));

  const excluded: ExcludedSchool[] = [];
  const usableSchools: PlannerSchool[] = [];
  const warnings: string[] = [];

  for (const id of requestedIds) {
    const school = byId.get(id);

    if (!school) {
      excluded.push({
        schoolId: id,
        name: `Escola #${id}`,
        reason: "Escola não encontrada no cadastro.",
      });
      continue;
    }

    const inspection = inspectSchoolGeometry(school);

    if (!inspection.usable) {
      excluded.push({
        schoolId: school.id,
        name: school.name,
        reason: inspection.issues[0]?.message ?? "Coordenadas indisponíveis.",
      });
      continue;
    }

    for (const issue of inspection.issues) {
      warnings.push(`${school.name}: ${issue.message}`);
    }

    usableSchools.push({
      ...school,
      latitude: inspection.latitude,
      longitude: inspection.longitude,
    });
  }

  if (usableSchools.length === 0) {
    throw new PlannerError(
      "NO_USABLE_SCHOOLS",
      "Nenhuma das escolas selecionadas tem coordenadas confiáveis. " +
        "Corrija a localização antes de montar a rota.",
      422
    );
  }

  const requestedPriority = new Set(normalizeIds(request.prioritySchools));
  const priorityNodes: number[] = [];
  usableSchools.forEach((school, index) => {
    if (requestedPriority.has(school.id)) priorityNodes.push(index + 1);
  });

  const fixedFirstId =
    request.fixedFirstSchoolId === undefined || request.fixedFirstSchoolId === null
      ? null
      : Number(request.fixedFirstSchoolId);

  let fixedFirstNode: number | null = null;
  if (fixedFirstId !== null) {
    const index = usableSchools.findIndex((school) => school.id === fixedFirstId);
    if (index >= 0) {
      fixedFirstNode = index + 1;
    } else {
      warnings.push(
        "A escola fixada como primeira parada não está na rota selecionada e foi ignorada."
      );
    }
  }

  const start = normalizeStart(request.start);
  const points: LatLng[] = [
    { lat: start.lat, lng: start.lng },
    ...usableSchools.map((school) => ({
      lat: school.latitude as number,
      lng: school.longitude as number,
    })),
  ];

  let matrix: { durations: number[][]; distances: number[][] };
  let approximate = false;

  try {
    if (!deps.provider.enabled) {
      throw new RoutingError(
        "disabled",
        "O serviço de roteamento está desabilitado."
      );
    }
    matrix = await deps.provider.table(points);
  } catch (error) {
    if (!request.allowApproximate) {
      if (error instanceof RoutingError) {
        throw new PlannerError(
          error.code === "too_many_points" ? "TOO_MANY_POINTS" : "ROUTING_UNAVAILABLE",
          `${error.message} Nenhuma rota aproximada foi calculada.`,
          error.code === "too_many_points" ? 400 : 503
        );
      }
      throw error;
    }

    matrix = buildApproximateMatrix(points);
    approximate = true;
    warnings.push(
      "O serviço de roteamento está indisponível. Os tempos e distâncias " +
        "abaixo são ESTIMATIVAS por linha reta com fator de vias — não são " +
        "distâncias reais percorridas."
    );
  }

  return {
    dateKey: request.dateKey,
    start,
    startTime:
      parseStartTime(request.startTime) === null
        ? DEFAULT_START_TIME
        : (request.startTime as string),
    serviceMinutes: normalizeServiceMinutes(request.serviceMinutes),
    returnToStart: Boolean(request.returnToStart),
    usableSchools,
    priorityNodes,
    fixedFirstNode,
    excluded,
    warnings,
    points,
    durations: matrix.durations,
    distances: matrix.distances,
    approximate,
    providerName: approximate ? "estimativa" : deps.provider.name,
    provider: deps.provider,
  };
}

function assertReachable(order: number[], prepared: PreparedPlan): void {
  const path = [0, ...order];
  const unreachable: string[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const cost = prepared.durations[path[i]][path[i + 1]];
    if (!Number.isFinite(cost)) {
      unreachable.push(
        `${prepared.usableSchools[path[i] - 1]?.name ?? "Ponto de partida"} → ${
          prepared.usableSchools[path[i + 1] - 1]?.name ?? "escola"
        }`
      );
    }
  }

  if (prepared.returnToStart && order.length > 0) {
    const last = order[order.length - 1];
    if (!Number.isFinite(prepared.durations[last][0])) {
      unreachable.push(
        `${prepared.usableSchools[last - 1]?.name ?? "escola"} → ${prepared.start.name}`
      );
    }
  }

  if (unreachable.length > 0) {
    throw new PlannerError(
      "NO_ROUTE",
      `Não existe trajeto viário entre alguns pontos: ${unreachable
        .slice(0, 3)
        .join("; ")}${unreachable.length > 3 ? "…" : ""}. ` +
        "Confira as coordenadas das escolas envolvidas.",
      422
    );
  }
}

async function finalize(
  prepared: PreparedPlan,
  order: number[],
  algorithm: string
): Promise<PlanResult> {
  const path = [0, ...order];

  const legs = order.map((node, index) => {
    const previous = path[index];
    return {
      node,
      distance: prepared.distances[previous][node],
      duration: prepared.durations[previous][node],
    };
  });

  const schedule = buildSchedule(
    prepared.dateKey,
    prepared.startTime,
    legs.map((leg) => ({
      travelSeconds: leg.duration,
      serviceMinutes: prepared.serviceMinutes,
    }))
  );

  const prioritySet = new Set(prepared.priorityNodes);

  const stops: PlannedStop[] = legs.map((leg, index) => {
    const school = prepared.usableSchools[leg.node - 1];
    const slot = schedule[index];

    return {
      schoolId: school.id,
      name: school.name,
      address: school.address,
      district: school.district,
      latitude: school.latitude as number,
      longitude: school.longitude as number,
      priority: prioritySet.has(leg.node),
      order: index + 1,
      legDistanceMeters: Math.round(leg.distance),
      legDurationSeconds: Math.round(leg.duration),
      arrivalTime: slot.arrivalTime,
      departureTime: slot.departureTime,
      serviceMinutes: prepared.serviceMinutes,
    };
  });

  const drivingSeconds = legs.reduce((sum, leg) => sum + leg.duration, 0);
  let distanceMeters = legs.reduce((sum, leg) => sum + leg.distance, 0);
  let returnSeconds = 0;

  if (prepared.returnToStart && order.length > 0) {
    const last = order[order.length - 1];
    returnSeconds = prepared.durations[last][0];
    distanceMeters += prepared.distances[last][0];
  }

  const serviceTotal = prepared.serviceMinutes * stops.length;
  const drivingMinutes = drivingSeconds / 60;
  const returnMinutes = returnSeconds / 60;

  const geometry = await resolveGeometry(prepared, order);

  if (geometry.warning) prepared.warnings.push(geometry.warning);

  return {
    stops,
    geometry: geometry.coordinates,
    totals: {
      distanceMeters: Math.round(distanceMeters),
      drivingSeconds: Math.round(drivingSeconds + returnSeconds),
      serviceMinutes: serviceTotal,
      totalMinutes: Math.round(drivingMinutes + returnMinutes + serviceTotal),
      returnMinutes: Math.round(returnMinutes),
    },
    algorithm,
    provider: prepared.providerName,
    approximate: prepared.approximate,
    start: prepared.start,
    returnToStart: prepared.returnToStart,
    serviceMinutes: prepared.serviceMinutes,
    startTime: prepared.startTime,
    dateKey: prepared.dateKey,
    excluded: prepared.excluded,
    warnings: prepared.warnings,
  };
}

async function resolveGeometry(
  prepared: PreparedPlan,
  order: number[]
): Promise<{ coordinates: [number, number][]; warning?: string }> {
  if (prepared.approximate) {
    return {
      coordinates: [
        [prepared.start.lat, prepared.start.lng],
        ...order.map((node) => {
          const school = prepared.usableSchools[node - 1];
          return [school.latitude as number, school.longitude as number] as [
            number,
            number,
          ];
        }),
      ],
    };
  }

  const orderedPoints: LatLng[] = [
    { lat: prepared.start.lat, lng: prepared.start.lng },
    ...order.map((node) => {
      const school = prepared.usableSchools[node - 1];
      return { lat: school.latitude as number, lng: school.longitude as number };
    }),
  ];

  if (prepared.returnToStart) {
    orderedPoints.push({ lat: prepared.start.lat, lng: prepared.start.lng });
  }

  if (orderedPoints.length < 2) {
    return { coordinates: orderedPoints.map((p) => [p.lat, p.lng] as [number, number]) };
  }

  try {
    const geometry = await prepared.provider.route(orderedPoints);
    return { coordinates: geometry.coordinates };
  } catch {
    return {
      coordinates: orderedPoints.map((point) => [point.lat, point.lng] as [number, number]),
      warning:
        "Não foi possível obter o traçado das vias. O mapa mostra apenas os " +
        "pontos; as distâncias e os tempos continuam vindo do roteador.",
    };
  }
}

export interface Planner {
  plan(request: PlanRequest): Promise<PlanResult>;
  planFixedOrder(request: PlanRequest, order: number[]): Promise<PlanResult>;
}

/**
 * Cria o planejador com o provedor injetado. O resultado de `plan` é apenas
 * uma pré-visualização: nada é gravado no banco.
 */
export function createPlanner(deps: PlannerDeps): Planner {
  const plan = async (request: PlanRequest): Promise<PlanResult> => {
    const prepared = await preparePlan(request, deps);

    const stopNodes = prepared.usableSchools.map((_, index) => index + 1);

    const solved = solveRoute({
      durations: prepared.durations,
      distances: prepared.distances,
      startNode: 0,
      stopNodes,
      priorityNodes: prepared.priorityNodes,
      fixedFirstNode: prepared.fixedFirstNode,
      returnToStart: prepared.returnToStart,
    });

    assertReachable(solved.order, prepared);

    if (!Number.isFinite(solved.totalDuration)) {
      throw new PlannerError(
        "NO_ROUTE",
        "Não foi possível encontrar um trajeto viável entre as escolas selecionadas.",
        422
      );
    }

    return finalize(prepared, solved.order, solved.algorithm);
  };

  const planFixedOrder = async (
    request: PlanRequest,
    order: number[]
  ): Promise<PlanResult> => {
    const prepared = await preparePlan(request, deps);

    const validIds = new Set(prepared.usableSchools.map((school) => school.id));
    const normalized = order
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && validIds.has(id));
    const unique = Array.from(new Set(normalized));

    // A ordem precisa cobrir exatamente as escolas com coordenadas: nem
    // faltando, nem repetindo (uma parada duplicada geraria visita dupla).
    if (normalized.length !== unique.length || unique.length !== validIds.size) {
      throw new PlannerError(
        "INVALID_ORDER",
        "A ordem enviada precisa conter cada escola selecionada exatamente uma vez."
      );
    }

    const indexById = new Map(
      prepared.usableSchools.map((school, index) => [school.id, index + 1])
    );
    const nodes = unique.map((id) => indexById.get(id) as number);

    const priorityError = validatePriorityOrder(nodes, prepared.priorityNodes);
    if (priorityError) {
      throw new PlannerError("PRIORITY_VIOLATION", priorityError, 422);
    }

    assertReachable(nodes, prepared);

    return finalize(prepared, nodes, "manual");
  };

  return { plan, planFixedOrder };
}
