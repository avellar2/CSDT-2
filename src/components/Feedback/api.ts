import { getAuthHeaders } from "@/utils/client-auth";

export async function feedbackApi<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    const data = isJson ? await response.json().catch(() => null) : null;
    throw new Error(data?.error || `Falha na requisição (${response.status}).`);
  }

  return (isJson ? await response.json() : (response as unknown)) as T;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  READY: "Pronta para envio",
  SENDING: "Enviando",
  PAUSED: "Pausada",
  SENT: "Enviada",
  CLOSED: "Encerrada",
};

export const INVITE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  QUEUED: "Na fila",
  SENDING: "Enviando",
  SENT: "Enviado",
  FAILED: "Falhou",
  ANSWERED: "Respondido",
  EXCLUDED: "Excluído",
  EXPIRED: "Expirado",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  SENT: "Aceito pelo SMTP",
  FAILED_TEMPORARY: "Falha temporária",
  FAILED_PERMANENT: "Falha definitiva",
  CANCELLED: "Cancelado",
};
