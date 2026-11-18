import type { NextApiRequest, NextApiResponse } from "next";
import { getPublicInviteView, submitFeedbackResponse } from "@/utils/feedback/public";
import { checkRateLimit } from "@/utils/feedback/rateLimit";
import { requestIp } from "@/utils/feedback/adminAuth";

/**
 * API pública do formulário de pesquisa.
 *
 * - Não exige autenticação (a escola responde pelo link).
 * - Só expõe o formulário da campanha correspondente ao token.
 * - Nunca retorna respostas, outras escolas ou dados administrativos.
 */

const GET_LIMIT = 60;
const POST_LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  const token = req.query.token;
  if (typeof token !== "string" || token.length === 0) {
    return res.status(400).json({ error: "Link inválido." });
  }

  const ip = requestIp(req);

  if (req.method === "GET") {
    const limit = checkRateLimit(`feedback:get:${ip}`, GET_LIMIT, WINDOW_MS);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
    }

    try {
      const view = await getPublicInviteView(token);
      return res.status(200).json(view);
    } catch (error) {
      console.error("Erro ao carregar pesquisa pública:", error);
      return res.status(500).json({ error: "Não foi possível carregar a pesquisa." });
    }
  }

  if (req.method === "POST") {
    const ipLimit = checkRateLimit(`feedback:post:${ip}`, POST_LIMIT, WINDOW_MS);
    if (!ipLimit.allowed) {
      res.setHeader("Retry-After", String(ipLimit.retryAfterSeconds));
      return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    }

    const tokenLimit = checkRateLimit(`feedback:post-token:${token}`, 5, WINDOW_MS);
    if (!tokenLimit.allowed) {
      res.setHeader("Retry-After", String(tokenLimit.retryAfterSeconds));
      return res.status(429).json({ error: "Muitas tentativas para este link." });
    }

    try {
      const result = await submitFeedbackResponse(token, req.body ?? {}, {
        ip,
        userAgent: req.headers["user-agent"],
      });

      if (!result.ok) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(201).json({
        success: true,
        responseId: result.responseId,
        message: "Resposta registrada com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao registrar resposta da pesquisa:", error);
      return res.status(500).json({ error: "Não foi possível registrar a resposta." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}
