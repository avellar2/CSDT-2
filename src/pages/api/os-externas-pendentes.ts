import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import {
  buildOperationalOsWhere,
  loadOsScope,
} from "@/utils/operationalOsScope";
import { deriveOsExternaFinalization } from "@/utils/osExternaFinalization";
import {
  loadOsExternaFinalizationStates,
  loadOsWithReagendamentoChamado,
} from "@/utils/osExternaFinalizationState";

/**
 * Lista, a partir do BANCO, as OS externas com finalização técnica pendente
 * visíveis para o usuário autenticado. Não depende de localStorage, por isso
 * permite retomar em outro aparelho.
 *
 * O status técnico é independente da assinatura da escola: OS aguardando
 * assinatura NÃO aparecem aqui (não há ação pendente do técnico).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const scope = await loadOsScope(auth);
    const operationalWhere = buildOperationalOsWhere(scope);

    const osExternas = await prisma.oSExterna.findMany({
      where: {
        AND: [{ status: "Pendente" }, operationalWhere],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        tecnicoResponsavel: true,
        data: true,
        hora: true,
        status: true,
        routeId: true,
        assinado: true,
        fotosAntes: true,
        fotosDepois: true,
        lastEmailSent: true,
        solucionado: true,
        motivoRecusa: true,
        recusadoEm: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const osIds = osExternas.map((os) => os.id);
    const numerosOs = osExternas
      .map((os) => os.numeroOs)
      .filter((numero): numero is string => Boolean(numero));

    const [storedStages, chamados] = await Promise.all([
      loadOsExternaFinalizationStates(osIds),
      loadOsWithReagendamentoChamado(numerosOs),
    ]);

    const data = osExternas
      .map((os) => {
        const finalization = deriveOsExternaFinalization(os, {
          storedStage: storedStages.get(os.id) || null,
          hasChamadoReagendamento: os.numeroOs
            ? chamados.has(os.numeroOs)
            : false,
        });

        return { ...os, finalization };
      })
      .filter((os) => os.finalization.isPendingFinalization);

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Erro ao listar finalizações pendentes:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
