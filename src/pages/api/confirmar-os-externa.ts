import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, token, nomeResponsavel, cpfMatricula, cargoResponsavel } = req.body;

    // Validações
    if (!numeroOs || !token || !nomeResponsavel || !cpfMatricula || !cargoResponsavel) {
      return res.status(400).json({
        error: 'Todos os campos são obrigatórios'
      });
    }

    // Buscar a OS pelo número e token
    const osExterna = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs,
        assinado: token,
        status: "Pendente" // Só permite confirmar OS pendentes
      }
    });

    if (!osExterna) {
      return res.status(404).json({
        error: 'OS não encontrada, token inválido ou OS já confirmada'
      });
    }

    // Atualizar a OS com os dados de confirmação
    const updatedOs = await prisma.oSExterna.update({
      where: {
        id: osExterna.id
      },
      data: {
        status: "Assinado",
        assinado: nomeResponsavel, // Substitui o token pelo nome do responsável
        cpf: cpfMatricula,
        cargoResponsavel: cargoResponsavel,
        updatedAt: new Date()
      },
    });

    console.log(`OS Externa ${numeroOs} confirmada por ${nomeResponsavel}`);

    res.status(200).json({
      success: true,
      message: 'OS confirmada com sucesso',
      osId: updatedOs.id,
      numeroOs: updatedOs.numeroOs
    });
  } catch (error) {
    console.error('Erro ao confirmar OS Externa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}