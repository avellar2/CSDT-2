import prisma from "@/utils/prisma";
import { isMissingIdempotencyTable } from "@/utils/osExternaAuthorization";

/**
 * Claim de idempotência por tentativa de lançamento.
 *
 * A unique constraint em `requestId` serializa requisições simultâneas: só
 * uma cria a OS; as demais aguardam o `osId` e reaproveitam o mesmo registro.
 */
export type OsExternaClaimResult =
  | { kind: "claimed" }
  | { kind: "existing"; osId: number }
  | { kind: "in_progress" }
  | { kind: "unsupported" };

const STALE_CLAIM_MS = 60 * 1000;
const WAIT_MS = 2500;
const POLL_MS = 250;

function claimKey(userId: string, requestId: string): string {
  return `${userId}:${requestId}`;
}

/** Chave pública usada no update atômico dentro da transação de criação. */
export function osExternaClaimKey(userId: string, requestId: string): string {
  return claimKey(userId, requestId);
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Valida e normaliza o identificador enviado pelo cliente. */
export function normalizeClientRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}

/**
 * Tenta reservar a tentativa. Se outra requisição já reservou, aguarda o
 * `osId` (até ~2,5s). Claims órfãos (processo caiu) são recuperados após 60s.
 */
export async function claimOsExternaSubmission(
  userId: string,
  requestId: string
): Promise<OsExternaClaimResult> {
  const key = claimKey(userId, requestId);
  let reclaimed = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await prisma.osExternaSubmission.create({
        data: { requestId: key, userId },
      });
      return { kind: "claimed" };
    } catch (error) {
      if (isMissingIdempotencyTable(error)) return { kind: "unsupported" };
      if (!isUniqueViolation(error)) throw error;
    }

    const deadline = Date.now() + WAIT_MS;
    while (Date.now() < deadline) {
      const row = await prisma.osExternaSubmission.findUnique({
        where: { requestId: key },
        select: { osId: true, userId: true, createdAt: true },
      });

      if (!row) break; // claim removido por falha de validação
      if (row.userId !== userId) return { kind: "in_progress" };
      if (row.osId) return { kind: "existing", osId: row.osId };

      if (!reclaimed && Date.now() - row.createdAt.getTime() > STALE_CLAIM_MS) {
        await prisma.osExternaSubmission.deleteMany({
          where: { requestId: key, osId: null },
        });
        reclaimed = true;
        break;
      }

      await sleep(POLL_MS);
    }

    const finalRow = await prisma.osExternaSubmission.findUnique({
      where: { requestId: key },
      select: { osId: true },
    });
    if (finalRow?.osId) return { kind: "existing", osId: finalRow.osId };
    if (finalRow) return { kind: "in_progress" };
    // Claim desapareceu: tenta reservar novamente uma única vez.
  }

  return { kind: "in_progress" };
}

/** Libera um claim que não chegou a criar OS (validação/falha). */
export async function releaseOsExternaSubmission(
  userId: string,
  requestId: string
): Promise<void> {
  try {
    await prisma.osExternaSubmission.deleteMany({
      where: { requestId: claimKey(userId, requestId), osId: null },
    });
  } catch (error) {
    if (!isMissingIdempotencyTable(error)) throw error;
  }
}
