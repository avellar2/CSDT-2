import { assessDailyDemandOsAvailability, DailyDemandAvailabilityResult } from "@/utils/dailyDemandOsRules";
import { getPendingDailyDemandItems } from "@/utils/pendingDailyDemandOs";

export interface SchoolPendingDailyDemandAvailabilityResult {
  applies: boolean;
  demandId: number | null;
  demandDate: string | null;
  schoolName: string | null;
  availability: DailyDemandAvailabilityResult | null;
}

export async function getSchoolPendingDailyDemandAvailability(params: {
  userId: string;
  schoolName: string;
}): Promise<SchoolPendingDailyDemandAvailabilityResult> {
  const normalizedSchoolName = params.schoolName.trim();

  if (!params.userId || !normalizedSchoolName) {
    return {
      applies: false,
      demandId: null,
      demandDate: null,
      schoolName: normalizedSchoolName || null,
      availability: null,
    };
  }

  const pendingItems = await getPendingDailyDemandItems({
    userId: params.userId,
  });

  const matchingItem = pendingItems.find(
    (item) => item.schoolName.trim().toLowerCase() === normalizedSchoolName.toLowerCase()
  );

  if (!matchingItem) {
    return {
      applies: false,
      demandId: null,
      demandDate: null,
      schoolName: normalizedSchoolName,
      availability: null,
    };
  }

  const availability = await assessDailyDemandOsAvailability({
    userId: params.userId,
    demandDate: matchingItem.demandDate,
  });

  return {
    applies: true,
    demandId: matchingItem.demandId,
    demandDate: matchingItem.demandDate,
    schoolName: matchingItem.schoolName,
    availability,
  };
}
