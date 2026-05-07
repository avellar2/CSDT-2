import prisma from "@/utils/prisma";

const BRAZIL_TIMEZONE = "America/Sao_Paulo";
const BUSINESS_START_MINUTES = 8 * 60;
const BUSINESS_END_MINUTES = 17 * 60;
const DAILY_DEMAND_PENDING_START_DATE = "2026-05-05";

export interface DailyDemandAvailabilityResult {
  allowed: boolean;
  reason: string | null;
  currentDate: string;
  currentTime: string;
  demandDate: string;
  hasRelease: boolean;
  isVisitTechnician: boolean;
  isWithinBusinessHours: boolean;
  profile: {
    id: number;
    displayName: string;
    role: string;
  } | null;
}

export function getBrazilParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    timeKey: `${map.hour}:${map.minute}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export function getBrazilDayRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00-03:00`);
  const end = new Date(`${dateKey}T23:59:59.999-03:00`);
  return { start, end };
}

export async function assessDailyDemandOsAvailability(params: {
  userId: string;
  demandDate: string;
}): Promise<DailyDemandAvailabilityResult> {
  const { userId, demandDate } = params;
  const nowParts = getBrazilParts();
  const { start, end } = getBrazilDayRange(demandDate);

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      displayName: true,
      role: true,
    },
  });

  if (!profile) {
    return {
      allowed: false,
      reason: "Perfil do usuário não encontrado.",
      currentDate: nowParts.dateKey,
      currentTime: nowParts.timeKey,
      demandDate,
      hasRelease: false,
      isVisitTechnician: false,
      isWithinBusinessHours: false,
      profile: null,
    };
  }

  if (profile.role === "ADMIN" || profile.role === "ADMTOTAL") {
    return {
      allowed: true,
      reason: null,
      currentDate: nowParts.dateKey,
      currentTime: nowParts.timeKey,
      demandDate,
      hasRelease: true,
      isVisitTechnician: true,
      isWithinBusinessHours: true,
      profile,
    };
  }

  const visitAllocation = await prisma.visitTechnician.findFirst({
    where: {
      technicianId: profile.id,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: { id: true },
  });

  const release = await prisma.dailyDemandOsRelease.findFirst({
    where: {
      technicianId: profile.id,
      demandDate: {
        gte: start,
        lte: end,
      },
      active: true,
    },
    select: { id: true },
  });

  const currentMinutes = nowParts.hour * 60 + nowParts.minute;
  const isSameDemandDay = nowParts.dateKey === demandDate;
  const isWithinBusinessHours =
    isSameDemandDay &&
    currentMinutes >= BUSINESS_START_MINUTES &&
    currentMinutes < BUSINESS_END_MINUTES;

  if (!visitAllocation) {
    return {
      allowed: false,
      reason: "Somente técnicos em visita técnica neste dia podem lançar essas OS.",
      currentDate: nowParts.dateKey,
      currentTime: nowParts.timeKey,
      demandDate,
      hasRelease: Boolean(release),
      isVisitTechnician: false,
      isWithinBusinessHours,
      profile,
    };
  }

  if (demandDate < DAILY_DEMAND_PENDING_START_DATE) {
    return {
      allowed: true,
      reason: null,
      currentDate: nowParts.dateKey,
      currentTime: nowParts.timeKey,
      demandDate,
      hasRelease: true,
      isVisitTechnician: true,
      isWithinBusinessHours: false,
      profile,
    };
  }

  if (isWithinBusinessHours || release) {
    return {
      allowed: true,
      reason: null,
      currentDate: nowParts.dateKey,
      currentTime: nowParts.timeKey,
      demandDate,
      hasRelease: Boolean(release),
      isVisitTechnician: true,
      isWithinBusinessHours,
      profile,
    };
  }

  const reason = isSameDemandDay
    ? "As OS dessa demanda só podem ser lançadas entre 08:00 e 17:00, salvo liberação do ADMTOTAL."
    : `O prazo para lançar as OS de ${demandDate} terminou às 17:00 daquele dia.`;

  return {
    allowed: false,
    reason,
    currentDate: nowParts.dateKey,
    currentTime: nowParts.timeKey,
    demandDate,
    hasRelease: false,
    isVisitTechnician: true,
    isWithinBusinessHours: false,
    profile,
  };
}
