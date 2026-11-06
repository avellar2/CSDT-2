import { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { AuthUser, requireAuth } from "@/utils/api-auth";
import { isRouteManager } from "@/utils/operationalRoutes";

export const routeListInclude = {
  technicians: {
    where: { active: true },
    include: {
      technician: {
        select: { id: true, displayName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  _count: {
    select: {
      demands: true,
      technicalTickets: true,
      chamados: true,
    },
  },
} satisfies Prisma.DailyRouteInclude;

export type RouteListRecord = Prisma.DailyRouteGetPayload<{
  include: typeof routeListInclude;
}>;

export function serializeRoute(route: RouteListRecord) {
  return {
    id: route.id,
    date: route.date.toISOString().slice(0, 10),
    name: route.name,
    vehicle: route.vehicle,
    status: route.status,
    createdBy: route.createdBy,
    updatedBy: route.updatedBy,
    closedBy: route.closedBy,
    closedAt: route.closedAt?.toISOString() || null,
    createdAt: route.createdAt.toISOString(),
    updatedAt: route.updatedAt.toISOString(),
    technicians: route.technicians.map((membership) => ({
      membershipId: membership.id,
      technicianId: membership.technicianId,
      displayName: membership.technician.displayName,
    })),
    counts: {
      demands: route._count.demands,
      tickets: route._count.technicalTickets,
      chamados: route._count.chamados,
    },
  };
}

export async function requireRouteManager(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthUser | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  if (!isRouteManager(auth.profile.role)) {
    res.status(403).json({ error: "Somente ADMIN ou ADMTOTAL podem gerenciar rotas." });
    return null;
  }

  return auth;
}

export function parseTechnicianIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const ids = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);

  if (ids.length !== value.length) return null;

  return Array.from(new Set(ids));
}

export class RouteValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "RouteValidationError";
    this.statusCode = statusCode;
  }
}
