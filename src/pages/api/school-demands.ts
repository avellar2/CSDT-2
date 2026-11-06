import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/utils/api-auth";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  canProfileAccessDemand,
  dateKeyFromPrismaDate,
  hasRoutesForDate,
  isValidDateKey,
  prismaDateTimeFromDateKey,
  routeStatusIsOpen,
} from "@/utils/operationalRoutes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Requer autenticação (validada no backend, nunca apenas no React)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === "POST") {
      const { schoolId, demand, date, routeId } = req.body || {};

      if (!schoolId || !demand || !String(demand).trim()) {
        return res.status(400).json({ error: "schoolId e demand são obrigatórios." });
      }

      const parsedSchoolId = Number(schoolId);
      if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
        return res.status(400).json({ error: "schoolId inválido." });
      }

      const dateKey = date === undefined ? formatBrazilDateKey(new Date()) : date;
      if (!isValidDateKey(dateKey)) {
        return res.status(400).json({ error: "date deve estar no formato YYYY-MM-DD." });
      }

      const parsedRouteId = routeId === undefined || routeId === null || routeId === ""
        ? null
        : Number(routeId);

      if (
        parsedRouteId !== null &&
        (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0)
      ) {
        return res.status(400).json({ error: "routeId inválido." });
      }

      if (parsedRouteId !== null) {
        const route = await prisma.dailyRoute.findUnique({
          where: { id: parsedRouteId },
          select: {
            id: true,
            date: true,
            status: true,
            technicians: {
              where: { active: true },
              select: { technicianId: true },
            },
          },
        });

        if (!route) {
          return res.status(404).json({ error: "Rota não encontrada." });
        }

        if (!routeStatusIsOpen(route.status)) {
          return res.status(409).json({
            error: "A rota está encerrada e não pode receber novas demandas.",
          });
        }

        if (dateKeyFromPrismaDate(route.date) !== dateKey) {
          return res.status(400).json({
            error: "A demanda deve pertencer à mesma data da rota.",
          });
        }

        if (
          auth.profile.role === "TECH" &&
          !route.technicians.some(
            (membership) => membership.technicianId === auth.profile.id
          )
        ) {
          return res.status(403).json({
            error: "Você só pode criar demandas na sua própria rota.",
          });
        }
      } else if (auth.profile.role === "TECH" && (await hasRoutesForDate(dateKey))) {
        return res.status(403).json({
          error:
            "Existem rotas nesta data. Selecione a sua rota para criar a demanda.",
        });
      }

      const newDemand = await prisma.schoolDemand.create({
        data: {
          schoolId: parsedSchoolId,
          demand: String(demand),
          // Meio-dia em America/Sao_Paulo evita deslocamento de data.
          createdAt: prismaDateTimeFromDateKey(dateKey),
          routeId: parsedRouteId,
        },
      });

      return res.status(201).json(newDemand);
    }

    if (req.method === "PUT") {
      const { id, schoolId, demand } = req.body || {};

      if (!id || !schoolId || !demand || !String(demand).trim()) {
        return res.status(400).json({ error: "id, schoolId e demand são obrigatórios." });
      }

      const parsedId = Number(id);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "id inválido." });
      }

      const existing = await prisma.schoolDemand.findUnique({
        where: { id: parsedId },
        select: { id: true, createdAt: true, routeId: true },
      });

      if (!existing) {
        return res.status(404).json({ error: "Demanda não encontrada." });
      }

      const canAccess = await canProfileAccessDemand({
        profileId: auth.profile.id,
        role: auth.profile.role,
        demandId: existing.id,
        demandCreatedAt: existing.createdAt,
        demandRouteId: existing.routeId,
      });

      if (!canAccess) {
        return res.status(403).json({ error: "Você não tem acesso a esta demanda." });
      }

      const updatedDemand = await prisma.schoolDemand.update({
        where: { id: parsedId },
        // routeId não é alterado aqui: transferências passam por
        // /api/routes/assign para gerar auditoria e validar a data.
        data: {
          schoolId: Number(schoolId),
          demand: String(demand),
        },
      });

      return res.status(200).json(updatedDemand);
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (error) {
    console.error("Erro no endpoint de demandas:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}
