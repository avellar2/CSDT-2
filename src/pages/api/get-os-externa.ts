import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, token } = req.query;

    if (!numeroOs || !token) {
      return res.status(400).json({ error: 'Número da OS e token são obrigatórios' });
    }

    // Buscar a OS pelo número e token
    const osExterna = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs as string,
        assinado: token as string,
        status: "Pendente" // Só permite confirmar OS que ainda estão pendentes
      },
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        tecnicoResponsavel: true,
        emailResponsavel: true,
        data: true,
        hora: true,
        status: true,
        assinado: true,
        cpf: true,
        cargoResponsavel: true,
        // Informações adicionais
        solicitacaoDaVisita: true,
        relatorio: true,
        solucionado: true,
        pecasOuMaterial: true,
        temLaboratorio: true,
        // Fotos
        fotosAntes: true,
        fotosDepois: true,
        // Equipamentos Próprios
        pcsProprio: true,
        notebooksProprio: true,
        tabletsProprio: true,
        monitoresProprio: true,
        estabilizadoresProprio: true,
        // Equipamentos Locados
        pcsLocado: true,
        notebooksLocado: true,
        tabletsLocado: true,
        monitoresLocado: true,
        estabilizadoresLocado: true,
        // Equipamentos Outros Locais - Próprios
        pcsProprioOutrosLocais: true,
        notebooksProprioOutrosLocais: true,
        tabletsProprioOutrosLocais: true,
        monitoresProprioOutrosLocais: true,
        estabilizadoresProprioOutrosLocais: true,
        // Equipamentos Outros Locais - Locados
        pcsLocadoOutrosLocais: true,
        notebooksLocadoOutrosLocais: true,
        tabletsLocadoOutrosLocais: true,
        monitoresLocadoOutrosLocais: true,
        estabilizadoresLocadoOutrosLocais: true,
        // Impressoras
        oki: true,
        kyocera: true,
        hp: true,
        ricoh: true,
        outrasImpressoras: true,
        // Internet
        redeBr: true,
        educacaoConectada: true,
        naoHaProvedor: true,
        // Rede
        rack: true,
        switch: true,
        roteador: true,
        // Datas
        createdAt: true,
        updatedAt: true,
        lastEmailSent: true
      }
    });

    if (!osExterna) {
      return res.status(404).json({ error: 'OS não encontrada, token inválido ou OS já confirmada' });
    }

    res.status(200).json(osExterna);
  } catch (error) {
    console.error('Erro ao buscar OS Externa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}