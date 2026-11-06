import { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  buildRouteConflictKey,
  isValidDateKey,
  isRouteManager,
  prismaDateFromKey,
} from "@/utils/operationalRoutes";
import {
  parseTechnicianIds,
  RouteValidationError,
  routeListInclude,
  serializeRoute,
} from "@/utils/operationalRouteApi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const rawDate = req.query.date;
    const dateKey = isValidDateKey(rawDate)
      ? rawDate
      : formatBrazilDateKey(new Date());

    if (rawDate !== undefined && !isValidDateKey(rawDate)) {
      return res.status(400).json({ error: "date deve estar no formato YYYY-MM-DD." });
    }

    const includeCancelled = req.query.includeCancelled === "1";
    const includeClosed = req.query.includeClosed === "1";

    const routes = await prisma.dailyRoute.findMany({
      where: {
        date: prismaDateFromKey(dateKey),
        ...(includeCancelled ? {} : { status: { not: "CANCELLED" } }),
        ...(includeClosed
          ? {}
          : { status: { in: ["PLANNED", "IN_PROGRESS"] } }),
        ...(auth.profile.role === "TECH"
          ? {
              technicians: {
                some: {
                  technicianId: auth.profile.id,
                  active: true,
                },
              },
            }
          : {}),
      },
      include: routeListInclude,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return res.status(200).json({
      success: true,
      date: dateKey,
      routes: routes.map(serializeRoute),
    });
  }

  if (req.method === "POST") {
    if (!isRouteManager(auth.profile.role)) {
      return res.status(403).json({ error: "Somente ADMIN ou ADMTOTAL podem criar rotas." });
    }

    const { date, name, vehicle, technicianIds } = req.body || {};

    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: "date deve estar no formato YYYY-MM-DD." });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name é obrigatório." });
    }

    const normalizedName = name.trim();
    if (normalizedName.length > 80) {
      return res.status(400).json({ error: "name deve ter no máximo 80 caracteres." });
    }

    const parsedTechnicianIds = parseTechnicianIds(technicianIds ?? []);
    if (parsedTechnicianIds === null) {
      return res.status(400).json({ error: "technicianIds deve ser uma lista de IDs válidos." });
    }

    if (parsedTechnicianIds.length > 0) {
      const profiles = await prisma.profile.findMany({
        where: { id: { in: parsedTechnicianIds }, isActive: true },
        select: { id: true },
      });

      if (profiles.length !== parsedTechnicianIds.length) {
        return res.status(400).json({ error: "Um ou mais técnicos não foram encontrados ou estão inativos." });
      }
    }

    try {
      const route = await prisma.$transaction(async (tx) => {
        const conflicts = await tx.dailyRouteTechnician.findMany({
          where: {
            conflictKey: {
              in: parsedTechnicianIds.map((technicianId) =>
                buildRouteConflictKey(technicianId, date)
              ),
            },
          },
          select: { conflictKey: true },
        });

        if (conflicts.length > 0) {
          throw new RouteValidationError(
            "Um ou mais técnicos já estão em outra rota ativa nesta data.",
            409
          );
        }

        return tx.dailyRoute.create({
          data: {
            date: prismaDateFromKey(date),
            name: normalizedName,
            vehicle:
              typeof vehicle === "string" && vehicle.trim()
                ? vehicle.trim()
                : null,
            status: "PLANNED",
            createdBy: auth.id,
            technicians: {
              create: parsedTechnicianIds.map((technicianId) => ({
                technicianId,
                routeDate: prismaDateFromKey(date),
                active: true,
                conflictKey: buildRouteConflictKey(technicianId, date),
              })),
            },
          },
          include: routeListInclude,
        });
      });

      return res.status(201).json({ success: true, route: serializeRoute(route) });
    } catch (error) {
      if (error instanceof RouteValidationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({
          error: "Já existe uma rota com esse nome nesta data ou técnico em outra rota.",
        });
      }

      console.error("Erro ao criar rota operacional:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Método não permitido" });
}
