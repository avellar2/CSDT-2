/**
 * Rascunhos locais de finalização de OS externa + identidade da tentativa.
 *
 * Regras desta correção:
 * - Um rascunho nunca impede o técnico de abrir/lançar outra OS; a leitura
 *   não restaura nada automaticamente.
 * - Nada expira em 24h nem é descartado ao atingir 5 registros. O rascunho só
 *   sai daqui quando a OS é concluída, quando o usuário descarta ou quando o
 *   próprio navegador apaga o armazenamento.
 * - A tentativa (`clientRequestId`) é preservada entre recargas, falhas de
 *   upload, expiração de sessão e mudança de dia; só é renovada quando o
 *   técnico escolhe explicitamente iniciar uma nova OS.
 *
 * O módulo não toca em APIs de navegador no carregamento e é seguro para SSR.
 */

export type FinalizationStage =
  | "save"
  | "fotos"
  | "token"
  | "pdf"
  | "email"
  | "chamado"
  | "concluida";

export interface PendingFinalization {
  numeroOs: string;
  stage: FinalizationStage;
  at: number;
  school: string;
  /** Data operacional original da OS (YYYY-MM-DD). Nunca é trocada ao retomar. */
  date: string;
  confirmToken?: string;
  form?: Record<string, unknown>;
  /** Última falha conhecida, para orientar a retomada. */
  lastError?: string;
}

export interface LaunchAttempt {
  requestId: string;
  fingerprint: string;
  at: number;
  /** Número da OS obtido quando o salvamento concluiu. */
  numeroOs?: string;
  completed?: boolean;
}

const PENDING_PREFIX = "csdt:os-externa:finalizacao-pendente:";
const ATTEMPT_PREFIX = "csdt:os-externa:tentativa:";
const PENDING_SCHEMA_VERSION = 2;

interface PendingEnvelope {
  version: number;
  items: PendingFinalization[];
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function pendingStorageKey(userId: string): string {
  return `${PENDING_PREFIX}${userId}`;
}

export function attemptStorageKey(userId: string): string {
  return `${ATTEMPT_PREFIX}${userId}`;
}

export function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values.filter(
        (value): value is string => typeof value === "string" && value.trim() !== ""
      )
    )
  );
}

export function serializeFormDraft(data: Record<string, unknown>): Record<string, unknown> {
  const draft: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "fotosAntes" || key === "fotosDepois") {
      draft[key] = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      draft[key] = value;
    }
  }
  return draft;
}

function isPendingFinalization(value: unknown): value is PendingFinalization {
  const item = value as PendingFinalization | null;
  return Boolean(item && typeof item.numeroOs === "string" && item.numeroOs.trim());
}

function parsePendingList(raw: string | null): PendingFinalization[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter(isPendingFinalization);
    if (parsed && typeof parsed === "object" && "items" in parsed) {
      const envelope = parsed as PendingEnvelope;
      if (Array.isArray(envelope.items)) return envelope.items.filter(isPendingFinalization);
    }
    // Compatibilidade com o formato antigo (um único objeto).
    return isPendingFinalization(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

/**
 * Lê os rascunhos do usuário sem expirar nem limitar a quantidade.
 * Mais recentes primeiro.
 */
export function readPendingFinalizations(userId: string): PendingFinalization[] {
  const storage = getStorage();
  if (!storage || !userId) return [];
  const list = parsePendingList(storage.getItem(pendingStorageKey(userId)));

  // Migra silenciosamente para o envelope versionado (sem perder registros).
  if (list.length && !storage.getItem(pendingStorageKey(userId))?.includes("\"version\"")) {
    try {
      writePendingList(storage, userId, list);
    } catch {
      // Leitura continua válida mesmo se não for possível regravar agora.
    }
  }

  return [...list].sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
}

function writePendingList(
  storage: Storage,
  userId: string,
  items: PendingFinalization[]
): void {
  const envelope: PendingEnvelope = { version: PENDING_SCHEMA_VERSION, items };
  storage.setItem(pendingStorageKey(userId), JSON.stringify(envelope));
}

/** Grava/atualiza um rascunho. Retorna false apenas se o navegador recusou. */
export function writePendingFinalization(
  userId: string,
  pending: PendingFinalization
): boolean {
  const storage = getStorage();
  if (!storage || !userId) return false;
  try {
    const current = readPendingFinalizations(userId).filter(
      (item) => item.numeroOs !== pending.numeroOs
    );
    writePendingList(storage, userId, [pending, ...current]);
    return true;
  } catch {
    return false;
  }
}

export function clearPendingFinalization(userId: string, numeroOs: string): void {
  const storage = getStorage();
  if (!storage || !userId) return;
  try {
    const next = readPendingFinalizations(userId).filter(
      (item) => item.numeroOs !== numeroOs
    );
    if (next.length) writePendingList(storage, userId, next);
    else storage.removeItem(pendingStorageKey(userId));
  } catch {
    // Sem armazenamento local não há o que limpar.
  }
}

export function findPendingFinalization(
  userId: string,
  numeroOs: string
): PendingFinalization | null {
  return (
    readPendingFinalizations(userId).find((item) => item.numeroOs === numeroOs) ||
    null
  );
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Identidade do conteúdo do atendimento. A data NÃO entra aqui de propósito:
 * a mesma tentativa continua válida se a finalização atravessar a meia-noite.
 */
export function draftFingerprint(data: Record<string, unknown>): string {
  return [
    normalizeText(data.unidadeEscolar),
    normalizeText(data.tecnicoResponsavel),
    normalizeText(data.solicitacaoDaVisita),
    normalizeText(data.relatorio),
    normalizeText(data.solucionado),
  ].join("|");
}

/** Rascunho local que corresponde ao mesmo atendimento (escola + conteúdo). */
export function findPendingForDraft(
  userId: string,
  data: Record<string, unknown>
): PendingFinalization | null {
  const school = normalizeText(data.unidadeEscolar);
  const fingerprint = draftFingerprint(data);
  return (
    readPendingFinalizations(userId).find((item) => {
      if (!item.form) return false;
      if (normalizeText(item.school) !== school) return false;
      return draftFingerprint(item.form) === fingerprint;
    }) || null
  );
}

export function generateRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback abaixo
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function readLaunchAttempt(userId: string): LaunchAttempt | null {
  const storage = getStorage();
  if (!storage || !userId) return null;
  try {
    const raw = storage.getItem(attemptStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaunchAttempt;
    if (!parsed || typeof parsed.requestId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLaunchAttempt(userId: string, attempt: LaunchAttempt): void {
  const storage = getStorage();
  if (!storage || !userId) return;
  try {
    storage.setItem(attemptStorageKey(userId), JSON.stringify(attempt));
  } catch {
    // Sem localStorage a tentativa é gerada em memória pelo chamador.
  }
}

/**
 * Reaproveita o `clientRequestId` da tentativa em andamento. Sem TTL: uma
 * falha de upload ou uma finalização retomada dias depois continua sendo a
 * MESMA tentativa, e o backend devolve a OS já criada em vez de duplicá-la.
 */
export function getAttemptRequestId(
  userId: string,
  data: Record<string, unknown>
): string {
  const fingerprint = draftFingerprint(data);
  const existing = readLaunchAttempt(userId);

  if (
    existing &&
    !existing.completed &&
    existing.fingerprint === fingerprint &&
    !existing.numeroOs
  ) {
    return existing.requestId;
  }

  // Já existe OS para esta tentativa:
  // - mesmo conteúdo → continua sendo a MESMA tentativa (retomada);
  // - conteúdo diferente → é um atendimento novo; gera outro requestId sem
  //   apagar a OS pendente anterior (que segue visível para retomada).
  if (existing && !existing.completed && existing.numeroOs) {
    if (existing.fingerprint === fingerprint) return existing.requestId;

    const requestId = generateRequestId();
    writeLaunchAttempt(userId, { requestId, fingerprint, at: Date.now() });
    return requestId;
  }

  const requestId = generateRequestId();
  writeLaunchAttempt(userId, { requestId, fingerprint, at: Date.now() });
  return requestId;
}

export function recordAttemptOs(userId: string, numeroOs: string): void {
  const existing = readLaunchAttempt(userId);
  writeLaunchAttempt(userId, {
    requestId: existing?.requestId || generateRequestId(),
    fingerprint: existing?.fingerprint || "",
    at: existing?.at || Date.now(),
    numeroOs,
  });
}

/** Conclui a tentativa. A próxima OS legítima recebe um novo requestId. */
export function clearLaunchAttempt(userId: string): void {
  const storage = getStorage();
  if (!storage || !userId) return;
  try {
    const existing = readLaunchAttempt(userId);
    if (existing) {
      writeLaunchAttempt(userId, { ...existing, completed: true, numeroOs: undefined });
      storage.removeItem(attemptStorageKey(userId));
    }
  } catch {
    // ignora
  }
}

/** Botão "Iniciar nova OS": preserva rascunhos, mas gera nova tentativa. */
export function startNewLaunchAttempt(userId: string): void {
  const storage = getStorage();
  if (!storage || !userId) return;
  try {
    storage.removeItem(attemptStorageKey(userId));
  } catch {
    // ignora
  }
}

/** Mescla URLs de fotos sem duplicar e sem descartar as já gravadas. */
export function mergePhotoUrls(...groups: unknown[]): string[] {
  return Array.from(new Set(groups.flatMap((group) => uniqueStrings(group))));
}
