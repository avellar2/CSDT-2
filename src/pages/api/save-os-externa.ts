import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { formData } = req.body;

    console.log("Dados recebidos:", req.body.formData);

    // Filtrar apenas os campos que existem no modelo OSExterna
    const {
      unidadeEscolar,
      tecnicoResponsavel,
      data,
      hora,
      solicitacaoDaVisita,
      relatorio,
      pecasOuMaterial,
      temLaboratorio,
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

    // Certifique-se de que fotosAntes e fotosDepois sejam arrays de strings
    const fotosAntesUrls = Array.isArray(fotosAntes)
      ? fotosAntes.map((file) => (typeof file === "string" ? file : file.url || ""))
      : [];
    const fotosDepoisUrls = Array.isArray(fotosDepois)
      ? fotosDepois.map((file) => (typeof file === "string" ? file : file.url || ""))
      : [];

    // Salvar os dados na tabela OSExterna
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
        solucionado,
        emailResponsavel,
        fotosAntes: fotosAntesUrls, // Enviar como array de strings
        fotosDepois: fotosDepoisUrls, // Enviar como array de strings
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
      },
    });

    const currentYear = new Date().getFullYear();
    const numeroOs = `${osExterna.id}/${currentYear}`;

    // Atualizar o registro com o número da OS
    const updatedRecord = await prisma.oSExterna.update({
      where: { id: osExterna.id },
      data: { numeroOs },
    });

    // Retornar o ID e o número da OS
    return res.status(200).json({ id: updatedRecord.id, numeroOs: updatedRecord.numeroOs });
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return res.status(500).json({ error: "Erro ao salvar os dados" });
  } finally {
    await prisma.$disconnect();
  }
}