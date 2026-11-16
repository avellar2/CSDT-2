/** Cores usadas para diferenciar distritos no mapa de escolas. */
export const districtColors: Record<string, string> = {
  '1': '#ef4444',
  '2': '#f97316',
  '3': '#eab308',
  '4': '#22c55e',
  '5': '#3b82f6',
  '6': '#8b5cf6',
  '7': '#ec4899',
  '8': '#14b8a6',
};

export function getDistrictColor(district: string): string {
  const match = district?.match(/\d+/);
  if (match) return districtColors[match[0]] || '#6b7280';
  const hash = district?.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) || 0;
  const colors = Object.values(districtColors);
  return colors[hash % colors.length] || '#6b7280';
}
