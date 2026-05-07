import prisma from "@/utils/prisma";
import { formatBrazilDateKey, getBrazilDayRange } from "@/utils/dailyDemandOsRules";

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

function pushTimestamp(map: Map<string, number[]>, key: string, timestamp: number) {
  const items = map.get(key) || [];
  items.push(timestamp);
  map.set(key, items);
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

  const startDate = getBrazilDayRange(DAILY_DEMAND_PENDING_START_DATE).start;

  const demands = await prisma.schoolDemand.findMany({
    where: {
      createdAt: {
        gte: startDate,
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

  const schoolNames = Array.from(new Set(demands.map((demand) => demand.School.name)));
  const uniqueDemandDates = Array.from(
    new Set(demands.map((demand) => formatBrazilDateKey(demand.createdAt)))
  );

  const oldestDemandDate = uniqueDemandDates[uniqueDemandDates.length - 1];
  const newestDemandDate = uniqueDemandDates[0];
  const oldestRange = getBrazilDayRange(oldestDemandDate);
  const newestRange = getBrazilDayRange(newestDemandDate);

  const [osOld, osExternas, visitTechnicians] = await Promise.all([
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
    prisma.visitTechnician.findMany({
      where: {
        createdAt: {
          gte: oldestRange.start,
          lte: newestRange.end,
        },
      },
      select: {
        technicianId: true,
        createdAt: true,
      },
    }),
  ]);

  const visitTechnicianIds = Array.from(
    new Set(visitTechnicians.map((item) => item.technicianId))
  );

  const profiles = visitTechnicianIds.length
    ? await prisma.profile.findMany({
        where: {
          id: { in: visitTechnicianIds },
        },
        select: {
          id: true,
          displayName: true,
        },
      })
    : [];

  const oldOsBySchool = new Map<string, number[]>();
  const externalOsBySchool = new Map<string, number[]>();

  for (const os of osOld) {
    if (os.unidadeEscolar) {
      pushTimestamp(oldOsBySchool, os.unidadeEscolar, new Date(os.createdAt).getTime());
    }
  }

  for (const os of osExternas) {
    if (os.unidadeEscolar) {
      pushTimestamp(externalOsBySchool, os.unidadeEscolar, new Date(os.createdAt).getTime());
    }
  }

  const profileNameById = new Map(
    profiles.map((profile) => [profile.id, profile.displayName])
  );

  const visitTechniciansByDate = new Map<
    string,
    { technicianId: number; displayName: string }[]
  >();

  for (const item of visitTechnicians) {
    const demandDateKey = formatBrazilDateKey(item.createdAt);
    const technicians = visitTechniciansByDate.get(demandDateKey) || [];

    technicians.push({
      technicianId: item.technicianId,
      displayName: profileNameById.get(item.technicianId) || `Tecnico ${item.technicianId}`,
    });

    visitTechniciansByDate.set(demandDateKey, technicians);
  }

  return demands
    .filter((demand) => {
      const demandDateKey = formatBrazilDateKey(demand.createdAt);
      const demandTimestamp = new Date(demand.createdAt).getTime();

      const hasOldOs = (oldOsBySchool.get(demand.School.name) || []).some(
        (createdAt) => createdAt >= demandTimestamp
      );

      const hasExternalOs = (externalOsBySchool.get(demand.School.name) || []).some(
        (createdAt) => createdAt >= demandTimestamp
      );

      if (hasOldOs || hasExternalOs) {
        return false;
      }

      if (profileRole === "TECH" && profileId !== null) {
        const responsibleTechnicians = visitTechniciansByDate.get(demandDateKey) || [];

        return responsibleTechnicians.some(
          (technician) => technician.technicianId === profileId
        );
      }

      return true;
    })
    .map((demand) => {
      const demandDateKey = formatBrazilDateKey(demand.createdAt);
      const responsibleTechnicians = visitTechniciansByDate.get(demandDateKey) || [];

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
