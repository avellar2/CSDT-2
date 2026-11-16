/**
 * Cálculo de horários estimados da rota.
 *
 * Tudo em America/Sao_Paulo (UTC-3, sem horário de verão desde 2019). Os
 * horários são estimativas a partir de um horário de saída informado e dos
 * tempos viários do provedor — não há trânsito em tempo real.
 */

export const SAO_PAULO_OFFSET = "-03:00";
export const DEFAULT_START_TIME = "08:00";
export const DEFAULT_SERVICE_MINUTES = 30;
export const MIN_SERVICE_MINUTES = 0;
export const MAX_SERVICE_MINUTES = 8 * 60;

/** Valida "HH:MM" (24h) e devolve os minutos desde a meia-noite. */
export function parseStartTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Valida a duração do atendimento por escola (minutos). */
export function normalizeServiceMinutes(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_SERVICE_MINUTES;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SERVICE_MINUTES;
  const rounded = Math.round(parsed);
  if (rounded < MIN_SERVICE_MINUTES) return MIN_SERVICE_MINUTES;
  if (rounded > MAX_SERVICE_MINUTES) return MAX_SERVICE_MINUTES;
  return rounded;
}

/** Soma dias a uma chave YYYY-MM-DD sem depender do fuso do processo. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Converte "minutos desde a meia-noite de `dateKey`" em ISO 8601 com offset
 * de São Paulo. Valores acima de 1440 avançam para o dia seguinte.
 */
export function formatSaoPauloDateTime(
  dateKey: string,
  minutesFromMidnight: number
): string {
  const total = Math.max(0, Math.round(minutesFromMidnight));
  const dayOffset = Math.floor(total / 1440);
  const minutesOfDay = total % 1440;

  const hours = String(Math.floor(minutesOfDay / 60)).padStart(2, "0");
  const minutes = String(minutesOfDay % 60).padStart(2, "0");
  const date = addDaysToDateKey(dateKey, dayOffset);

  return `${date}T${hours}:${minutes}:00${SAO_PAULO_OFFSET}`;
}

/** Formata minutos como "1h 25min" / "45min". */
export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

export interface ScheduleLeg {
  /** Tempo do trecho desde a parada anterior, em segundos. */
  travelSeconds: number;
  serviceMinutes: number;
}

export interface ScheduledLeg {
  arrivalTime: string;
  departureTime: string;
  arrivalMinutes: number;
  departureMinutes: number;
}

/**
 * Distribui os horários de chegada/partida ao longo da rota.
 * A chegada na primeira parada é `startMinutes + travelSeconds/60`.
 */
export function buildSchedule(
  dateKey: string,
  startTime: string,
  legs: ScheduleLeg[]
): ScheduledLeg[] {
  const startMinutes = parseStartTime(startTime) ?? parseStartTime(DEFAULT_START_TIME)!;
  let cursor = startMinutes;

  return legs.map((leg) => {
    const travelMinutes = Math.max(0, leg.travelSeconds) / 60;
    const arrivalMinutes = cursor + travelMinutes;
    const departureMinutes = arrivalMinutes + Math.max(0, leg.serviceMinutes);
    cursor = departureMinutes;

    return {
      arrivalTime: formatSaoPauloDateTime(dateKey, arrivalMinutes),
      departureTime: formatSaoPauloDateTime(dateKey, departureMinutes),
      arrivalMinutes,
      departureMinutes,
    };
  });
}
