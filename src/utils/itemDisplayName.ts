function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildItemDisplayName(name?: string | null, brand?: string | null) {
  const trimmedName = (name || '').trim();
  const trimmedBrand = (brand || '').trim();

  if (!trimmedName) {
    return trimmedBrand || 'Equipamento';
  }

  if (!trimmedBrand) {
    return trimmedName;
  }

  const normalizedName = normalizeText(trimmedName);
  const normalizedBrand = normalizeText(trimmedBrand);

  if (normalizedName && normalizedBrand.includes(normalizedName)) {
    return trimmedBrand;
  }

  return `${trimmedName} ${trimmedBrand}`.replace(/\s+/g, ' ').trim();
}
