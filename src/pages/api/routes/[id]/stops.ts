import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { isRouteManager } from "@/utils/operationalRoutes";

/**
 * GET /api/routes/[id]/stops
 *
 * Escolas que já estão atribuídas à rota operacional do dia, para o
 * planejador importar sem redigitar. A origem de cada escola é informada
 * (demanda, chamado, OS externa, chamado de escala) e nada é transferido
 * entre rotas — a importação é somente leitura.
 */

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const routeId = Number(req.query.id);
  if (!Number.isInteger(routeId) || routeId <= 0) {
    return res.status(400).json({ error: "ID de rota inválido." });
  }

  const route = await prisma.dailyRoute.findUnique({
    where: { id: routeId },
    select: {
      id: true,
      date: true,
      name: true,
      vehicle: true,
      status: true,
      technicians: {
        where: { active: true },
        select: {
          technicianId: true,
          technician: { select: { id: true, displayName: true } },
        },
      },
      demands: { select: { id: true, schoolId: true } },
      technicalTickets: {
        where: { deletedAt: null },
        select: { id: true, schoolId: true },
      },
      osExternas: { select: { id: true, unidadeEscolar: true } },
      chamados: { select: { id: true, escola: true } },
    },
  });

  if (!route) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }

  const isMember = route.technicians.some(
    (membership) => membership.technicianId === auth.profile.id
  );

  if (!isRouteManager(auth.profile.role) && !isMember) {
    return res.status(403).json({ error: "Você não participa desta rota." });
  }

  const sourcesBySchool = new Map<number, Set<string>>();
  const addSource = (schoolId: number, source: string) => {
    const sources = sourcesBySchool.get(schoolId) ?? new Set<string>();
    sources.add(source);
    sourcesBySchool.set(schoolId, sources);
  };

  for (const demand of route.demands) addSource(demand.schoolId, "demanda");
  for (const ticket of route.technicalTickets) addSource(ticket.schoolId, "chamado");

  const unmatched: Array<{ name: string; source: string }> = [];

  const nameOnlyReferences: Array<{ name: string | null; source: string }> = [
    ...route.osExternas.map((item) => ({
      name: item.unidadeEscolar,
      source: "os_externa",
    })),
    ...route.chamados.map((item) => ({
      name: item.escola,
      source: "chamado_escala",
    })),
  ];

  if (nameOnlyReferences.length > 0) {
    const allSchools = await prisma.school.findMany({
      select: { id: true, name: true },
    });

    const byName = new Map<string, number>();
    for (const school of allSchools) {
      byName.set(normalizeName(school.name), school.id);
    }

    for (const reference of nameOnlyReferences) {
      if (!reference.name) continue;
      const schoolId = byName.get(normalizeName(reference.name));
      if (schoolId === undefined) {
        unmatched.push({ name: reference.name, source: reference.source });
        continue;
      }
      addSource(schoolId, reference.source);
    }
  }

  const schoolIds = Array.from(sourcesBySchool.keys());

  const schools =
    schoolIds.length === 0
      ? []
      : await prisma.school.findMany({
          where: { id: { in: schoolIds } },
          select: {
            id: true,
            name: true,
            address: true,
            district: true,
            geocoded: true,
            latitude: true,
            longitude: true,
          },
          orderBy: { name: "asc" },
        });


  return res.status(200).json({
    success: true,
    route: {
      id: route.id,
      name: route.name,
      vehicle: route.vehicle,
      status: route.status,
      date: route.date.toISOString().slice(0, 10),
      technicians: route.technicians.map((membership) => ({
        technicianId: membership.technicianId,
        displayName: membership.technician.displayName,
      })),
    },
    schools: schools.map((school) => ({
      ...school,
      sources: Array.from(sourcesBySchool.get(school.id) ?? []),
    })),
    unmatched,
  });
}
