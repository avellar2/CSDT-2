import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { assessDailyDemandOsAvailability, formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import { getSchoolPendingDailyDemandAvailability } from "@/utils/schoolPendingDailyDemandAvailability";
import { requireAuth } from "@/utils/api-auth";
import {
  getTechnicianRouteIdsByDate,
  isRouteManager,
  isValidDateKey,
} from "@/utils/operationalRoutes";
import { resolveRouteIdForResponsible } from "@/utils/operationalOsScope";
import { validateDemandOsLink } from "@/utils/osDemandIntegrity";

const prisma = new PrismaClient();

function preservePartnerSuffix(currentValue: string | null | undefined, primaryTechnician: string) {
  if (!currentValue || currentValue.trim() === '') {
    return primaryTechnician;
  }

  if (!currentValue.includes(" / ")) {
    return primaryTechnician;
  }

  const parts = currentValue
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return primaryTechnician;
  }

  return `${primaryTechnician} / ${parts.slice(1).join(" / ")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  try {
    const { formData, context } = req.body;

    let {
      unidadeEscolar,
      tecnicoResponsavel,
      data,
      hora,
      solicitacaoDaVisita,
      relatorio,
      pecasOuMaterial,
      temLaboratorio,
      diretoraNaEscola,
      redeBr,
      educacaoConectada,
      naoHaProvedor,
      rack,
      switch: switchValue,
      roteador,
      oki,
      kyocera,
      hp,
      ricoh,
      epson,
      outrasImpressoras,
      temImpressoraComProblema,
      relatorioImpressora,
      impressoraComProblema,
      solucionado,
      emailResponsavel,
      fotosAntes,
      fotosDepois,
      pcsProprio,
      pcsLocado,
      notebooksProprio,
      notebooksLocado,
      monitoresProprio,
      monitoresLocado,
      estabilizadoresProprio,
      estabilizadoresLocado,
      tabletsProprio,
      tabletsLocado,
      pcsProprioOutrosLocais,
      pcsLocadoOutrosLocais,
      notebooksProprioOutrosLocais,
      notebooksLocadoOutrosLocais,
      monitoresProprioOutrosLocais,
      monitoresLocadoOutrosLocais,
      estabilizadoresProprioOutrosLocais,
      estabilizadoresLocadoOutrosLocais,
      tabletsProprioOutrosLocais,
      tabletsLocadoOutrosLocais,
    } = formData;

    // Se o formulario ja enviou tecnico + parceiro (ex: "Yuri / Alexandre"),
    // confia no valor do form e nao aplica preservePartnerSuffix
    const formAlreadyHasPartner = typeof tecnicoResponsavel === "string" && tecnicoResponsavel.includes(" / ");

    // Data operacional da OS: só aceita YYYY-MM-DD; qualquer outro valor cai
    // para a data atual em America/Sao_Paulo.
    const osDateKey =
      typeof data === "string" && isValidDateKey(data)
        ? data
        : formatBrazilDateKey(new Date());

    const dailyDemandId =
      context?.origin === "daily-demands" &&
      context?.dailyDemandId &&
      Number.isInteger(Number(context.dailyDemandId))
        ? Number(context.dailyDemandId)
        : null;

    let routeId: number | null = null;
    let demandRouteId: number | null = null;
    let demandDateKey: string | null = null;

    if (context?.origin === "daily-demands") {
      if (!isValidDateKey(context.dailyDemandDate)) {
        return res.status(400).json({ error: "Data da demanda diaria invalida." });
      }

      // Integridade demanda -> OS -> rota: a demanda é recarregada do banco e
      // precisa pertencer à data informada, à data da OS e à rota do técnico.
      if (dailyDemandId) {
        const link = await validateDemandOsLink({
          profile: auth.profile,
          demandId: dailyDemandId,
          demandDate: context.dailyDemandDate,
          osDateKey,
        });

        if (!link.ok) {
          return res.status(link.status).json({ error: link.error });
        }

        demandRouteId = link.demand.routeId;
        demandDateKey = link.demand.dateKey;
      } else if (context.dailyDemandDate !== osDateKey) {
        return res.status(400).json({
          error: `A OS deve usar a data operacional da demanda (${context.dailyDemandDate}).`,
        });
      }

      // Identidade autenticada; ignora context.userId enviado pelo cliente.
      const availability = await assessDailyDemandOsAvailability({
        userId: auth.id,
        demandDate: context.dailyDemandDate,
        demandId: dailyDemandId,
      });

      if (!availability.allowed) {
        return res.status(403).json({
          error: availability.reason || "Esta OS nao pode mais ser lancada.",
          availability,
        });
      }

      if (!formAlreadyHasPartner && availability.profile?.displayName) {
        tecnicoResponsavel = preservePartnerSuffix(typeof tecnicoResponsavel === "string" ? tecnicoResponsavel : null, availability.profile.displayName);
      }
    } else if (unidadeEscolar) {
      const schoolAvailability = await getSchoolPendingDailyDemandAvailability({
        userId: auth.id,
        schoolName: String(unidadeEscolar),
      });

      if (
        schoolAvailability.applies &&
        schoolAvailability.availability &&
        !schoolAvailability.availability.allowed
      ) {
        return res.status(403).json({
          error: schoolAvailability.availability.reason || "Esta OS nao pode mais ser lancada.",
          availability: schoolAvailability.availability,
          pendingDailyDemand: {
            demandId: schoolAvailability.demandId,
            demandDate: schoolAvailability.demandDate,
            schoolName: schoolAvailability.schoolName,
          },
        });
      }

      if (!formAlreadyHasPartner && schoolAvailability.availability?.profile?.displayName) {
        tecnicoResponsavel = preservePartnerSuffix(typeof tecnicoResponsavel === "string" ? tecnicoResponsavel : null, schoolAvailability.availability.profile.displayName);
      }
    }

    // Associação explícita da OS com a rota operacional responsável:
    // 1. OS lançada a partir de uma demanda diária herda a rota validada dela;
    // 2. técnico que participa de exatamente uma rota na data usa essa rota;
    // 3. gestor: resolve a rota pelo técnico responsável informado.
    // Sem correspondência (dia sem rotas ou responsável sem rota), fica nula
    // e a OS continua visível aos gestores, que podem atribuí-la depois.
    if (demandDateKey) {
      routeId = demandRouteId;
    } else if (auth.profile.role === "TECH") {
      const routeIds = await getTechnicianRouteIdsByDate(auth.profile.id, osDateKey);
      routeId = routeIds.length === 1 ? routeIds[0] : null;
    } else if (isRouteManager(auth.profile.role)) {
      routeId = await resolveRouteIdForResponsible(
        typeof tecnicoResponsavel === "string" ? tecnicoResponsavel : null,
        osDateKey
      );
    }

    const fotosAntesUrls = Array.isArray(fotosAntes)
      ? fotosAntes.map((file) => (typeof file === "string" ? file : file.url || ""))
      : [];
    const fotosDepoisUrls = Array.isArray(fotosDepois)
      ? fotosDepois.map((file) => (typeof file === "string" ? file : file.url || ""))
      : [];

    const osExterna = await prisma.oSExterna.create({
      data: {
        unidadeEscolar,
        tecnicoResponsavel,
        routeId,
        data: osDateKey,
        hora,
        solicitacaoDaVisita,
        relatorio,
        pecasOuMaterial,
        temLaboratorio,
        diretoraNaEscola,
        redeBr,
        educacaoConectada,
        naoHaProvedor,
        rack: parseInt(rack, 10),
        switch: parseInt(switchValue, 10),
        roteador: parseInt(roteador, 10),
        oki: parseInt(oki, 10),
        kyocera: parseInt(kyocera, 10),
        hp: parseInt(hp, 10),
        ricoh: parseInt(ricoh, 10),
        epson: parseInt(epson, 10),
        outrasImpressoras: parseInt(outrasImpressoras, 10),
        temImpressoraComProblema,
        relatorioImpressora,
        impressoraComProblema,
        solucionado,
        emailResponsavel,
        fotosAntes: fotosAntesUrls,
        fotosDepois: fotosDepoisUrls,
        pcsProprio: parseInt(pcsProprio, 10),
        pcsLocado: parseInt(pcsLocado, 10),
        notebooksProprio: parseInt(notebooksProprio, 10),
        notebooksLocado: parseInt(notebooksLocado, 10),
        monitoresProprio: parseInt(monitoresProprio, 10),
        monitoresLocado: parseInt(monitoresLocado, 10),
        estabilizadoresProprio: parseInt(estabilizadoresProprio, 10),
        estabilizadoresLocado: parseInt(estabilizadoresLocado, 10),
        tabletsProprio: parseInt(tabletsProprio, 10),
        tabletsLocado: parseInt(tabletsLocado, 10),
        pcsProprioOutrosLocais: parseInt(pcsProprioOutrosLocais, 10),
        pcsLocadoOutrosLocais: parseInt(pcsLocadoOutrosLocais, 10),
        notebooksProprioOutrosLocais: parseInt(notebooksProprioOutrosLocais, 10),
        notebooksLocadoOutrosLocais: parseInt(notebooksLocadoOutrosLocais, 10),
        monitoresProprioOutrosLocais: parseInt(monitoresProprioOutrosLocais, 10),
        monitoresLocadoOutrosLocais: parseInt(monitoresLocadoOutrosLocais, 10),
        estabilizadoresProprioOutrosLocais: parseInt(estabilizadoresProprioOutrosLocais, 10),
        estabilizadoresLocadoOutrosLocais: parseInt(estabilizadoresLocadoOutrosLocais, 10),
        tabletsProprioOutrosLocais: parseInt(tabletsProprioOutrosLocais, 10),
        tabletsLocadoOutrosLocais: parseInt(tabletsLocadoOutrosLocais, 10),
        updatedAt: new Date(),
      },
    });

    const currentYear = new Date().getFullYear();
    const numeroOs = `${osExterna.id}/${currentYear}`;

    const updatedRecord = await prisma.oSExterna.update({
      where: { id: osExterna.id },
      data: { numeroOs },
    });

    if (context?.origin === "daily-demands" && context?.dailyDemandId) {
      await prisma.schoolDemand.update({
        where: { id: Number(context.dailyDemandId) },
        data: {
          visitStatus: null,
          visitReason: null,
          visitUpdatedBy: tecnicoResponsavel || null,
          visitUpdatedAt: new Date(),
        },
      });
    }

    return res.status(200).json({ id: updatedRecord.id, numeroOs: updatedRecord.numeroOs });
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return res.status(500).json({ error: "Erro ao salvar os dados" });
  } finally {
    await prisma.$disconnect();
  }
}
