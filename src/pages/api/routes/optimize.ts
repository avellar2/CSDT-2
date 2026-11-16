import { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/utils/api-auth";
import { getOsrmProvider } from "@/utils/routePlanner/osrm";
import type { PlannerStart } from "@/utils/routePlanner/types";
import { createPlanner, MAX_STOPS, PlannerError } from "@/utils/routePlanner/planner";
import { loadRouteAccess } from "@/utils/routePlanner/persistence";

const PREVIEW_ROLES = ["ADMIN", "ADMTOTAL", "TECH", "ONLYREAD"];

/**
 * POST /api/routes/optimize
 *
 * Pré-visualização da rota otimizada. **Nada é gravado no banco** — a
 * persistência só acontece em `/api/routes/optimizations` após a confirmação
 * do usuário.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!PREVIEW_ROLES.includes(auth.profile.role)) {
    return res.status(403).json({ error: "Sem permissão para calcular rotas." });
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const schools = Array.isArray(body.schools) ? body.schools : [];

  if (schools.length === 0) {
    return res.status(400).json({ error: "Selecione ao menos uma escola." });
  }

  if (schools.length > MAX_STOPS) {
    return res.status(400).json({
      error: `A otimização aceita no máximo ${MAX_STOPS} escolas por rota.`,
    });
  }

  const dailyRouteId =
    body.dailyRouteId === undefined || body.dailyRouteId === null
      ? null
      : Number(body.dailyRouteId);

  if (dailyRouteId !== null) {
    if (!Number.isInteger(dailyRouteId) || dailyRouteId <= 0) {
      return res.status(400).json({ error: "dailyRouteId inválido." });
    }

    const access = await loadRouteAccess(dailyRouteId);
    if (!access) {
      return res.status(404).json({ error: "Rota operacional não encontrada." });
    }

    if (
      auth.profile.role === "TECH" &&
      !access.technicianIds.includes(auth.profile.id)
    ) {
      return res.status(403).json({ error: "Você não participa desta rota." });
    }

    if (auth.profile.role === "ONLYREAD") {
      // Somente leitura pode simular a otimização, mas não sobre rota alheia.
      return res.status(403).json({
        error: "Perfil somente leitura não pode otimizar rotas operacionais.",
      });
    }
  }

  const planner = createPlanner({ provider: getOsrmProvider() });

  // Quando o usuário já ajustou a ordem manualmente, recalcula os horários
  // sobre essa ordem (validando as prioridades) em vez de reotimizar.
  const manualOrder = Array.isArray(body.order)
    ? body.order.map((item) => Number(item))
    : null;

  const request = {
    schools: schools.map((item) => Number(item)),
    prioritySchools: Array.isArray(body.prioritySchools)
      ? body.prioritySchools.map((item) => Number(item))
      : [],
    fixedFirstSchoolId:
      body.fixedFirstSchoolId === undefined || body.fixedFirstSchoolId === null
        ? null
        : Number(body.fixedFirstSchoolId),
    start:
      body.start && typeof body.start === "object"
        ? (body.start as PlannerStart)
        : null,
    returnToStart: Boolean(body.returnToStart),
    serviceMinutes: body.serviceMinutes as number | undefined,
    startTime: body.startTime as string | undefined,
    dateKey: String(body.dateKey ?? ""),
    allowApproximate: Boolean(body.allowApproximate),
  };

  try {
    const plan =
      manualOrder && manualOrder.length > 0
        ? await planner.planFixedOrder(request, manualOrder)
        : await planner.plan(request);

    return res.status(200).json({ success: true, plan });
  } catch (error) {
    if (error instanceof PlannerError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }

    console.error("Erro ao otimizar rota:", error);
    return res.status(500).json({ error: "Erro interno ao otimizar a rota." });
  }
}
