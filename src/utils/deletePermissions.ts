const CAN_DELETE_ANY_ITEM = ["f0bcd8a3-46fe-4f50-84a5-9534058b0464"];

export function canDeleteItem(
  item: { Profile?: { userId: string } | null },
  userId: string | null
): boolean {
  if (!userId) return false;
  if (CAN_DELETE_ANY_ITEM.includes(userId)) return true;
  return item.Profile?.userId === userId;
}
