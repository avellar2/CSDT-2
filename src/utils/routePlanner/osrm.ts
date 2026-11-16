import {
  CostMatrix,
  LatLng,
  RouteGeometry,
  RoutingError,
  RoutingProvider,
} from "./types";

/**
 * Adaptador para o OSRM (Open Source Routing Machine).
 *
 * O servidor público `router.project-osrm.org` é DEMONSTRATIVO: não há SLA,
 * pode limitar requisições e pode ficar indisponível. Por isso o adaptador
 * tem timeout, cache em memória, controle de concorrência e intervalo mínimo
 * entre chamadas. Para produção, defina `OSRM_BASE_URL` apontando para uma
 * instância própria.
 *
 * Contrato do OSRM:
 * - `GET /table/v1/driving/{lng},{lat};...?annotations=duration,distance`
 * - `GET /route/v1/driving/{lng},{lat};...?overview=full&geometries=geojson`
 *
 * O modo de perfil (`driving`) é fixo: não há informação de trânsito em tempo
 * real no OSRM, então a UI nunca deve prometer isso.
 */

export const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";

/** O OSRM público aceita até 100 coordenadas por requisição de tabela. */
export const MAX_TABLE_POINTS = 100;

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MIN_INTERVAL_MS = 250;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CACHE_MAX_ENTRIES = 200;

export interface OsrmProviderOptions {
  baseUrl?: string;
  timeoutMs?: number;
  /** Intervalo mínimo entre requisições ao provedor. */
  minIntervalMs?: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
  /** Permite desligar o provedor (ex.: em testes ou manutenção). */
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(
    private ttlMs: number,
    private maxEntries: number,
    private now: () => number
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Renova a ordem de inserção para aproximar um LRU.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/** Serializa coordenadas em um formato estável para servir de chave de cache. */
export function coordinatesKey(points: LatLng[]): string {
  return points
    .map((point) => `${point.lng.toFixed(5)},${point.lat.toFixed(5)}`)
    .join(";");
}

/** Converte pontos em `lng,lat;lng,lat` como o OSRM espera. */
function buildCoordinatesPath(points: LatLng[]): string {
  return points.map((point) => `${point.lng},${point.lat}`).join(";");
}

function assertValidPoints(points: LatLng[]): void {
  for (const point of points) {
    if (
      !Number.isFinite(point.lat) ||
      !Number.isFinite(point.lng) ||
      Math.abs(point.lat) > 90 ||
      Math.abs(point.lng) > 180
    ) {
      throw new RoutingError(
        "invalid_response",
        `Coordenada inválida recebida pelo roteador: ${point.lat}, ${point.lng}`
      );
    }
  }
}

export class OsrmProvider implements RoutingProvider {
  name = "osrm";
  enabled: boolean;

  private baseUrl: string;
  private timeoutMs: number;
  private minIntervalMs: number;
  private fetchImpl: typeof fetch;
  private now: () => number;
  private tableCache: TtlCache<CostMatrix>;
  private routeCache: TtlCache<RouteGeometry>;
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(options: OsrmProviderOptions = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_OSRM_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
    this.enabled = options.enabled ?? true;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => Date.now());

    const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    const max = options.cacheMaxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
    this.tableCache = new TtlCache<CostMatrix>(ttl, max, this.now);
    this.routeCache = new TtlCache<RouteGeometry>(ttl, max, this.now);
  }

  /** Executa as requisições em série respeitando o intervalo mínimo. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.minIntervalMs - (this.now() - this.lastRequestAt);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      this.lastRequestAt = this.now();
      return task();
    });

    // A fila não deve reter rejeições (evita unhandled rejection).
    this.queue = run.then(
      () => undefined,
      () => undefined
    );

    return run;
  }

  private async requestJson(path: string): Promise<unknown> {
    if (!this.enabled) {
      throw new RoutingError(
        "disabled",
        "O serviço de roteamento está desabilitado por configuração."
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new RoutingError(
          "http",
          `O serviço de roteamento respondeu com status ${response.status}.`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof RoutingError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new RoutingError(
          "timeout",
          `O serviço de roteamento não respondeu em ${Math.round(
            this.timeoutMs / 1000
          )}s.`
        );
      }
      throw new RoutingError(
        "http",
        "Não foi possível contatar o serviço de roteamento."
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async table(points: LatLng[]): Promise<CostMatrix> {
    if (points.length < 2) {
      throw new RoutingError(
        "invalid_response",
        "A matriz de custos exige ao menos dois pontos."
      );
    }

    if (points.length > MAX_TABLE_POINTS) {
      throw new RoutingError(
        "too_many_points",
        `A matriz viária aceita no máximo ${MAX_TABLE_POINTS} pontos por cálculo ` +
          `(recebidos ${points.length}).`
      );
    }

    assertValidPoints(points);

    const key = coordinatesKey(points);
    const cached = this.tableCache.get(key);
    if (cached) return cached;

    const path =
      `/table/v1/driving/${buildCoordinatesPath(points)}` +
      `?annotations=duration,distance`;

    const payload = await this.enqueue(() => this.requestJson(path));
    const matrix = parseTableResponse(payload, points.length);
    this.tableCache.set(key, matrix);
    return matrix;
  }

  async route(points: LatLng[]): Promise<RouteGeometry> {
    if (points.length < 2) {
      throw new RoutingError(
        "invalid_response",
        "O traçado da rota exige ao menos dois pontos."
      );
    }

    assertValidPoints(points);

    const key = coordinatesKey(points);
    const cached = this.routeCache.get(key);
    if (cached) return cached;

    const path =
      `/route/v1/driving/${buildCoordinatesPath(points)}` +
      `?overview=full&geometries=geojson&steps=false&alternatives=false`;

    const payload = await this.enqueue(() => this.requestJson(path));
    const geometry = parseRouteResponse(payload);
    this.routeCache.set(key, geometry);
    return geometry;
  }

  /** Limpa os caches (útil em testes). */
  clearCache(): void {
    this.tableCache.clear();
    this.routeCache.clear();
  }
}

interface OsrmTablePayload {
  code?: string;
  message?: string;
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}

function parseTableResponse(payload: unknown, size: number): CostMatrix {
  const data = payload as OsrmTablePayload | null;

  if (!data || typeof data !== "object" || data.code !== "Ok") {
    throw new RoutingError(
      "invalid_response",
      `Resposta inválida do serviço de roteamento${
        data?.message ? `: ${data.message}` : ""
      }.`
    );
  }

  const durations = data.durations;
  const distances = data.distances;

  if (!Array.isArray(durations) || !Array.isArray(distances)) {
    throw new RoutingError(
      "invalid_response",
      "O serviço de roteamento não retornou a matriz de durações e distâncias."
    );
  }

  if (durations.length !== size || distances.length !== size) {
    throw new RoutingError(
      "invalid_response",
      "A matriz retornada pelo serviço de roteamento tem dimensões inesperadas."
    );
  }

  const build = (rows: (number | null)[][]): number[][] =>
    rows.map((row, i) => {
      if (!Array.isArray(row) || row.length !== size) {
        throw new RoutingError(
          "invalid_response",
          "A matriz retornada pelo serviço de roteamento está incompleta."
        );
      }
      return row.map((value, j) => {
        if (i === j) return 0;
        // OSRM devolve `null` quando não há caminho viário entre dois pontos.
        if (value === null || value === undefined || !Number.isFinite(value)) {
          return Number.POSITIVE_INFINITY;
        }
        return value;
      });
    });

  return { durations: build(durations), distances: build(distances) };
}

interface OsrmRoutePayload {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: number[][] };
  }>;
}

function parseRouteResponse(payload: unknown): RouteGeometry {
  const data = payload as OsrmRoutePayload | null;

  if (!data || typeof data !== "object" || data.code !== "Ok") {
    throw new RoutingError(
      "no_route",
      `Não foi possível traçar a rota viária${
        data?.message ? `: ${data.message}` : ""
      }.`
    );
  }

  const route = data.routes?.[0];
  if (!route) {
    throw new RoutingError("no_route", "O serviço de roteamento não retornou rota.");
  }

  const rawCoordinates = route.geometry?.coordinates;
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length === 0) {
    throw new RoutingError(
      "invalid_response",
      "O serviço de roteamento retornou uma geometria vazia."
    );
  }

  const coordinates = rawCoordinates
    .filter(
      (pair): pair is number[] =>
        Array.isArray(pair) && pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1])
    )
    .map((pair) => [pair[1], pair[0]] as [number, number]);

  if (coordinates.length === 0) {
    throw new RoutingError(
      "invalid_response",
      "O serviço de roteamento retornou coordenadas inválidas."
    );
  }

  return {
    coordinates,
    distanceMeters: Number.isFinite(route.distance) ? Number(route.distance) : 0,
    durationSeconds: Number.isFinite(route.duration) ? Number(route.duration) : 0,
  };
}

let sharedProvider: OsrmProvider | null = null;

/**
 * Provedor compartilhado da aplicação. Configurável por ambiente:
 * - `OSRM_BASE_URL` — instância própria (recomendado em produção);
 * - `ROUTING_PROVIDER=disabled` — desliga o provedor;
 * - `OSRM_TIMEOUT_MS`, `OSRM_MIN_INTERVAL_MS` — ajustes de robustez.
 */
export function getOsrmProvider(): OsrmProvider {
  if (sharedProvider) return sharedProvider;

  const disabled = (process.env.ROUTING_PROVIDER || "").toLowerCase() === "disabled";
  const timeout = Number(process.env.OSRM_TIMEOUT_MS);
  const interval = Number(process.env.OSRM_MIN_INTERVAL_MS);

  sharedProvider = new OsrmProvider({
    baseUrl: process.env.OSRM_BASE_URL || DEFAULT_OSRM_BASE_URL,
    enabled: !disabled,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : undefined,
    minIntervalMs:
      Number.isFinite(interval) && interval >= 0 ? interval : undefined,
  });

  return sharedProvider;
}
