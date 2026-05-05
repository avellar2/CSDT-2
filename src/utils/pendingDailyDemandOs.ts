import prisma from "@/utils/prisma";
import { getBrazilDayRange, getBrazilParts } from "@/utils/dailyDemandOsRules";

export interface PendingDailyDemandItem {
  demandId: number;
  schoolName: string;
  schoolAddress: string;
  schoolDistrict: string;
  description: string;
  createdAt: string;
  responsibleTechnicians: string[];
}

async function getTodayVisitTechnicians() {
  const { dateKey } = getBrazilParts();
  const { start, end } = getBrazilDayRange(dateKey);

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

  if (visitTechnicians.length === 0) {
    return [];
  }

  const profiles = await prisma.profile.findMany({
    where: {
      id: {
        in: visitTechnicians.map((item) => item.technicianId),
      },
    },
    select: {
      id: true,
      displayName: true,
    },
  });

  return visitTechnicians.map((item) => ({
    technicianId: item.technicianId,
    displayName:
      profiles.find((profile) => profile.id === item.technicianId)?.displayName ||
      `Técnico ${item.technicianId}`,
  }));
}

export async function getPendingDailyDemandItems(params?: {
  userId?: string;
}): Promise<PendingDailyDemandItem[]> {
  const { dateKey } = getBrazilParts();
  const { start, end } = getBrazilDayRange(dateKey);

  let shouldSeeDemands = true;

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

    if (profile.role === "TECH") {
      const visitIds = new Set(
        (await getTodayVisitTechnicians()).map((item) => item.technicianId)
      );
      shouldSeeDemands = visitIds.has(profile.id);
    }
  }

  if (!shouldSeeDemands) {
    return [];
  }

  const demands = await prisma.schoolDemand.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
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
      createdAt: "desc",
    },
  });

  if (demands.length === 0) {
    return [];
  }

  const responsibleTechnicians = (await getTodayVisitTechnicians()).map(
    (item) => item.displayName
  );

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

  return demands
    .filter((demand) => {
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

      return !hasOldOs && !hasExternalOs;
    })
    .map((demand) => ({
      demandId: demand.id,
      schoolName: demand.School.name,
      schoolAddress: demand.School.address || "",
      schoolDistrict: demand.School.district || "",
      description: demand.demand,
      createdAt: demand.createdAt.toISOString(),
      responsibleTechnicians,
    }));
}
