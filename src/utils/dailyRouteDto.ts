/**
 * Contrato das rotas operacionais consumido pelas telas do cliente.
 *
 * O painel de rotas depende exatamente do DTO devolvido por `/api/routes`
 * (`counts` e `membershipId`). Respostas incompletas — versões antigas,
 * payload parcial ou falha de contrato — são normalizadas aqui.
 *
 * Regra de ouro: contador desconhecido vira `counts: null`, NUNCA zero.
 * Uma rota só é considerada vazia (e, portanto, excluível) quando o backend
 * informou todos os contadores e todos são iguais a zero.
 */

export interface RouteCounts {
  demands: number;
  tickets: number;
  chamados: number;
  /** OS externas vinculadas à rota (OSExterna.routeId). */
  osExternas: number;
}

export interface RouteTechnicianDTO {
  /** id do vínculo DailyRouteTechnician; null apenas em payloads antigos. */
  membershipId: number | null;
  technicianId: number;
  displayName: string;
}

export interface DailyRouteDTO {
  id: number;
  date: string;
  name: string;
  vehicle: string | null;
  status: string;
  technicians: RouteTechnicianDTO[];
  /** null quando o backend não devolveu todos os contadores. */
  counts: RouteCounts | null;
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.trunc(parsed);
}

export function normalizeRouteCounts(raw: unknown): RouteCounts | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const demands = toNonNegativeInt(source.demands);
  const tickets = toNonNegativeInt(source.tickets);
  const chamados = toNonNegativeInt(source.chamados);
  // Payload antigo (sem osExternas) mantém o total desconhecido: jamais
  // podemos assumir zero e liberar a exclusão de uma rota com OS externas.
  const osExternas = toNonNegativeInt(source.osExternas);

  if (
    demands === null ||
    tickets === null ||
    chamados === null ||
    osExternas === null
  ) {
    return null;
  }

  return { demands, tickets, chamados, osExternas };
}

function normalizeTechnician(raw: unknown): RouteTechnicianDTO | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const technicianId = toNonNegativeInt(source.technicianId);
  if (technicianId === null) return null;

  // `/api/daily-demands` devolvia `id`; `/api/routes` devolve `membershipId`.
  const membershipId = toNonNegativeInt(source.membershipId ?? source.id);
  const displayName =
    typeof source.displayName === "string" && source.displayName.trim()
      ? source.displayName.trim()
      : `Técnico ${technicianId}`;

  return { membershipId, technicianId, displayName };
}

export function normalizeDailyRoute(raw: unknown): DailyRouteDTO | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const id = toNonNegativeInt(source.id);
  if (id === null) return null;
  if (typeof source.name !== "string" || !source.name.trim()) return null;

  const technicians = Array.isArray(source.technicians)
    ? source.technicians
        .map(normalizeTechnician)
        .filter((tech): tech is RouteTechnicianDTO => tech !== null)
    : [];

  return {
    id,
    date: typeof source.date === "string" ? source.date : "",
    name: source.name.trim(),
    vehicle: typeof source.vehicle === "string" ? source.vehicle : null,
    status:
      typeof source.status === "string" && source.status
        ? source.status
        : "PLANNED",
    technicians,
    counts: normalizeRouteCounts(source.counts),
  };
}

export function normalizeDailyRoutes(raw: unknown): DailyRouteDTO[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(normalizeDailyRoute)
    .filter((route): route is DailyRouteDTO => route !== null);
}

/** Total de entidades vinculadas; null quando algum contador é desconhecido. */
export function routeEntityCount(
  route: Pick<DailyRouteDTO, "counts">
): number | null {
  const counts = route.counts;
  if (!counts) return null;

  return (
    counts.demands + counts.tickets + counts.chamados + counts.osExternas
  );
}

/** Só é vazia quando todos os contadores são conhecidos e zerados. */
export function routeIsEmpty(route: Pick<DailyRouteDTO, "counts">): boolean {
  return routeEntityCount(route) === 0;
}
