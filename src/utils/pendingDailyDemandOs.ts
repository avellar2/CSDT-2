import prisma from "@/utils/prisma";
import { getBrazilDayRange } from "@/utils/dailyDemandOsRules";

const DAILY_DEMAND_PENDING_START_DATE = "2026-05-05";

export interface PendingDailyDemandItem {
  demandId: number;
  schoolName: string;
  schoolAddress: string;
  schoolDistrict: string;
  description: string;
  createdAt: string;
  demandDate: string;
  visitStatus: string | null;
  visitReason: string | null;
  visitUpdatedBy: string | null;
  responsibleTechnicianIds: number[];
  responsibleTechnicians: string[];
}

export async function getPendingDailyDemandItems(params?: {
  userId?: string;
}): Promise<PendingDailyDemandItem[]> {
  let profileId: number | null = null;
  let profileRole: string | null = null;

  if (params?.userId) {
    const profile = await prisma.profile.findUnique({
      where: { userId: params.userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!profile) {
      return [];
    }

    profileId = profile.id;
    profileRole = profile.role;
  }

  const demands = await prisma.schoolDemand.findMany({
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
      createdAt: "desc",
    },
  });

  if (demands.length === 0) {
    return [];
  }

  const schoolNames = demands.map((demand) => demand.School.name);

  const [osOld, osExternas] = await Promise.all([
    prisma.os.findMany({
      where: {
        unidadeEscolar: { in: schoolNames },
      },
      select: {
        unidadeEscolar: true,
        createdAt: true,
      },
    }),
    prisma.oSExterna.findMany({
      where: {
        unidadeEscolar: { in: schoolNames },
      },
      select: {
        unidadeEscolar: true,
        createdAt: true,
      },
    }),
  ]);

  const uniqueDemandDates = Array.from(
    new Set(
      demands.map((demand) =>
        demand.createdAt.toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        })
      )
    )
  );

  const visitTechniciansByDate = new Map<
    string,
    { technicianId: number; displayName: string }[]
  >();

  const allVisitTechnicianIds = new Set<number>();

  for (const demandDate of uniqueDemandDates) {
    const { start, end } = getBrazilDayRange(demandDate);
    const visitTechnicians = await prisma.visitTechnician.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        technicianId: true,
      },
    });

    visitTechnicians.forEach((item) => allVisitTechnicianIds.add(item.technicianId));
    visitTechniciansByDate.set(
      demandDate,
      visitTechnicians.map((item) => ({
        technicianId: item.technicianId,
        displayName: `Técnico ${item.technicianId}`,
      }))
    );
  }

  const profiles = allVisitTechnicianIds.size
    ? await prisma.profile.findMany({
        where: {
          id: { in: Array.from(allVisitTechnicianIds) },
        },
        select: {
          id: true,
          displayName: true,
        },
      })
    : [];

  for (const [demandDate, technicians] of visitTechniciansByDate.entries()) {
    visitTechniciansByDate.set(
      demandDate,
      technicians.map((technician) => ({
        technicianId: technician.technicianId,
        displayName:
          profiles.find((profile) => profile.id === technician.technicianId)?.displayName ||
          technician.displayName,
      }))
    );
  }

  return demands
    .filter((demand) => {
      const demandDateKey = demand.createdAt.toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });

      if (demandDateKey < DAILY_DEMAND_PENDING_START_DATE) {
        return false;
      }

      const demandDate = new Date(demand.createdAt);
      const hasOldOs = osOld.some(
        (os) =>
          os.unidadeEscolar === demand.School.name &&
          new Date(os.createdAt) >= demandDate
      );

      const hasExternalOs = osExternas.some(
        (os) =>
          os.unidadeEscolar === demand.School.name &&
          new Date(os.createdAt) >= demandDate
      );

      if (hasOldOs || hasExternalOs) {
        return false;
      }

      if (profileRole === "TECH" && profileId !== null) {
        const responsibleTechnicians =
          visitTechniciansByDate.get(demandDateKey) || [];

        return responsibleTechnicians.some(
          (technician) => technician.technicianId === profileId
        );
      }

      return true;
    })
    .map((demand) => {
      const demandDateKey = demand.createdAt.toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });
      const responsibleTechnicians =
        visitTechniciansByDate.get(demandDateKey) || [];

      return {
        demandId: demand.id,
        schoolName: demand.School.name,
        schoolAddress: demand.School.address || "",
        schoolDistrict: demand.School.district || "",
        description: demand.demand,
        createdAt: demand.createdAt.toISOString(),
        demandDate: demandDateKey,
        visitStatus: demand.visitStatus || null,
        visitReason: demand.visitReason || null,
        visitUpdatedBy: demand.visitUpdatedBy || null,
        responsibleTechnicianIds: responsibleTechnicians.map(
          (technician) => technician.technicianId
        ),
        responsibleTechnicians: responsibleTechnicians.map(
          (technician) => technician.displayName
        ),
      };
    });
}
