/**
 * Utilitários geográficos e de qualidade de coordenadas.
 *
 * `geocoded = true` NÃO é prova de que a escola está no lugar certo: o banco
 * tem casos de escolas marcadas como geocodificadas sem latitude/longitude e
 * grupos de escolas empilhadas na mesma coordenada. Por isso a verificação
 * olha os valores, não apenas o booleano.
 */

export const DUQUE_DE_CAXIAS_BOUNDS = {
  minLat: -23.05,
  maxLat: -22.5,
  minLng: -43.7,
  maxLng: -43.0,
};

/** Distância aproximada considerada "mesma coordenada" (metros). */
export const DUPLICATE_THRESHOLD_METERS = 60;

export type GeoIssueCode =
  | "MISSING_COORDS"
  | "INVALID_COORDS"
  | "OUTSIDE_BOUNDS"
  | "DUPLICATE_CLUSTER";

export type GeoIssueSeverity = "error" | "warning";

export interface GeoIssue {
  code: GeoIssueCode;
  severity: GeoIssueSeverity;
  message: string;
}

export interface GeoCandidate {
  id: number;
  name: string;
  geocoded: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface SchoolGeoInspection {
  schoolId: number;
  name: string;
  usable: boolean;
  latitude: number | null;
  longitude: number | null;
  issues: GeoIssue[];
}

/** Distância em metros entre dois pontos (Haversine). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isValidCoordinate(
  latitude: unknown,
  longitude: unknown
): latitude is number {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  // (0,0) é o resultado típico de campo vazio convertido para número.
  if (Math.abs(latitude) < 1e-6 && Math.abs(longitude) < 1e-6) return false;
  return true;
}

export function isInsideDuqueDeCaxias(lat: number, lng: number): boolean {
  const bounds = DUQUE_DE_CAXIAS_BOUNDS;
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

/**
 * Inspeciona uma escola isoladamente. O agrupamento de coordenadas repetidas
 * exige o conjunto completo e é feito em `buildGeoQualityReport`.
 */
export function inspectSchoolGeometry(school: GeoCandidate): SchoolGeoInspection {
  const issues: GeoIssue[] = [];

  const hasCoords = school.latitude !== null && school.longitude !== null;

  if (!hasCoords) {
    issues.push({
      code: "MISSING_COORDS",
      severity: "error",
      message: school.geocoded
        ? "Marcada como geocodificada, mas sem latitude/longitude."
        : "Sem latitude/longitude cadastradas.",
    });

    return {
      schoolId: school.id,
      name: school.name,
      usable: false,
      latitude: null,
      longitude: null,
      issues,
    };
  }

  if (!isValidCoordinate(school.latitude, school.longitude)) {
    issues.push({
      code: "INVALID_COORDS",
      severity: "error",
      message: "Latitude/longitude fora do intervalo válido.",
    });

    return {
      schoolId: school.id,
      name: school.name,
      usable: false,
      latitude: null,
      longitude: null,
      issues,
    };
  }

  const latitude = school.latitude as number;
  const longitude = school.longitude as number;

  if (!isInsideDuqueDeCaxias(latitude, longitude)) {
    issues.push({
      code: "OUTSIDE_BOUNDS",
      severity: "warning",
      message:
        "Coordenada fora da área esperada de Duque de Caxias — confira o endereço.",
    });
  }

  return {
    schoolId: school.id,
    name: school.name,
    usable: true,
    latitude,
    longitude,
    issues,
  };
}

export interface DuplicateCluster {
  /** Coordenada de referência do grupo. */
  latitude: number;
  longitude: number;
  schoolIds: number[];
  schoolNames: string[];
}

/** Agrupa escolas cujas coordenadas estão a menos de `thresholdMeters`. */
export function findDuplicateClusters(
  schools: Array<{ id: number; name: string; latitude: number; longitude: number }>,
  thresholdMeters = DUPLICATE_THRESHOLD_METERS
): DuplicateCluster[] {
  const clusters: DuplicateCluster[] = [];
  const assigned = new Set<number>();

  for (const school of schools) {
    if (assigned.has(school.id)) continue;

    const group = schools.filter(
      (candidate) =>
        !assigned.has(candidate.id) &&
        haversineMeters(
          school.latitude,
          school.longitude,
          candidate.latitude,
          candidate.longitude
        ) <= thresholdMeters
    );

    if (group.length > 1) {
      group.forEach((member) => assigned.add(member.id));
      clusters.push({
        latitude: school.latitude,
        longitude: school.longitude,
        schoolIds: group.map((member) => member.id),
        schoolNames: group.map((member) => member.name),
      });
    } else {
      assigned.add(school.id);
    }
  }

  return clusters;
}

export interface GeoQualityReport {
  total: number;
  usable: number;
  missingCoords: SchoolGeoInspection[];
  invalidCoords: SchoolGeoInspection[];
  suspicious: SchoolGeoInspection[];
  duplicateClusters: DuplicateCluster[];
  /** Escolas marcadas como geocodificadas sem coordenadas utilizáveis. */
  geocodedWithoutCoords: number;
}

export function buildGeoQualityReport(schools: GeoCandidate[]): GeoQualityReport {
  const inspections = schools.map(inspectSchoolGeometry);

  const missingCoords = inspections.filter((item) =>
    item.issues.some((issue) => issue.code === "MISSING_COORDS")
  );
  const invalidCoords = inspections.filter((item) =>
    item.issues.some((issue) => issue.code === "INVALID_COORDS")
  );
  const suspicious = inspections.filter((item) =>
    item.issues.some((issue) => issue.code === "OUTSIDE_BOUNDS")
  );

  const usableSchools = inspections
    .filter((item) => item.usable)
    .map((item) => ({
      id: item.schoolId,
      name: item.name,
      latitude: item.latitude as number,
      longitude: item.longitude as number,
    }));

  const duplicateClusters = findDuplicateClusters(usableSchools);

  const clusteredIds = new Set(duplicateClusters.flatMap((cluster) => cluster.schoolIds));

  // Escolas em grupos repetidos entram como suspeitas sem sair da lista original.
  for (const inspection of inspections) {
    if (inspection.usable && clusteredIds.has(inspection.schoolId)) {
      const cluster = duplicateClusters.find((item) =>
        item.schoolIds.includes(inspection.schoolId)
      );
      inspection.issues.push({
        code: "DUPLICATE_CLUSTER",
        severity: "warning",
        message: `Compartilha a mesma coordenada com ${
          (cluster?.schoolIds.length || 1) - 1
        } outra(s) escola(s).`,
      });
      if (!suspicious.includes(inspection)) suspicious.push(inspection);
    }
  }

  return {
    total: schools.length,
    usable: usableSchools.length,
    missingCoords,
    invalidCoords,
    suspicious,
    duplicateClusters,
    geocodedWithoutCoords: missingCoords.filter((item) => {
      const school = schools.find((candidate) => candidate.id === item.schoolId);
      return Boolean(school?.geocoded);
    }).length,
  };
}
