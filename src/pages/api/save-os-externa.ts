import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { assessDailyDemandOsAvailability } from "@/utils/dailyDemandOsRules";
import { getSchoolPendingDailyDemandAvailability } from "@/utils/schoolPendingDailyDemandAvailability";

const prisma = new PrismaClient();

function preservePartnerSuffix(currentValue: string | null | undefined, primaryTechnician: string) {
  if (!currentValue || !currentValue.includes(" / ")) {
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
  if (req.method !== "POST") {
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

    if (context?.origin === "daily-demands") {
      if (!context.userId || !context.dailyDemandDate) {
        return res.status(400).json({ error: "Contexto da demanda diaria invalido." });
      }

      const availability = await assessDailyDemandOsAvailability({
        userId: context.userId,
        demandDate: context.dailyDemandDate,
      });

      if (!availability.allowed) {
        return res.status(403).json({
          error: availability.reason || "Esta OS nao pode mais ser lancada.",
          availability,
        });
      }

      if (availability.profile?.displayName) {
        tecnicoResponsavel = preservePartnerSuffix(typeof tecnicoResponsavel === "string" ? tecnicoResponsavel : null, availability.profile.displayName);
      }
    } else if (context?.userId && unidadeEscolar) {
      const schoolAvailability = await getSchoolPendingDailyDemandAvailability({
        userId: context.userId,
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

      if (schoolAvailability.availability?.profile?.displayName) {
        tecnicoResponsavel = preservePartnerSuffix(typeof tecnicoResponsavel === "string" ? tecnicoResponsavel : null, schoolAvailability.availability.profile.displayName);
      }
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
        rack: parseInt(rack, 10),
        switch: parseInt(switchValue, 10),
        roteador: parseInt(roteador, 10),
        oki: parseInt(oki, 10),
        kyocera: parseInt(kyocera, 10),
        hp: parseInt(hp, 10),
        ricoh: parseInt(ricoh, 10),
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
