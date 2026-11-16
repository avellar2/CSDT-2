import { Prisma } from "@prisma/client";
import prisma from "@/utils/prisma";
import { AuthUser } from "@/utils/api-auth";
import { isRouteManager } from "@/utils/operationalRoutes";
import { ExcludedSchool, PlanResult, PlannerStart } from "./types";
import { PlannerError } from "./planner";

/**
 * Persistência das rotas otimizadas.
 *
 * Não há coluna dedicada para a rota operacional em `RouteOptimization`, então
 * os metadados do plano (rota operacional, serviço por escola, geometria etc.)
 * vivem no campo JSON `startLocation`, sem migração destrutiva. As paradas usam
 * `RouteVisit` (ordem, distância do trecho, horários e status).
 */

export const ROUTE_OPTIMIZATION_INCLUDE = {
  RouteVisit: {
    include: {
      School: {
        select: {
          id: true,
          name: true,
          address: true,
          district: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: { visitOrder: "asc" as const },
  },
} satisfies Prisma.RouteOptimizationInclude;

export type RouteOptimizationRecord = Prisma.RouteOptimizationGetPayload<{
  include: typeof ROUTE_OPTIMIZATION_INCLUDE;
}>;

export interface OptimizationMeta {
  dailyRouteId: number | null;
  serviceMinutes: number;
  startTime: string;
  returnToStart: boolean;
  provider: string;
  approximate: boolean;
  prioritySchoolIds: number[];
  excluded: ExcludedSchool[];
  warnings: string[];
  geometry: [number, number][];
  startName: string;
  lat: number;
  lng: number;
  savedAt: string;
  savedBy: string;
}

/** Geometrias muito grandes não vão para o JSON (recarregadas sob demanda). */
const MAX_PERSISTED_GEOMETRY_POINTS = 4000;

export function readMeta(record: {
  startLocation: Prisma.JsonValue | null;
}): OptimizationMeta | null {
  const raw = record.startLocation;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const value = raw as Record<string, unknown>;
  const lat = Number(value.lat);
  const lng = Number(value.lng);

  return {
    dailyRouteId:
      typeof value.dailyRouteId === "number" ? value.dailyRouteId : null,
    serviceMinutes:
      typeof value.serviceMinutes === "number" ? value.serviceMinutes : 30,
    startTime: typeof value.startTime === "string" ? value.startTime : "08:00",
    returnToStart: Boolean(value.returnToStart),
    provider: typeof value.provider === "string" ? value.provider : "osrm",
    approximate: Boolean(value.approximate),
    prioritySchoolIds: Array.isArray(value.prioritySchoolIds)
      ? (value.prioritySchoolIds as unknown[])
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item))
      : [],
    excluded: Array.isArray(value.excluded)
      ? (value.excluded as ExcludedSchool[])
      : [],
    warnings: Array.isArray(value.warnings)
      ? (value.warnings as unknown[]).filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    geometry: Array.isArray(value.geometry)
      ? (value.geometry as unknown[]).filter(
          (item): item is [number, number] =>
            Array.isArray(item) && item.length === 2
        )
      : [],
    startName:
      typeof value.startName === "string" ? value.startName : "Ponto de partida",
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
    savedBy: typeof value.savedBy === "string" ? value.savedBy : "",
  };
}

export function serializeOptimization(record: RouteOptimizationRecord) {
  const meta = readMeta(record);

  return {
    id: record.id,
    date: record.date.toISOString().slice(0, 10),
    technicianId: record.technicianId,
    status: record.status,
    algorithm: record.algorithm,
    provider: meta?.provider ?? "osrm",
    approximate: meta?.approximate ?? false,
    totalDistanceMeters: record.totalDistance ?? 0,
    totalTimeMinutes: record.totalTime ?? 0,
    serviceMinutes: meta?.serviceMinutes ?? 30,
    startTime: meta?.startTime ?? "08:00",
    returnToStart: meta?.returnToStart ?? false,
    dailyRouteId: meta?.dailyRouteId ?? null,
    prioritySchoolIds: meta?.prioritySchoolIds ?? [],
    excluded: meta?.excluded ?? [],
    warnings: meta?.warnings ?? [],
    start: meta ? { lat: meta.lat, lng: meta.lng, name: meta.startName } : null,
    geometry: meta?.geometry ?? [],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    visits: record.RouteVisit.map((visit) => ({
      id: visit.id,
      schoolId: visit.schoolId,
      visitOrder: visit.visitOrder,
      status: visit.status,
      serviceMinutes: visit.estimatedTime,
      distanceMeters: visit.distance ?? 0,
      arrivalTime: visit.arrivalTime?.toISOString() ?? null,
      departureTime: visit.departureTime?.toISOString() ?? null,
      school: {
        id: visit.School.id,
        name: visit.School.name,
        address: visit.School.address,
        district: visit.School.district,
        latitude: visit.School.latitude,
        longitude: visit.School.longitude,
      },
    })),
  };
}

export type SerializedOptimization = ReturnType<typeof serializeOptimization>;

export function buildStartLocation(
  plan: PlanResult,
  params: {
    dailyRouteId: number | null;
    savedBy: string;
    prioritySchoolIds: number[];
  }
): Prisma.InputJsonValue {
  const geometry =
    plan.geometry.length > MAX_PERSISTED_GEOMETRY_POINTS
      ? plan.geometry.slice(0, MAX_PERSISTED_GEOMETRY_POINTS)
      : plan.geometry;

  const meta: OptimizationMeta = {
    dailyRouteId: params.dailyRouteId,
    serviceMinutes: plan.serviceMinutes,
    startTime: plan.startTime,
    returnToStart: plan.returnToStart,
    provider: plan.provider,
    approximate: plan.approximate,
    prioritySchoolIds: params.prioritySchoolIds,
    excluded: plan.excluded,
    warnings: plan.warnings,
    geometry,
    startName: plan.start.name,
    lat: plan.start.lat,
    lng: plan.start.lng,
    savedAt: new Date().toISOString(),
    savedBy: params.savedBy,
  };

  return meta as unknown as Prisma.InputJsonValue;
}

export function buildVisitRows(plan: PlanResult) {
  return plan.stops.map((stop) => ({
    schoolId: stop.schoolId,
    visitOrder: stop.order,
    estimatedTime: stop.serviceMinutes,
    distance: stop.legDistanceMeters,
    arrivalTime: new Date(stop.arrivalTime),
    departureTime: new Date(stop.departureTime),
    status: "PENDING" as const,
  }));
}

/** true quando o plano pode ser gravado por este perfil. */
export function canSavePlans(role: string): boolean {
  return isRouteManager(role) || role === "TECH";
}

export interface RouteAccess {
  dailyRouteId: number;
  technicianIds: number[];
  status: string;
}

/**
 * Valida o acesso à rota operacional. Gestores veem todas; técnicos apenas as
 * rotas das quais participam ativamente.
 */
export async function loadRouteAccess(
  dailyRouteId: number
): Promise<RouteAccess | null> {
  const route = await prisma.dailyRoute.findUnique({
    where: { id: dailyRouteId },
    select: {
      id: true,
      status: true,
      technicians: {
        where: { active: true },
        select: { technicianId: true },
      },
    },
  });

  if (!route) return null;

  return {
    dailyRouteId: route.id,
    status: route.status,
    technicianIds: route.technicians.map((membership) => membership.technicianId),
  };
}

export async function assertCanManageRoute(
  auth: AuthUser,
  dailyRouteId: number | null
): Promise<RouteAccess | null> {
  if (isRouteManager(auth.profile.role)) {
    if (dailyRouteId === null) return null;
    const access = await loadRouteAccess(dailyRouteId);
    if (!access) {
      throw new PlannerError("ROUTE_NOT_FOUND", "Rota operacional não encontrada.", 404);
    }
    return access;
  }

  if (auth.profile.role !== "TECH") {
    throw new PlannerError(
      "FORBIDDEN",
      "Somente ADMIN, ADMTOTAL ou o técnico responsável podem salvar rotas.",
      403
    );
  }

  if (dailyRouteId === null) {
    throw new PlannerError(
      "ROUTE_REQUIRED",
      "Técnicos só podem salvar rotas vinculadas a uma rota operacional do dia.",
      400
    );
  }

  const access = await loadRouteAccess(dailyRouteId);
  if (!access) {
    throw new PlannerError("ROUTE_NOT_FOUND", "Rota operacional não encontrada.", 404);
  }

  if (!access.technicianIds.includes(auth.profile.id)) {
    throw new PlannerError(
      "FORBIDDEN",
      "Você não participa desta rota operacional.",
      403
    );
  }

  return access;
}

/** Escolhe o técnico "dono" do registro, sem confiar em dados do cliente. */
export function resolveTechnicianId(
  auth: AuthUser,
  access: RouteAccess | null
): number {
  if (access && access.technicianIds.length > 0) {
    return access.technicianIds[0];
  }
  return auth.profile.id;
}

/** Um registro só pode ser reescrito enquanto não estiver concluído. */
export function assertOptimizationEditable(record: {
  status: string;
}): void {
  if (record.status === "COMPLETED" || record.status === "CANCELLED") {
    throw new PlannerError(
      "ROUTE_LOCKED",
      "Esta rota já foi encerrada e não pode ser recalculada.",
      409
    );
  }
}

export async function assertCanReadOptimization(
  auth: AuthUser,
  record: { technicianId: number; startLocation: Prisma.JsonValue | null }
): Promise<void> {
  if (isRouteManager(auth.profile.role)) return;

  if (auth.profile.role !== "TECH") {
    throw new PlannerError("FORBIDDEN", "Sem permissão para ver esta rota.", 403);
  }

  if (record.technicianId === auth.profile.id) return;

  const meta = readMeta(record);
  if (meta?.dailyRouteId) {
    const access = await loadRouteAccess(meta.dailyRouteId);
    if (access?.technicianIds.includes(auth.profile.id)) return;
  }

  throw new PlannerError(
    "FORBIDDEN",
    "Esta rota pertence a outra equipe.",
    403
  );
}

export function planStartFromMeta(meta: OptimizationMeta): PlannerStart {
  return { lat: meta.lat, lng: meta.lng, name: meta.startName };
}
