import prisma from "@/utils/prisma";

/**
 * Persistência do estado exato da finalização técnica (tabela aditiva).
 *
 * A tabela pode não existir no banco enquanto a migração aditiva não for
 * aplicada; nesse caso as funções abaixo degradam silenciosamente e o fluxo
 * continua usando a derivação por fotos/token/e-mail. Nenhuma chamada a esta
 * camada pode derrubar o lançamento da OS.
 */

export type StoredFinalizationStage =
  | "fotos"
  | "token"
  | "pdf"
  | "email"
  | "chamado"
  | "aguardando-assinatura";

function isMissingFinalizationTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "P2021" || code === "P2022" || code === "P2010" || code === "42P01";
}

function getStateModel() {
  return (prisma as unknown as {
    osExternaFinalizationState?: {
      upsert: (args: unknown) => Promise<unknown>;
      findUnique: (args: unknown) => Promise<unknown>;
      findMany: (args: unknown) => Promise<unknown>;
    };
  }).osExternaFinalizationState;
}

export async function saveOsExternaFinalizationState(params: {
  osId: number;
  stage: StoredFinalizationStage;
  lastError?: string | null;
  updatedBy?: string | null;
}): Promise<boolean> {
  const model = getStateModel();
  if (!model) return false;

  try {
    await model.upsert({
      where: { osId: params.osId },
      create: {
        osId: params.osId,
        stage: params.stage,
        lastError: params.lastError ?? null,
        updatedBy: params.updatedBy ?? null,
      },
      update: {
        stage: params.stage,
        lastError: params.lastError ?? null,
        updatedBy: params.updatedBy ?? null,
      },
    });
    return true;
  } catch (error) {
    if (!isMissingFinalizationTable(error)) {
      console.error("Falha ao registrar estado de finalização da OS:", error);
    }
    return false;
  }
}

export async function loadOsExternaFinalizationStates(
  osIds: number[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const model = getStateModel();
  if (!model || osIds.length === 0) return result;

  try {
    const rows = (await model.findMany({
      where: { osId: { in: osIds } },
      select: { osId: true, stage: true },
    })) as Array<{ osId: number; stage: string }>;

    for (const row of rows) {
      if (typeof row?.osId === "number" && typeof row?.stage === "string") {
        result.set(row.osId, row.stage);
      }
    }
  } catch (error) {
    if (!isMissingFinalizationTable(error)) {
      console.error("Falha ao carregar estados de finalização:", error);
    }
  }

  return result;
}

/**
 * Números de OS que já possuem chamado de reagendamento criado. O chamado é
 * idempotente por `osOriginal` no endpoint de chamados.
 */
export async function loadOsWithReagendamentoChamado(
  numerosOs: string[]
): Promise<Set<string>> {
  const result = new Set<string>();
  const numbers = numerosOs.filter(Boolean);
  if (numbers.length === 0) return result;

  try {
    const rows = await prisma.chamados_escalas.findMany({
      where: { osOriginal: { in: numbers } },
      select: { osOriginal: true },
      take: numbers.length * 2,
    });

    for (const row of rows) {
      if (row.osOriginal) result.add(row.osOriginal);
    }
  } catch (error) {
    console.error("Falha ao consultar chamados de reagendamento:", error);
  }

  return result;
}
