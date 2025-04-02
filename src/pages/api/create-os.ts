import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const {
    unidadeEscolar,
    tecnicoResponsavel,
    numeroOs,
    data,
    hora,
    notebooksOutroLocal,
    tabletsOutroLocal,
    solicitacaoDaVisita,
    relatorio,
    pcsSieduca,
    notebooksSieduca,
    tabletsSieduca,
    estabilizadoresSieduca,
    naoHaSieduca,
    dellSecretaria,
    locadosSecretaria,
    outrosSecretaria,
    notebooksSecretaria,
    tabletsSecretaria,
    estabilizadoresSecretaria,
    dellOutroLocal,
    locadosOutroLocal,
    outrosOutroLocal,
    estabilizadoresOutroLocal,
    naoHaOutroLocal,
    redeBr,
    internetNasEscolas,
    educacaoConectada,
    naoHaProvedor,
    rack,
    switch: switchDevice,
    roteador,
    oki,
    kyocera,
    outrasImpressoras,
    solucionado,
    emailResponsavel,
    fotosAntes,
    fotosDepois,
    status
  } = req.body;

  try {
    const os = await prisma.os.create({
      data: {
        unidadeEscolar,
        tecnicoResponsavel,
        numeroOs,
        data,
        hora,
        notebooksOutroLocal,
        tabletsOutroLocal,
        solicitacaoDaVisita,
        relatorio,
        pcsSieduca,
        notebooksSieduca,
        tabletsSieduca,
        estabilizadoresSieduca,
        naoHaSieduca,
        dellSecretaria,
        locadosSecretaria,
        outrosSecretaria,
        notebooksSecretaria,
        tabletsSecretaria,
        estabilizadoresSecretaria,
        dellOutroLocal,
        locadosOutroLocal,
        outrosOutroLocal,
        estabilizadoresOutroLocal,
        naoHaOutroLocal,
        redeBr,
        internetNasEscolas,
        educacaoConectada,
        naoHaProvedor,
        rack,
        switch: switchDevice,
        roteador,
        oki,
        kyocera,
        outrasImpressoras,
        solucionado,
        emailResponsavel,
        fotosAntes,
        fotosDepois,
        status
      },
    });

    res.status(201).json(os);
  } catch (error) {
    console.error('Erro ao criar OS:', error);
    res.status(500).json({ error: 'Erro ao criar OS' });
  } finally {
    await prisma.$disconnect();
  }
}
