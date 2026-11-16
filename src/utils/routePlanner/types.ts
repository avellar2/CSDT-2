/**
 * Tipos compartilhados do planejador de rotas viárias.
 *
 * O planejador trabalha com uma matriz de custos (tempo/distância) obtida de
 * um provedor de roteamento real (OSRM por padrão). Nada aqui depende de
 * distância em linha reta — quando o provedor falha e o modo aproximado é
 * permitido, o resultado é explicitamente marcado como estimativa.
 */

export type LatLng = { lat: number; lng: number };

export interface PlannerSchool {
  id: number;
  name: string;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded: boolean;
}

/** Matriz de custos com índices alinhados a `points`. */
export interface CostMatrix {
  /** Durações em segundos. `durations[i][j]` = i → j. */
  durations: number[][];
  /** Distâncias em metros. */
  distances: number[][];
}

export interface RouteGeometry {
  /** Sequência [lat, lng] que segue as vias. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export interface RoutingProvider {
  /** Identificador do provedor, exposto na resposta da API. */
  name: string;
  /** `false` quando o provedor está desabilitado por configuração. */
  enabled: boolean;
  table(points: LatLng[]): Promise<CostMatrix>;
  route(points: LatLng[]): Promise<RouteGeometry>;
}

export type RoutingErrorCode =
  | "disabled"
  | "timeout"
  | "http"
  | "invalid_response"
  | "no_route"
  | "too_many_points";

export class RoutingError extends Error {
  code: RoutingErrorCode;

  constructor(code: RoutingErrorCode, message: string) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
  }
}

export interface PlannerStart {
  lat: number;
  lng: number;
  name: string;
}

export interface PlanRequest {
  /** IDs das escolas selecionadas. */
  schools: number[];
  /** IDs das escolas que devem ser visitadas antes das demais. */
  prioritySchools?: number[];
  /** Escola que deve ocupar a primeira parada do seu bloco. */
  fixedFirstSchoolId?: number | null;
  start?: PlannerStart | null;
  /** `true` = CSDT → escolas → CSDT; `false` = somente ida. */
  returnToStart?: boolean;
  /** Tempo de atendimento por escola, em minutos (padrão 30). */
  serviceMinutes?: number;
  /** Horário de saída do ponto de partida, "HH:MM" (America/Sao_Paulo). */
  startTime?: string;
  /** Data operacional "YYYY-MM-DD". */
  dateKey: string;
  /**
   * Permite cair para uma matriz aproximada quando o provedor falha.
   * O resultado vem marcado com `approximate: true`.
   */
  allowApproximate?: boolean;
}

export interface PlannedStop {
  schoolId: number;
  name: string;
  address: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  priority: boolean;
  /** Posição na rota, começando em 1. */
  order: number;
  /** Trecho percorrido desde a parada anterior. */
  legDistanceMeters: number;
  legDurationSeconds: number;
  /** ISO 8601 com offset de America/Sao_Paulo. */
  arrivalTime: string;
  departureTime: string;
  serviceMinutes: number;
}

export interface ExcludedSchool {
  schoolId: number;
  name: string;
  reason: string;
}

export interface PlanTotals {
  distanceMeters: number;
  /** Tempo ao volante, em segundos (inclui o retorno, quando houver). */
  drivingSeconds: number;
  /** Tempo de atendimento somado, em minutos. */
  serviceMinutes: number;
  /** Jornada completa (deslocamento + atendimentos), em minutos. */
  totalMinutes: number;
  /** Minutos do trecho de volta ao ponto de partida (0 no modo somente ida). */
  returnMinutes: number;
}

export interface PlanResult {
  stops: PlannedStop[];
  /** Geometria viária completa, incluindo o retorno quando configurado. */
  geometry: [number, number][];
  totals: PlanTotals;
  algorithm: string;
  provider: string;
  /** `true` quando os custos vieram de uma estimativa, não de vias reais. */
  approximate: boolean;
  start: PlannerStart;
  returnToStart: boolean;
  serviceMinutes: number;
  startTime: string;
  dateKey: string;
  /** Escolas selecionadas que não puderam entrar na rota (nunca silencioso). */
  excluded: ExcludedSchool[];
  warnings: string[];
}
