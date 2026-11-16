import { randomUUID } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { AuthUser, requireAuth } from "@/utils/api-auth";
import {
  isRouteManager,
  isValidDateKey,
  prismaDateFromKey,
  prismaDateTimeFromDateKey,
} from "@/utils/operationalRoutes";
import { getOsrmProvider } from "@/utils/routePlanner/osrm";
import { createPlanner, MAX_STOPS, PlannerError } from "@/utils/routePlanner/planner";
import {
  assertCanManageRoute,
  assertOptimizationEditable,
  buildStartLocation,
  buildVisitRows,
  canSavePlans,
  readMeta,
  resolveTechnicianId,
  ROUTE_OPTIMIZATION_INCLUDE,
  serializeOptimization,
} from "@/utils/routePlanner/persistence";

/**
 * GET  /api/routes/optimizations?date=YYYY-MM-DD[&dailyRouteId=N]
 *      Lista as rotas salvas da data (filtradas pelo escopo do usuário).
 *
 * POST /api/routes/optimizations
 *      Confirma e grava uma rota. A ordem recebida é revalidada no servidor e
 *      os tempos/distâncias são recalculados no roteador — nada do que o
 *      cliente enviou é aceito como métrica.
 */

function parseIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, auth: AuthUser) {
  const dateKey = req.query.date;
  if (!isValidDateKey(dateKey)) {
    return res.status(400).json({ error: "date deve estar no formato YYYY-MM-DD." });
  }

  const dailyRouteFilter =
    req.query.dailyRouteId === undefined
      ? null
      : Number(req.query.dailyRouteId);

  if (
    dailyRouteFilter !== null &&
    (!Number.isInteger(dailyRouteFilter) || dailyRouteFilter <= 0)
  ) {
    return res.status(400).json({ error: "dailyRouteId inválido." });
  }

  const records = await prisma.routeOptimization.findMany({
    where: { date: prismaDateTimeFromDateKey(dateKey) },
    include: ROUTE_OPTIMIZATION_INCLUDE,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const role = auth.profile.role;

  if (isRouteManager(role)) {
    const filteredByRoute =
      dailyRouteFilter === null
        ? records
        : records.filter((record) => readMeta(record)?.dailyRouteId === dailyRouteFilter);

    return res.status(200).json({
      success: true,
      date: dateKey,
      optimizations: filteredByRoute.map(serializeOptimization),
    });
  }

  // Técnico enxerga as rotas das quais participa na data, mesmo quando o
  // registro foi gravado em nome de outro técnico do mesmo carro.
  const memberships = await prisma.dailyRouteTechnician.findMany({
    where: {
      technicianId: auth.profile.id,
      active: true,
      routeDate: prismaDateFromKey(dateKey),
    },
    select: { routeId: true },
  });

  const myRouteIds = new Set(memberships.map((membership) => membership.routeId));

  const visible = records.filter((record) => {
    if (record.technicianId === auth.profile.id) return true;
    const meta = readMeta(record);
    return meta?.dailyRouteId != null && myRouteIds.has(meta.dailyRouteId);
  });

  const filtered = dailyRouteFilter === null
    ? visible
    : visible.filter((record) => readMeta(record)?.dailyRouteId === dailyRouteFilter);

  return res.status(200).json({
    success: true,
    date: dateKey,
    optimizations: filtered.map(serializeOptimization),
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, auth: AuthUser) {
  if (!canSavePlans(auth.profile.role)) {
    return res.status(403).json({
      error: "Somente ADMIN, ADMTOTAL ou técnicos podem salvar rotas.",
    });
  }

  const body = (req.body || {}) as Record<string, unknown>;

  if (!isValidDateKey(body.dateKey)) {
    return res.status(400).json({ error: "dateKey deve estar no formato YYYY-MM-DD." });
  }

  const schools = parseIds(body.schools);
  const order = parseIds(body.order);

  if (schools.length === 0) {
    return res.status(400).json({ error: "Selecione ao menos uma escola." });
  }

  if (schools.length > MAX_STOPS) {
    return res.status(400).json({
      error: `A otimização aceita no máximo ${MAX_STOPS} escolas por rota.`,
    });
  }

  if (order.length !== schools.length) {
    return res.status(400).json({
      error: "A ordem de visitas precisa conter todas as escolas selecionadas.",
    });
  }

  const dailyRouteId =
    body.dailyRouteId === undefined || body.dailyRouteId === null
      ? null
      : Number(body.dailyRouteId);

  if (dailyRouteId !== null && (!Number.isInteger(dailyRouteId) || dailyRouteId <= 0)) {
    return res.status(400).json({ error: "dailyRouteId inválido." });
  }

  let access;
  try {
    access = await assertCanManageRoute(auth, dailyRouteId);
  } catch (error) {
    if (error instanceof PlannerError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    throw error;
  }

  const planner = createPlanner({ provider: getOsrmProvider() });

  let plan: Awaited<ReturnType<typeof planner.planFixedOrder>>;
  try {
    plan = await planner.planFixedOrder(
      {
        schools,
        prioritySchools: parseIds(body.prioritySchools),
        fixedFirstSchoolId: null,
        start:
          body.start && typeof body.start === "object"
            ? (body.start as { lat: number; lng: number; name: string })
            : null,
        returnToStart: Boolean(body.returnToStart),
        serviceMinutes: body.serviceMinutes as number | undefined,
        startTime: body.startTime as string | undefined,
        dateKey: body.dateKey,
        allowApproximate: Boolean(body.allowApproximate),
      },
      order
    );
  } catch (error) {
    if (error instanceof PlannerError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error("Erro ao recalcular rota para salvar:", error);
    return res.status(500).json({ error: "Erro interno ao calcular a rota." });
  }

  const technicianId = resolveTechnicianId(auth, access);
  const routeDate = prismaDateTimeFromDateKey(body.dateKey);
  const prioritySchoolIds = parseIds(body.prioritySchools);

  // Reaproveita a otimização em planejamento da mesma data/rota em vez de
  // criar duplicatas. Rotas encerradas ou com visitas já iniciadas nunca são
  // sobrescritas.
  const candidates = await prisma.routeOptimization.findMany({
    where: { date: routeDate, status: "PLANNED" },
    include: {
      RouteVisit: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const existing = candidates.find((record) => {
    const meta = readMeta(record);
    if (meta?.dailyRouteId !== dailyRouteId) return false;
    // Sem rota operacional não há equipe: cada usuário só substitui o próprio
    // rascunho.
    if (dailyRouteId === null && meta.savedBy !== auth.id) return false;
    return true;
  });

  if (existing) {
    try {
      assertOptimizationEditable(existing);
    } catch (error) {
      if (error instanceof PlannerError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      throw error;
    }

    if (existing.RouteVisit.some((visit) => visit.status !== "PENDING")) {
      return res.status(409).json({
        error:
          "Esta rota já tem visitas iniciadas ou concluídas. Encerre-a em vez de recalculá-la.",
        code: "ROUTE_HAS_PROGRESS",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.routeVisit.deleteMany({ where: { routeId: existing.id } });

      return tx.routeOptimization.update({
        where: { id: existing.id },
        data: {
          technicianId,
          date: routeDate,
          totalDistance: plan!.totals.distanceMeters,
          totalTime: plan!.totals.totalMinutes,
          optimized: !plan!.approximate,
          algorithm: plan!.algorithm,
          startLocation: buildStartLocation(plan!, {
            dailyRouteId,
            savedBy: auth.id,
            prioritySchoolIds,
          }),
          status: "PLANNED",
          updatedAt: new Date(),
          RouteVisit: {
            create: buildVisitRows(plan!).map((visit) => ({
              id: randomUUID(),
              ...visit,
            })),
          },
        },
        include: ROUTE_OPTIMIZATION_INCLUDE,
      });
    });

    return res.status(200).json({
      success: true,
      replaced: true,
      optimization: serializeOptimization(updated),
    });
  }

  const created = await prisma.routeOptimization.create({
    data: {
      id: `route-${body.dateKey}-${randomUUID()}`,
      technicianId,
      date: routeDate,
      totalDistance: plan.totals.distanceMeters,
      totalTime: plan.totals.totalMinutes,
      optimized: !plan.approximate,
      algorithm: plan.algorithm,
      startLocation: buildStartLocation(plan, {
        dailyRouteId,
        savedBy: auth.id,
        prioritySchoolIds,
      }),
      status: "PLANNED",
      updatedAt: new Date(),
      RouteVisit: {
        create: buildVisitRows(plan).map((visit) => ({
          id: randomUUID(),
          ...visit,
        })),
      },
    },
    include: ROUTE_OPTIMIZATION_INCLUDE,
  });

  return res.status(201).json({
    success: true,
    replaced: false,
    optimization: serializeOptimization(created),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    return handleGet(req, res, auth);
  }

  if (req.method === "POST") {
    return handlePost(req, res, auth);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Método não permitido" });
}
