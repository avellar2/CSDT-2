import { NextApiRequest, NextApiResponse } from "next";
import { RouteEntityType } from "@prisma/client";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  dateKeyFromPrismaDate,
  isRouteManager,
  routeStatusIsOpen,
} from "@/utils/operationalRoutes";

const ENTITY_TYPES: RouteEntityType[] = [
  "DEMAND",
  "TECHNICAL_TICKET",
  "CHAMADO",
];

type EntityContext = {
  fromRouteId: number | null;
  dateKey: string | null;
  label: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({
      error: "Somente ADMIN ou ADMTOTAL podem transferir demandas e chamados entre rotas.",
    });
  }

  const { entityType, entityId, routeId, note } = req.body || {};

  if (!ENTITY_TYPES.includes(entityType)) {
    return res.status(400).json({
      error: "entityType deve ser DEMAND, TECHNICAL_TICKET ou CHAMADO.",
    });
  }

  const parsedEntityId = Number(entityId);
  if (!Number.isInteger(parsedEntityId) || parsedEntityId <= 0) {
    return res.status(400).json({ error: "entityId é obrigatório." });
  }

  const parsedRouteId =
    routeId === null || routeId === undefined || routeId === ""
      ? null
      : Number(routeId);

  if (
    parsedRouteId !== null &&
    (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0)
  ) {
    return res.status(400).json({ error: "routeId inválido." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let context: EntityContext;

      if (entityType === "DEMAND") {
        const demand = await tx.schoolDemand.findUnique({
          where: { id: parsedEntityId },
          select: { id: true, routeId: true, createdAt: true, demand: true },
        });

        if (!demand) {
          throw new AssignError("Demanda não encontrada.", 404);
        }

        context = {
          fromRouteId: demand.routeId,
          dateKey: formatBrazilDateKey(demand.createdAt),
          label: "Demanda",
        };

        if (demand.routeId === parsedRouteId) {
          return { changed: false, entityType, entityId: parsedEntityId, routeId: parsedRouteId };
        }

        await tx.schoolDemand.update({
          where: { id: parsedEntityId },
          data: { routeId: parsedRouteId },
        });
      } else if (entityType === "TECHNICAL_TICKET") {
        const ticket = await tx.technicalTicket.findUnique({
          where: { id: parsedEntityId },
          select: { id: true, routeId: true, scheduledDate: true },
        });

        if (!ticket) {
          throw new AssignError("Chamado técnico não encontrado.", 404);
        }

        if (parsedRouteId !== null && !ticket.scheduledDate) {
          throw new AssignError(
            "Agende o chamado antes de atribuí-lo a uma rota.",
            400
          );
        }

        context = {
          fromRouteId: ticket.routeId,
          dateKey: ticket.scheduledDate
            ? formatBrazilDateKey(ticket.scheduledDate)
            : null,
          label: "Chamado técnico",
        };

        if (ticket.routeId === parsedRouteId) {
          return { changed: false, entityType, entityId: parsedEntityId, routeId: parsedRouteId };
        }

        await tx.technicalTicket.update({
          where: { id: parsedEntityId },
          data: { routeId: parsedRouteId },
        });
      } else {
        const chamado = await tx.chamados_escalas.findUnique({
          where: { id: parsedEntityId },
          select: {
            id: true,
            routeId: true,
            dataAgendamento: true,
            dataCriacao: true,
          },
        });

        if (!chamado) {
          throw new AssignError("Chamado de escala não encontrado.", 404);
        }

        context = {
          fromRouteId: chamado.routeId,
          dateKey: formatBrazilDateKey(
            chamado.dataAgendamento || chamado.dataCriacao
          ),
          label: "Chamado de escala",
        };

        if (chamado.routeId === parsedRouteId) {
          return { changed: false, entityType, entityId: parsedEntityId, routeId: parsedRouteId };
        }

        await tx.chamados_escalas.update({
          where: { id: parsedEntityId },
          data: { routeId: parsedRouteId },
        });
      }

      if (parsedRouteId !== null) {
        const route = await tx.dailyRoute.findUnique({
          where: { id: parsedRouteId },
          select: { id: true, date: true, status: true, name: true },
        });

        if (!route) {
          throw new AssignError("Rota de destino não encontrada.", 404);
        }

        if (!routeStatusIsOpen(route.status)) {
          throw new AssignError(
            "A rota de destino está encerrada e não pode receber novos itens.",
            409
          );
        }

        const routeDateKey = dateKeyFromPrismaDate(route.date);

        if (!context.dateKey || context.dateKey !== routeDateKey) {
          throw new AssignError(
            `${context.label} pertence à data ${context.dateKey || "não definida"} e a rota ${route.name} é de ${routeDateKey}.`,
            400
          );
        }
      }

      await tx.routeTransfer.create({
        data: {
          entityType,
          entityId: parsedEntityId,
          fromRouteId: context.fromRouteId,
          toRouteId: parsedRouteId,
          movedBy: auth.id,
          note: typeof note === "string" && note.trim() ? note.trim() : null,
        },
      });

      return { changed: true, entityType, entityId: parsedEntityId, routeId: parsedRouteId };
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AssignError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Erro ao transferir item entre rotas:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

class AssignError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AssignError";
    this.statusCode = statusCode;
  }
}
