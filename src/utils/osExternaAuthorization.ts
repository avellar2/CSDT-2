import type { AuthUser } from "@/utils/api-auth";
import prisma from "@/utils/prisma";
import { isRouteManager } from "@/utils/operationalRoutes";
import {
  loadOsScope,
  technicianCanSeeOsExterna,
} from "@/utils/operationalOsScope";

/**
 * Autorização para operar uma OS externa específica.
 *
 * Não basta estar autenticado: o usuário precisa ser gestor, o criador da OS
 * (registro de idempotência), o técnico responsável/parceiro ou participar da
 * rota vinculada. As regras de visibilidade existentes são preservadas.
 */
export interface OsExternaPermissionInput {
  id: number;
  status?: string | null;
  routeId?: number | null;
  data?: string | null;
  createdAt?: Date | string | null;
  tecnicoResponsavel?: string | null;
}

export type OsExternaPermission =
  | { allowed: true; reason: "manager" | "creator" | "responsible" | "route" }
  | { allowed: false; reason: string };

export function isMissingIdempotencyTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "P2021" || code === "P2022" || code === "P2010";
}

export async function authorizeOsExterna(
  auth: AuthUser,
  os: OsExternaPermissionInput
): Promise<OsExternaPermission> {
  if (isRouteManager(auth.profile.role)) {
    return { allowed: true, reason: "manager" };
  }

  if (auth.profile.role !== "TECH") {
    return {
      allowed: false,
      reason: "Perfil sem permissão para operar esta OS.",
    };
  }

  // Criador identificado pelo registro de idempotência (fonte confiável).
  try {
    const claim = await prisma.osExternaSubmission.findFirst({
      where: { osId: os.id, userId: auth.id },
      select: { id: true },
    });
    if (claim) return { allowed: true, reason: "creator" };
  } catch (error) {
    if (!isMissingIdempotencyTable(error)) throw error;
    // Tabela ainda não migrada: segue para as regras de responsável/rota.
  }

  // Responsável principal ou parceiro listado explicitamente na OS.
  const responsibleNames = (os.tecnicoResponsavel || "")
    .split(" / ")
    .map((name) => name.trim())
    .filter(Boolean);

  if (responsibleNames.includes(auth.profile.displayName)) {
    return { allowed: true, reason: "responsible" };
  }

  const scope = await loadOsScope(auth);
  if (technicianCanSeeOsExterna(scope, os)) {
    return { allowed: true, reason: "route" };
  }

  return {
    allowed: false,
    reason: "Esta OS pertence a outro técnico ou a outra rota.",
  };
}
