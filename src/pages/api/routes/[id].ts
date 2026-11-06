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

const ROUTE_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type RouteStatusValue = (typeof ROUTE_STATUSES)[number];

function parseRouteId(req: NextApiRequest): number | null {
  const parsed = Number(req.query.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const routeId = parseRouteId(req);
  if (!routeId) {
    return res.status(400).json({ error: "ID de rota inválido." });
  }

  const existing = await prisma.dailyRoute.findUnique({
    where: { id: routeId },
    include: {
      technicians: {
        where: { active: true },
        select: { technicianId: true },
      },
      _count: {
        select: {
          demands: true,
          technicalTickets: true,
          chamados: true,
        },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: "Rota não encontrada." });
  }

  const isMember = existing.technicians.some(
    (membership) => membership.technicianId === auth.profile.id
  );

  if (auth.profile.role === "TECH" && !isMember) {
    return res.status(403).json({ error: "Você não participa desta rota." });
  }

  if (req.method === "GET") {
    const route = await prisma.dailyRoute.findUnique({
      where: { id: routeId },
      include: {
        ...routeListInclude,
        demands: {
          include: {
            School: {
              select: { id: true, name: true, district: true, address: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        technicalTickets: {
          include: {
            School: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        chamados: {
          orderBy: { dataCriacao: "desc" },
        },
        transfersTo: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    return res.status(200).json({
      success: true,
      route: {
        ...serializeRoute(route!),
        demands: route!.demands.map((demand) => ({
          id: demand.id,
          schoolId: demand.schoolId,
          schoolName: demand.School?.name || null,
          district: demand.School?.district || null,
          demand: demand.demand,
          createdAt: demand.createdAt.toISOString(),
          visitStatus: demand.visitStatus,
          visitReason: demand.visitReason,
        })),
        tickets: route!.technicalTickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          schoolName: ticket.School?.name || null,
          status: ticket.status,
          scheduledDate: ticket.scheduledDate?.toISOString() || null,
        })),
        chamados: route!.chamados.map((chamado) => ({
          id: chamado.id,
          titulo: chamado.titulo,
          escola: chamado.escola,
          status: chamado.status,
          dataAgendamento: chamado.dataAgendamento?.toISOString() || null,
        })),
        transfers: route!.transfersTo.map((transfer) => ({
          id: transfer.id,
          entityType: transfer.entityType,
          entityId: transfer.entityId,
          fromRouteId: transfer.fromRouteId,
          toRouteId: transfer.toRouteId,
          movedBy: transfer.movedBy,
          note: transfer.note,
          createdAt: transfer.createdAt.toISOString(),
        })),
      },
    });
  }

  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({ error: "Somente ADMIN ou ADMTOTAL podem alterar rotas." });
  }

  if (req.method === "PATCH") {
    const { name, vehicle, status } = req.body || {};

    if (
      status !== undefined &&
      !ROUTE_STATUSES.includes(status as RouteStatusValue)
    ) {
      return res.status(400).json({ error: "status inválido." });
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ error: "name não pode ser vazio." });
    }

    if (vehicle !== undefined && vehicle !== null && typeof vehicle !== "string") {
      return res.status(400).json({ error: "vehicle deve ser texto." });
    }

    const nextStatus = status as RouteStatusValue | undefined;
    const dateKey = dateKeyFromPrismaDate(existing.date);

    try {
      const route = await prisma.$transaction(async (tx) => {
        const memberships = await tx.dailyRouteTechnician.findMany({
          where: { routeId, active: true },
          select: { id: true, technicianId: true, conflictKey: true },
        });

        const isClosing =
          nextStatus !== undefined &&
          !routeStatusIsOpen(nextStatus) &&
          routeStatusIsOpen(existing.status);

        const isReopening =
          nextStatus !== undefined &&
          routeStatusIsOpen(nextStatus) &&
          !routeStatusIsOpen(existing.status);

        if (isClosing) {
          await tx.dailyRouteTechnician.updateMany({
            where: { routeId, active: true },
            data: { conflictKey: null },
          });
        }

        if (isReopening) {
          const conflicts = await tx.dailyRouteTechnician.findMany({
            where: {
              conflictKey: {
                in: memberships.map((membership) =>
                  buildRouteConflictKey(membership.technicianId, dateKey)
                ),
              },
              routeId: { not: routeId },
            },
            select: { conflictKey: true },
          });

          if (conflicts.length > 0) {
            throw new RouteValidationError(
              "Não é possível reabrir: um ou mais técnicos já estão em outra rota ativa nesta data.",
              409
            );
          }

          for (const membership of memberships) {
            await tx.dailyRouteTechnician.update({
              where: { id: membership.id },
              data: {
                conflictKey: buildRouteConflictKey(membership.technicianId, dateKey),
                removedAt: null,
                removedBy: null,
              },
            });
          }
        }

        return tx.dailyRoute.update({
          where: { id: routeId },
          data: {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(vehicle !== undefined
              ? { vehicle: vehicle ? vehicle.trim() || null : null }
              : {}),
            ...(nextStatus !== undefined ? { status: nextStatus } : {}),
            ...(isClosing
              ? { closedBy: auth.id, closedAt: new Date() }
              : {}),
            ...(isReopening ? { closedBy: null, closedAt: null } : {}),
            updatedBy: auth.id,
          },
          include: routeListInclude,
        });
      });

      return res.status(200).json({ success: true, route: serializeRoute(route) });
    } catch (error) {
      if (error instanceof RouteValidationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({
          error: "Já existe uma rota com esse nome nesta data.",
        });
      }

      console.error("Erro ao atualizar rota operacional:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  if (req.method === "DELETE") {
    const counts = existing._count;

    if (counts.demands > 0 || counts.technicalTickets > 0 || counts.chamados > 0) {
      return res.status(409).json({
        error:
          "Esta rota possui demandas ou chamados associados. Encerre a rota em vez de excluí-la; as demandas e OS são preservadas.",
      });
    }

    try {
      await prisma.dailyRoute.delete({ where: { id: routeId } });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir rota operacional:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  return res.status(405).json({ error: "Método não permitido" });
}
