/**
 * Utilitário client-side para autenticação em chamadas de API.
 *
 * Fonte confiável do token: a sessão atual do Supabase. O localStorage
 * (`token`) é mantido apenas como espelho para os módulos que ainda usam o
 * helper síncrono — ele é atualizado sempre que o Supabase renova a sessão.
 *
 * Em celulares (Android/iOS) o navegador pode ficar em segundo plano por
 * muito tempo; o access_token expira e o Supabase o renova em memória. Ler
 * somente o localStorage deixava o sistema enviando um token vencido e as
 * APIs respondiam 401 "Token inválido ou expirado". Por isso as chamadas do
 * fluxo de OS externa usam `authedFetch`, que resolve/renova a sessão antes
 * de enviar e trata 401 sem repetir escritas às cegas.
 */

import { supabase } from "@/lib/supabaseClient";

const TOKEN_STORAGE_KEY = "token";

export const SESSION_MISSING_MESSAGE =
  "Sua sessão não foi encontrada. Entre novamente no sistema para continuar. Os dados preenchidos foram preservados nesta tela.";

export const SESSION_EXPIRED_MESSAGE =
  "Sua sessão expirou. Entre novamente no sistema para continuar. Os dados preenchidos foram preservados nesta tela.";

export type AuthSessionErrorReason = "missing" | "expired";

export class AuthSessionError extends Error {
  readonly reason: AuthSessionErrorReason;

  constructor(reason: AuthSessionErrorReason) {
    super(reason === "missing" ? SESSION_MISSING_MESSAGE : SESSION_EXPIRED_MESSAGE);
    this.name = "AuthSessionError";
    this.reason = reason;
  }
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Mantém o espelho usado pelos helpers síncronos em dia. */
export function syncStoredAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage indisponível (modo privado/bloqueio): segue sem espelho.
  }
}

let authSyncStarted = false;

/**
 * Sincroniza o localStorage com a sessão do Supabase e acompanha renovações.
 * Deve ser chamado uma vez no cliente (ver `_app.tsx`).
 */
export function startAuthTokenSync(): void {
  if (typeof window === "undefined" || authSyncStarted) return;
  authSyncStarted = true;

  supabase.auth
    .getSession()
    .then(({ data }) => syncStoredAuthToken(data.session?.access_token ?? null))
    .catch(() => {
      /* mantém o token existente; quem precisa valida no servidor */
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    syncStoredAuthToken(session?.access_token ?? null);
  });
}

/**
 * Versão síncrona mantida para os módulos existentes. Prefere o espelho da
 * sessão atual; se ele não existir, usa o token salvo no login.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getAuthHeadersNoContentType(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Retorna um access_token utilizável agora.
 *
 * - Usa a sessão do Supabase (que renova automaticamente quando expirada).
 * - Se a sessão estiver prestes a expirar, força `refreshSession()`.
 * - Se não houver sessão, cai para o token espelhado (compatibilidade).
 */
export async function getFreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token ?? null;
    const expiresAt = data.session?.expires_at;

    // Renova proativamente tokens que vencem em menos de 60s.
    if (token && expiresAt && expiresAt * 1000 <= Date.now() + 60_000) {
      token = (await refreshAccessToken()) ?? token;
    }

    if (token) {
      syncStoredAuthToken(token);
      return token;
    }
    return readStoredToken();
  } catch {
    return readStoredToken();
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.refreshSession();
    const token = data.session?.access_token ?? null;
    if (token) syncStoredAuthToken(token);
    return token;
  } catch {
    return null;
  }
}

function withAuthorization(init: RequestInit, token: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export interface AuthedFetchOptions {
  /**
   * Repetir uma vez após renovar a sessão quando a API responder 401.
   * Só habilite em escritas cujo endpoint valida autenticação antes de
   * qualquer efeito colateral (padrão neste projeto).
   */
  retryOn401?: boolean;
}

/**
 * `fetch` autenticado com recuperação controlada de sessão.
 *
 * 1. Envia o access_token atual.
 * 2. Em 401, tenta renovar a sessão uma única vez.
 * 3. Repete no máximo uma vez — e, para métodos não idempotentes, apenas se
 *    `retryOn401` for explicitamente habilitado.
 *
 * Não faz retries em loop e nunca envia token para os logs.
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthedFetchOptions = {},
): Promise<Response> {
  const token = await getFreshAccessToken();
  if (!token) throw new AuthSessionError("missing");

  const response = await fetch(input, withAuthorization(init, token));
  if (response.status !== 401) return response;

  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = options.retryOn401 ?? (method === "GET" || method === "HEAD");
  if (!canRetry) throw new AuthSessionError("expired");

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken || refreshedToken === token) {
    throw new AuthSessionError("expired");
  }

  const retried = await fetch(input, withAuthorization(init, refreshedToken));
  if (retried.status === 401) throw new AuthSessionError("expired");
  return retried;
}

/** Extrai a mensagem de erro de uma resposta da API sem expor detalhes internos. */
export async function getApiErrorMessage(
  response: Response,
  fallback = "Erro inesperado. Tente novamente.",
): Promise<string> {
  try {
    const data = await response.clone().json();
    if (data && typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
  } catch {
    // resposta sem JSON
  }
  return fallback;
}

/** Mensagem amigável para erros de rede/sessão em português. */
export function describeRequestError(error: unknown, fallback: string): string {
  if (error instanceof AuthSessionError) return error.message;
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "Falha de conexão com o servidor. Verifique a internet e tente novamente.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
