import type { NextApiRequest, NextApiResponse } from "next";
import { AUTH_ROLES, requireRole } from "@/utils/api-auth";
import type { AuditActor } from "./service";

/**
 * Toda API administrativa da pesquisa exige ADMTOTAL no servidor. Esconder o
 * item de menu não é controle de acesso.
 */
export async function requireFeedbackAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuditActor | null> {
  const auth = await requireRole(req, res, [AUTH_ROLES.ADMTOTAL]);
  if (!auth) return null;
  return {
    userId: auth.id,
    name: auth.profile.displayName,
    role: auth.profile.role,
  };
}

/** IP do cliente a partir dos headers da Vercel, sem confiar só no XFF. */
export function requestIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export function requestBaseUrl(req: NextApiRequest): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    req.headers.host ||
    "localhost:3000";
  return `${proto}://${host}`;
}
