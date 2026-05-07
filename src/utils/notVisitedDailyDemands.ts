import prisma from "@/utils/prisma";
import { getBrazilDayRange } from "@/utils/dailyDemandOsRules";

const DAILY_DEMAND_PENDING_START_DATE = "2026-05-05";

export interface NotVisitedDailyDemandItem {
  demandId: number;
  schoolName: string;
  schoolAddress: string;
  schoolDistrict: string;
  description: string;
  createdAt: string;
  demandDate: string;
  visitReason: string | null;
  visitUpdatedBy: string | null;
  responsibleTechnicians: string[];
}

export async function getNotVisitedDailyDemandItems(params: {
  date: string;
}): Promise<NotVisitedDailyDemandItem[]> {
  const { date } = params;

  if (!date || date < DAILY_DEMAND_PENDING_START_DATE) {
    return [];
  }

  const { start, end } = getBrazilDayRange(date);

  const [demands, visitTechnicians] = await Promise.all([
    prisma.schoolDemand.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        visitStatus: "NOT_VISITED",
      },
      include: {
        School: {
          select: {
            name: true,
            address: true,
            district: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.visitTechnician.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        technicianId: true,
      },
    }),
  ]);

  if (demands.length === 0) {
    return [];
  }

  const technicianIds = Array.from(new Set(visitTechnicians.map((item) => item.technicianId)));

  const profiles = technicianIds.length
    ? await prisma.profile.findMany({
        where: {
          id: { in: technicianIds },
        },
        select: {
          id: true,
          displayName: true,
        },
      })
    : [];

  const responsibleTechnicians = visitTechnicians
    .map((item) => profiles.find((profile) => profile.id === item.technicianId)?.displayName)
    .filter((name): name is string => Boolean(name));

  return demands.map((demand) => ({
    demandId: demand.id,
    schoolName: demand.School.name,
    schoolAddress: demand.School.address || "",
    schoolDistrict: demand.School.district || "",
    description: demand.demand,
    createdAt: demand.createdAt.toISOString(),
    demandDate: date,
    visitReason: demand.visitReason || null,
    visitUpdatedBy: demand.visitUpdatedBy || null,
    responsibleTechnicians,
  }));
}
