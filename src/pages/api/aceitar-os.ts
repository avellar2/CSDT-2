import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { osId } = req.query;

  console.log("Recebido osId:", osId);

  if (req.method === "POST") {
    const { nameAssigned, cpfOrRegistration } = req.body;

    try {
      const os = await prisma.os.findUnique({
        where: { id: Number(osId) }
      });

      if (!os) {
        console.log("OS não encontrada para osId:", osId);
        return res.status(404).send("OS não encontrada");
      }

      await prisma.osAssinada.create({
        data: {
          unidadeEscolar: os.unidadeEscolar,
          tecnicoResponsavel: os.tecnicoResponsavel,
          numeroOs: os.numeroOs,
          data: os.data,
          hora: os.hora,
          notebooksOutroLocal: os.notebooksOutroLocal,
          tabletsOutroLocal: os.tabletsOutroLocal,
          solicitacaoDaVisita: os.solicitacaoDaVisita,
          relatorio: os.relatorio,
          pcsSieduca: os.pcsSieduca,
          notebooksSieduca: os.notebooksSieduca,
          tabletsSieduca: os.tabletsSieduca,
          estabilizadoresSieduca: os.estabilizadoresSieduca,
          naoHaSieduca: os.naoHaSieduca,
          dellSecretaria: os.dellSecretaria,
          locadosSecretaria: os.locadosSecretaria,
          outrosSecretaria: os.outrosSecretaria,
          notebooksSecretaria: os.notebooksSecretaria,
          tabletsSecretaria: os.tabletsSecretaria,
          estabilizadoresSecretaria: os.estabilizadoresSecretaria,
          dellOutroLocal: os.dellOutroLocal,
          locadosOutroLocal: os.locadosOutroLocal,
          outrosOutroLocal: os.outrosOutroLocal,
          estabilizadoresOutroLocal: os.estabilizadoresOutroLocal,
          naoHaOutroLocal: os.naoHaOutroLocal,
          redeBr: os.redeBr,
          internetNasEscolas: os.internetNasEscolas,
          educacaoConectada: os.educacaoConectada,
          naoHaProvedor: os.naoHaProvedor,
          rack: os.rack,
          switch: os.switch,
          roteador: os.roteador,
          oki: os.oki,
          kyocera: os.kyocera,
          outrasImpressoras: os.outrasImpressoras,
          solucionado: os.solucionado,
          emailResponsavel: os.emailResponsavel,
          status: "Confirmada",
          nameAssigned,
          cpfOrRegistration,
          fotosAntes: os.fotosAntes,
          fotosDepois: os.fotosDepois
        }
      });

      // Remover a OS da lista de pendentes
      await prisma.os.delete({
        where: { id: Number(osId) }
      });

      res.status(200).send("OS confirmada com sucesso!");
    } catch (error) {
      console.error("Erro ao confirmar OS:", error);
      res.status(500).send("Erro ao confirmar OS");
    }
  } else {
    res.status(405).send("Método não permitido");
  }
};