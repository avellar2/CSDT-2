import { randomUUID } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { isRouteManager } from "@/utils/operationalRoutes";
import { getOsrmProvider } from "@/utils/routePlanner/osrm";
import { createPlanner, PlannerError } from "@/utils/routePlanner/planner";
import {
  assertCanReadOptimization,
  assertOptimizationEditable,
  buildStartLocation,
  buildVisitRows,
  planStartFromMeta,
  readMeta,
  ROUTE_OPTIMIZATION_INCLUDE,
  serializeOptimization,
} from "@/utils/routePlanner/persistence";

/**
 * GET    /api/routes/optimizations/[id] — consulta a rota salva.
 * PATCH  /api/routes/optimizations/[id] — recalcula a rota a partir das
 *        paradas atuais e das prioridades salvas (não mexe em atribuições).
 * DELETE /api/routes/optimizations/[id] — remove um rascunho de rota.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) {
    return res.status(400).json({ error: "ID da rota inválido." });
  }

  const record = await prisma.routeOptimization.findUnique({
    where: { id },
    include: ROUTE_OPTIMIZATION_INCLUDE,
  });

  if (!record) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }

  try {
    await assertCanReadOptimization(auth, record);
  } catch (error) {
    if (error instanceof PlannerError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    throw error;
  }

  if (req.method === "GET") {
    return res.status(200).json({ success: true, optimization: serializeOptimization(record) });
  }

  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({
      error: "Somente ADMIN ou ADMTOTAL podem recalcular ou excluir rotas salvas.",
    });
  }

  try {
    assertOptimizationEditable(record);
  } catch (error) {
    if (error instanceof PlannerError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    throw error;
  }

  if (req.method === "DELETE") {
    await prisma.routeOptimization.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  if (req.method === "PATCH") {
    if (record.RouteVisit.some((visit) => visit.status !== "PENDING")) {
      return res.status(409).json({
        error:
          "Esta rota já tem visitas iniciadas ou concluídas. Encerre-a em vez de recalculá-la.",
        code: "ROUTE_HAS_PROGRESS",
      });
    }

    const meta = readMeta(record);
    if (!meta) {
      return res.status(409).json({
        error: "Os metadados desta rota são de uma versão antiga e não podem ser recalculados.",
      });
    }

    const schools = record.RouteVisit.map((visit) => visit.schoolId);
    const planner = createPlanner({ provider: getOsrmProvider() });
    const dateKey = record.date.toISOString().slice(0, 10);

    let plan;
    try {
      plan = await planner.plan({
        schools,
        prioritySchools: meta.prioritySchoolIds,
        fixedFirstSchoolId: null,
        start: planStartFromMeta(meta),
        returnToStart: meta.returnToStart,
        serviceMinutes: meta.serviceMinutes,
        startTime: meta.startTime,
        dateKey,
        allowApproximate: false,
      });
    } catch (error) {
      if (error instanceof PlannerError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error("Erro ao recalcular rota salva:", error);
      return res.status(500).json({ error: "Erro interno ao recalcular a rota." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.routeVisit.deleteMany({ where: { routeId: id } });

      return tx.routeOptimization.update({
        where: { id },
        data: {
          totalDistance: plan!.totals.distanceMeters,
          totalTime: plan!.totals.totalMinutes,
          optimized: !plan!.approximate,
          algorithm: plan!.algorithm,
          startLocation: buildStartLocation(plan!, {
            dailyRouteId: meta.dailyRouteId,
            savedBy: auth.id,
            prioritySchoolIds: meta.prioritySchoolIds,
          }),
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
      optimization: serializeOptimization(updated),
    });
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: "Método não permitido" });
}
