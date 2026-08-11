import { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "@/utils/prisma";
import { supabase } from "@/lib/supabaseClient";
import {
  loadDevolucaoTemplateBytes,
  fillDevolucaoPdf,
} from "@/utils/pdfMemorandoDevolucao";
import {
  validateDevolucaoRequestBody,
  validateItemsBelongToSchoolById,
  CSDT_SCHOOL_ID,
} from "@/utils/devolucao-validation";
import { buildMemorandumNumber } from "@/utils/memorandumNumber";

/**
 * API ISOLADA de DEVOLUCAO de equipamentos.
 *
 * Diferencias em relacao a API antiga (generate-memorandum.ts):
 *  - usa EXCLUSIVAMENTE o template memorando-devolucao-csdt-template.pdf;
 *  - lookup da escola de origem por ID (sourceSchoolId), NUNCA upsert por nome;
 *  - CSDT resolvido por ID canonico (CSDT_SCHOOL_ID = 225), nunca upsert;
 *  - sourceSchool.name/district do banco sao fonte de verdade;
 *  - transacao UNICA Serializable com retry (P2034/P2002);
 *  - PDF gerado DENTRO da transacao (falha no PDF -> rollback);
 *  - pageCount vem do PDF real;
 *  - updateMany com WHERE schoolId + count check (concorrencia);
 *  - NENHUM school.upsert por schoolName.
 *
 * Entrega e Troca continuam na API antiga, intactas.
 */

const MAX_RETRIES = 3;
const RETRYABLE_CODES = new Set(["P2034", "P2002"]);

const BUSINESS_ERROR =
  /nao pertencem|nao encontrad|nao foram encontrados|cancelada|Escola de origem|CSDT canonico|proprio CSDT/i;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Auth (mesmo padrao da API antiga) ---
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token is missing." });
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res
      .status(401)
      .json({ error: "Unauthorized: User not authenticated." });
  }
  const userProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  if (!userProfile) {
    return res.status(404).json({ error: "User profile not found." });
  }

  // --- Validacao do body (antes da tx) ---
  const validation = validateDevolucaoRequestBody(req.body);
  if (!validation.valid || !validation.itemIds) {
    return res.status(400).json({ error: validation.error });
  }
  const itemIds = validation.itemIds;
  const sourceSchoolId: number = req.body.sourceSchoolId;
  const district: string | undefined = req.body.district;

  // --- Carrega template ANTES da tx (valida existencia, sem movimentacao) ---
  let templateBytes: Buffer;
  try {
    templateBytes = loadDevolucaoTemplateBytes();
  } catch (e) {
    return res.status(500).json({
      error:
        e instanceof Error
          ? e.message
          : "Template de Devolucao indisponivel.",
    });
  }

  // --- Retry loop (Serializable + conflito de concorrencia/unicidade) ---
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // a. Escola de origem por ID (sem upsert por nome)
          const sourceSchool = await tx.school.findUnique({
            where: { id: sourceSchoolId },
          });
          if (!sourceSchool) {
            throw new Error(
              `Escola de origem nao encontrada (id=${sourceSchoolId}).`,
            );
          }

          // b. CSDT por ID canonico (sem upsert, sem findFirst por nome)
          const csdtSchool = await tx.school.findUnique({
            where: { id: CSDT_SCHOOL_ID },
          });
          if (!csdtSchool || csdtSchool.name !== "CSDT") {
            throw new Error(
              `Registro CSDT canonico (id=${CSDT_SCHOOL_ID}) ausente ou invalido. Contate o administrador.`,
            );
          }

          // c. Itens por ID + validacao de pertencimento (por schoolId)
          const items = await tx.item.findMany({
            where: { id: { in: itemIds } },
            include: { School: true },
          });
          if (items.length !== itemIds.length) {
            throw new Error(
              "Um ou mais equipamentos nao foram encontrados. A operacao foi cancelada.",
            );
          }
          const check = validateItemsBelongToSchoolById(items, sourceSchoolId);
          if (!check.valid) {
            throw new Error(
              "Um ou mais equipamentos nao pertencem a escola de origem (podem ter sido movimentados). A operacao foi cancelada.",
            );
          }

          // d. Numero do memorando (do ano corrente)
          const year = new Date().getFullYear();
          const last = await tx.newMemorandum.findFirst({
            where: {
              createdAt: {
                gte: new Date(`${year}-01-01T00:00:00.000Z`),
                lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
              },
            },
            orderBy: { id: "desc" },
          });
          const memorandumNumber = buildMemorandumNumber(
            last?.number ?? null,
            year,
          );

          // e. Gera PDF com numero definitivo DENTRO da tx.
          //    fillDevolucaoPdf carrega NOVA instancia do PDFDocument a cada
          //    chamada (e a cada retry). Falha aqui -> rollback.
          const { pdfBase64, pageCount } = await fillDevolucaoPdf(
            templateBytes,
            {
              memorandumNumber,
              senderName: sourceSchool.name,
              date: new Date(),
              items: items.map((i) => ({
                name: i.name ?? "",
                brand: i.brand ?? "",
                serialNumber: i.serialNumber ?? "",
              })),
            },
          );

          // f. Cria memorando com pageCount do PDF real
          const memorandum = await tx.newMemorandum.create({
            data: {
              generatedBy: userProfile.displayName,
              number: memorandumNumber,
              type: "devolucao",
              pageCount,
              updatedAt: new Date(),
              schoolName: sourceSchool.name,
              district: sourceSchool.district ?? district ?? "SEDE",
              fromSchoolName: sourceSchool.name,
              toSchoolName: "CSDT",
              items: {
                create: itemIds.map((id) => ({ Item: { connect: { id } } })),
              },
            },
          });

          // g. Historico de movimentacao (origem -> CSDT)
          await tx.itemHistory.createMany({
            data: itemIds.map((id) => ({
              itemId: id,
              fromSchool: sourceSchool.name,
              toSchool: "CSDT",
              generatedBy: userProfile.displayName,
            })),
          });

          // h. Atualiza localizacao com WHERE schoolId + count check
          const upd = await tx.item.updateMany({
            where: { id: { in: itemIds }, schoolId: sourceSchoolId },
            data: { schoolId: csdtSchool.id, updatedAt: new Date() },
          });
          if (upd.count !== itemIds.length) {
            throw new Error(
              "Concorrencia: nem todos os equipamentos ainda estao na escola de origem. A operacao foi cancelada (rollback).",
            );
          }

          // i. Retorna TODOS os dados (variaveis internas nao escapam)
          return {
            pdfBase64,
            memorandumNumber,
            memorandumCreatedAt: memorandum.createdAt,
            pageCount,
            fromSchool: sourceSchool.name,
            toSchool: csdtSchool.name,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 20000,
        },
      );

      // Sucesso: resposta montada exclusivamente com o retorno da tx
      return res.status(200).json({
        pdfBase64: result.pdfBase64,
        type: "devolucao",
        memorandumNumber: result.memorandumNumber,
        memorandumCreatedAt: result.memorandumCreatedAt.toISOString(),
        fromSchool: result.fromSchool,
        toSchool: result.toSchool,
      });
    } catch (e: unknown) {
      lastError = e;
      const code =
        e && typeof e === "object" && "code" in e
          ? (e as { code?: string }).code
          : undefined;
      if (code && RETRYABLE_CODES.has(code) && attempt < MAX_RETRIES) {
        // Retry: nova PDFDocument sera carregada dentro do proximo callback
        continue;
      }
      const msg =
        e instanceof Error
          ? e.message
          : "Erro ao gerar memorando de devolucao.";
      const isBusiness = BUSINESS_ERROR.test(msg);
      return res.status(isBusiness ? 400 : 500).json({ error: msg });
    }
  }

  // Retries esgotados
  const msg =
    lastError instanceof Error
      ? lastError.message
      : "Erro ao gerar memorando de devolucao.";
  return res.status(500).json({ error: msg });
}