/**
 * Estado de finalização técnica de uma OS externa.
 *
 * A fonte confiável é o banco: fotos gravadas, token de confirmação
 * (`assinado`), `lastEmailSent` e existência do chamado de reagendamento.
 * Quando a tabela aditiva `OsExternaFinalizationState` estiver migrada, a
 * etapa exata registrada pelo fluxo tem prioridade; sem ela, o estado é
 * derivado dos próprios dados da OS (compatível com o banco atual).
 *
 * O status de finalização técnica é independente do status de assinatura da
 * escola: "aguardando assinatura" NÃO é uma pendência do técnico.
 */

export type OsExternaFinalizationStage =
  | "fotos"
  | "token"
  | "pdf"
  | "email"
  | "chamado"
  | "aguardando-assinatura"
  | "assinada"
  | "recusada";

export interface OsExternaFinalizationInput {
  status?: string | null;
  fotosAntes?: unknown;
  fotosDepois?: unknown;
  assinado?: string | null;
  lastEmailSent?: Date | string | null;
  motivoRecusa?: string | null;
  recusadoEm?: Date | string | null;
  solucionado?: string | null;
}

export interface OsExternaFinalizationDerived {
  stage: OsExternaFinalizationStage;
  label: string;
  description: string;
  /** Pendência que ainda depende de ação do técnico. */
  isPendingFinalization: boolean;
  totalFotos: number;
  validFotos: number;
  missingFotos: number;
  hasToken: boolean;
  emailSent: boolean;
  chamadoCriado: boolean;
}

const STAGE_LABELS: Record<OsExternaFinalizationStage, string> = {
  fotos: "Fotos pendentes",
  token: "Token de confirmação pendente",
  pdf: "Documento (PDF) pendente",
  email: "E-mail pendente",
  chamado: "Chamado de reagendamento pendente",
  "aguardando-assinatura": "Aguardando assinatura da escola",
  assinada: "Assinada",
  recusada: "Recusada",
};

const STAGE_DESCRIPTIONS: Record<OsExternaFinalizationStage, string> = {
  fotos: "A OS foi salva, mas as fotos ainda não foram enviadas.",
  token: "As fotos estão salvas; falta gerar o token de confirmação.",
  pdf: "O token está pronto; falta gerar o PDF da OS.",
  email: "A OS e o token estão prontos; falta enviar o e-mail para a escola.",
  chamado: "A OS foi enviada; falta criar o chamado de reagendamento.",
  "aguardando-assinatura": "Finalização técnica concluída. A escola ainda não assinou.",
  assinada: "OS assinada pela escola.",
  recusada: "A escola recusou a OS.",
};

/** Considera apenas URLs não vazias (o bug antigo gravava `""` por foto). */
export function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      )
    )
  );
}

export function isValidConfirmationToken(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 10;
}

export function isFinalizationStage(value: unknown): value is OsExternaFinalizationStage {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(STAGE_LABELS, value)
  );
}

function isSignedStatus(status: string | null | undefined): boolean {
  return typeof status === "string" && status !== "Pendente" && status !== "";
}

export function deriveOsExternaFinalization(
  os: OsExternaFinalizationInput,
  options: { storedStage?: string | null; hasChamadoReagendamento?: boolean } = {}
): OsExternaFinalizationDerived {
  const fotosAntes = normalizePhotoUrls(os.fotosAntes);
  const fotosDepois = normalizePhotoUrls(os.fotosDepois);
  const totalFotos = fotosAntes.length + fotosDepois.length;
  const hasToken = isValidConfirmationToken(os.assinado);
  const emailSent = Boolean(os.lastEmailSent);
  const chamadoCriado = Boolean(options.hasChamadoReagendamento);
  const wasRefused = Boolean(os.motivoRecusa || os.recusadoEm);

  let stage: OsExternaFinalizationStage;

  if (wasRefused) {
    stage = "recusada";
  } else if (isSignedStatus(os.status)) {
    stage = "assinada";
  } else if (isFinalizationStage(options.storedStage)) {
    // A etapa registrada pelo fluxo reflete exatamente onde ele parou,
    // inclusive quando a OS legitimamente não tem fotos.
    stage = options.storedStage;
  } else if (totalFotos === 0 && os.status === "Pendente") {
    stage = "fotos";
  } else if (!hasToken) {
    stage = "token";
  } else if (!emailSent) {
    stage = "email";
  } else if (os.solucionado && os.solucionado !== "Sim" && !chamadoCriado) {
    stage = "chamado";
  } else {
    stage = "aguardando-assinatura";
  }

  return {
    stage,
    label: STAGE_LABELS[stage],
    description: STAGE_DESCRIPTIONS[stage],
    isPendingFinalization:
      stage === "fotos" ||
      stage === "token" ||
      stage === "pdf" ||
      stage === "email" ||
      stage === "chamado",
    totalFotos,
    validFotos: totalFotos,
    missingFotos: totalFotos === 0 ? 1 : 0,
    hasToken,
    emailSent,
    chamadoCriado,
  };
}

/** Rótulos usados durante o envio (progresso na tela). */
export const FINALIZATION_PROGRESS_LABELS = {
  save: "Salvando OS...",
  fotos: "Enviando fotos...",
  token: "Gerando documento...",
  pdf: "Gerando documento...",
  email: "Enviando e-mail...",
  chamado: "Criando chamado de reagendamento...",
  done: "Finalizando atendimento...",
} as const;

export const FINALIZATION_STAGE_LABELS: Record<string, string> = {
  save: "salvar a OS",
  fotos: "enviar as fotos",
  token: "gerar o token de confirmação",
  pdf: "gerar o PDF",
  email: "enviar o e-mail para a escola",
  chamado: "criar o chamado de reagendamento",
};
