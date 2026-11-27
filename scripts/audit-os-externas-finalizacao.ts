/**
 * AUDITORIA SOMENTE LEITURA de OS externas incompletas.
 *
 * Uso:
 *   npx tsx scripts/audit-os-externas-finalizacao.ts [YYYY-MM-DD]
 *
 * Não executa nenhuma escrita: apenas findMany. Serve para confirmar
 * duplicidades, referências vazias de foto e etapas pendentes antes de
 * qualquer recuperação manual.
 */

import { PrismaClient } from "@prisma/client";
import {
  deriveOsExternaFinalization,
  normalizePhotoUrls,
} from "../src/utils/osExternaFinalization";

const prisma = new PrismaClient();

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  const since = process.argv[2] || "2026-11-24";
  const sinceDate = new Date(`${since}T00:00:00-03:00`);

  const osExternas = await prisma.oSExterna.findMany({
    where: { createdAt: { gte: sinceDate } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      numeroOs: true,
      unidadeEscolar: true,
      tecnicoResponsavel: true,
      data: true,
      hora: true,
      status: true,
      assinado: true,
      cpf: true,
      fotosAntes: true,
      fotosDepois: true,
      lastEmailSent: true,
      solucionado: true,
      motivoRecusa: true,
      recusadoEm: true,
      solicitacaoDaVisita: true,
      relatorio: true,
      routeId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const numeros = osExternas
    .map((os) => os.numeroOs)
    .filter((numero): numero is string => Boolean(numero));

  const chamados = numeros.length
    ? await prisma.chamados_escalas.findMany({
        where: { osOriginal: { in: numeros } },
        select: { osOriginal: true, id: true, status: true, dataCriacao: true },
      })
    : [];

  const chamadosPorOs = new Map(
    chamados
      .filter((chamado) => chamado.osOriginal)
      .map((chamado) => [chamado.osOriginal as string, chamado])
  );

  console.log(`\n=== OS externas criadas desde ${since} (somente leitura) ===\n`);

  const groups = new Map<string, typeof osExternas>();

  for (const os of osExternas) {
    const derived = deriveOsExternaFinalization(os, {
      hasChamadoReagendamento: os.numeroOs
        ? chamadosPorOs.has(os.numeroOs)
        : false,
    });

    const rawAntes = Array.isArray(os.fotosAntes) ? os.fotosAntes.length : 0;
    const rawDepois = Array.isArray(os.fotosDepois) ? os.fotosDepois.length : 0;
    const validAntes = normalizePhotoUrls(os.fotosAntes).length;
    const validDepois = normalizePhotoUrls(os.fotosDepois).length;
    const emptyRefs =
      rawAntes + rawDepois - (validAntes + validDepois);

    console.log(
      [
        `OS ${os.numeroOs || `(id ${os.id})`}`,
        `escola=${os.unidadeEscolar || "-"}`,
        `tecnicos=${os.tecnicoResponsavel || "-"}`,
        `data=${os.data}`,
        `criada=${os.createdAt.toISOString()}`,
        `status=${os.status}`,
        `etapa=${derived.stage}`,
        `fotos_validas=${derived.totalFotos} (antes=${validAntes}, depois=${validDepois})`,
        `refs_vazias=${emptyRefs}`,
        `token=${derived.hasToken ? "sim" : "nao"}`,
        `email=${os.lastEmailSent ? os.lastEmailSent.toISOString() : "nao"}`,
        `chamado=${derived.chamadoCriado ? "sim" : "nao"}`,
        `recusa=${os.motivoRecusa ? "sim" : "nao"}`,
      ].join(" | ")
    );

    if (derived.isPendingFinalization) {
      const plano =
        derived.stage === "fotos"
          ? "Recuperar as fotos originais (IndexedDB/aparelho do técnico). Se não existirem, reabrir a OS na tela de retomada e reenviar; NÃO criar outra OS. Token e e-mail ainda não existem."
          : derived.stage === "token"
          ? "Fotos já gravadas. Retomar e gerar SOMENTE o token de confirmação; não repetir upload."
          : derived.stage === "email"
          ? "Token já gravado. Retomar e enviar somente o e-mail com o token EXISTENTE (não gerar token novo nem refazer fotos)."
          : "OS já enviada. Criar somente o chamado de reagendamento idempotente (osOriginal).";
      console.log(`    PLANO: ${plano}`);

      if (os.numeroOs && derived.hasToken && !os.lastEmailSent) {
        console.log(
          `    ATENÇÃO: token presente e lastEmailSent nulo — verificar se o e-mail saiu (SMTP/Cloudinary logs) antes de reenviar; o link ${os.numeroOs} já é válido.`
        );
      }
    }

    const key = [
      normalize(os.unidadeEscolar),
      normalize(os.solicitacaoDaVisita),
      normalize(os.relatorio),
      normalize(os.solucionado),
    ].join("||");

    const group = groups.get(key) || [];
    group.push(os);
    groups.set(key, group);
  }

  console.log("\n=== Possíveis duplicidades (mesma escola + conteúdo) ===\n");
  let duplicates = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    duplicates += 1;
    console.log(
      `Grupo com ${group.length} OS: ${group
        .map((os) => `${os.numeroOs || os.id} (${os.data}, ${os.status})`)
        .join(" -> ")}`
    );
    console.log(
      "    Ação sugerida: manter a OS com mais etapas concluídas (fotos/token/e-mail) e recuperar as demais; não excluir sem autorização."
    );
  }
  if (duplicates === 0) console.log("Nenhuma duplicidade por conteúdo encontrada.");

  console.log(
    `\nResumo: ${osExternas.length} OS desde ${since}; ${osExternas.filter((os) => deriveOsExternaFinalization(os, { hasChamadoReagendamento: os.numeroOs ? chamadosPorOs.has(os.numeroOs) : false }).isPendingFinalization).length} com finalização pendente; ${duplicates} grupo(s) de duplicidade.`
  );
}

main()
  .catch((error) => {
    console.error("Falha na auditoria (somente leitura):", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
