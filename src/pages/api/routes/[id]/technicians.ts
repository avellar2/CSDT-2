import { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import {
  buildRouteConflictKey,
  dateKeyFromPrismaDate,
  isRouteManager,
  routeStatusIsOpen,
} from "@/utils/operationalRoutes";
import {
  RouteValidationError,
  routeListInclude,
  serializeRoute,
} from "@/utils/operationalRouteApi";

function parseRouteId(req: NextApiRequest): number | null {
  const parsed = Number(req.query.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({
      error: "Somente ADMIN ou ADMTOTAL podem alterar os técnicos da rota.",
    });
  }

  const routeId = parseRouteId(req);
  if (!routeId) {
    return res.status(400).json({ error: "ID de rota inválido." });
  }

  const route = await prisma.dailyRoute.findUnique({
    where: { id: routeId },
    select: { id: true, date: true, status: true },
  });

  if (!route) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }

  if (!routeStatusIsOpen(route.status)) {
    return res.status(409).json({
      error: "Não é possível alterar técnicos de uma rota encerrada.",
    });
  }

  const technicianId = Number(req.body?.technicianId);
  if (!Number.isInteger(technicianId) || technicianId <= 0) {
    return res.status(400).json({ error: "technicianId é obrigatório." });
  }

  const dateKey = dateKeyFromPrismaDate(route.date);
  const conflictKey = buildRouteConflictKey(technicianId, dateKey);

  if (req.method === "POST") {
    const profile = await prisma.profile.findUnique({
      where: { id: technicianId },
      select: { id: true, displayName: true, isActive: true },
    });

    if (!profile || !profile.isActive) {
      return res.status(404).json({ error: "Técnico não encontrado ou inativo." });
    }

    try {
      const updatedRoute = await prisma.$transaction(async (tx) => {
        const existingMembership = await tx.dailyRouteTechnician.findUnique({
          where: {
            routeId_technicianId: { routeId, technicianId },
          },
        });

        if (existingMembership?.active) {
          return tx.dailyRoute.findUniqueOrThrow({
            where: { id: routeId },
            include: routeListInclude,
          });
        }

        const conflict = await tx.dailyRouteTechnician.findFirst({
          where: {
            conflictKey,
            routeId: { not: routeId },
          },
          select: { id: true },
        });

        if (conflict) {
          throw new RouteValidationError(
            "Este técnico já está em outra rota ativa nesta data.",
            409
          );
        }

        if (existingMembership) {
          await tx.dailyRouteTechnician.update({
            where: { id: existingMembership.id },
            data: {
              active: true,
              conflictKey,
              removedAt: null,
              removedBy: null,
            },
          });
        } else {
          await tx.dailyRouteTechnician.create({
            data: {
              routeId,
              technicianId,
              routeDate: route.date,
              active: true,
              conflictKey,
            },
          });
        }

        return tx.dailyRoute.findUniqueOrThrow({
          where: { id: routeId },
          include: routeListInclude,
        });
      });

      return res.status(200).json({
        success: true,
        route: serializeRoute(updatedRoute),
      });
    } catch (error) {
      if (error instanceof RouteValidationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({
          error: "Este técnico já está em outra rota ativa nesta data.",
        });
      }

      console.error("Erro ao adicionar técnico à rota:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  if (req.method === "DELETE") {
    const membership = await prisma.dailyRouteTechnician.findUnique({
      where: { routeId_technicianId: { routeId, technicianId } },
    });

    if (!membership || !membership.active) {
      return res.status(404).json({ error: "Técnico não participa desta rota." });
    }

    try {
      const updatedRoute = await prisma.$transaction(async (tx) => {
        await tx.dailyRouteTechnician.update({
          where: { id: membership.id },
          data: {
            active: false,
            conflictKey: null,
            removedAt: new Date(),
            removedBy: auth.id,
          },
        });

        return tx.dailyRoute.findUniqueOrThrow({
          where: { id: routeId },
          include: routeListInclude,
        });
      });

      return res.status(200).json({
        success: true,
        route: serializeRoute(updatedRoute),
      });
    } catch (error) {
      console.error("Erro ao remover técnico da rota:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  res.setHeader("Allow", ["POST", "DELETE"]);
  return res.status(405).json({ error: "Método não permitido" });
}
