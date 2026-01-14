import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      requestId,
      token,
      nomeResponsavel,
      cpfMatricula,
      cargoResponsavel,
      printers
    } = req.body;

    // Validação dos campos obrigatórios
    if (!requestId || !token) {
      return res.status(400).json({ error: 'ID da solicitação e token são obrigatórios' });
    }

    if (!nomeResponsavel || !cpfMatricula || !cargoResponsavel) {
      return res.status(400).json({ error: 'Dados do responsável são obrigatórios' });
    }

    if (!printers || !Array.isArray(printers) || printers.length === 0) {
      return res.status(400).json({ error: 'Pelo menos uma impressora deve ser informada' });
    }

    // Verificar se todas as impressoras têm marca e serial
    for (const printer of printers) {
      if (!printer.marca || !printer.serial) {
        return res.status(400).json({ error: 'Marca e número de série são obrigatórios para todas as impressoras' });
      }
    }

    // Buscar a solicitação
    const printerRequest = await prisma.printerRequest.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!printerRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // Verificar o token
    if (printerRequest.token !== token) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Verificar se já foi preenchido
    if (printerRequest.status === 'Concluído') {
      return res.status(400).json({ error: 'Esta solicitação já foi preenchida anteriormente' });
    }

    // Atualizar a solicitação e adicionar as impressoras
    await prisma.$transaction(async (tx) => {
      // Atualizar os dados do responsável e status
      await tx.printerRequest.update({
        where: { id: parseInt(requestId) },
        data: {
          nomeResponsavel,
          cpfMatricula,
          cargoResponsavel,
          status: 'Concluído',
          completedAt: new Date(),
        },
      });

      // Criar os registros de impressoras
      for (const printer of printers) {
        await tx.printerInfo.create({
          data: {
            printerRequestId: parseInt(requestId),
            marca: printer.marca,
            serial: printer.serial,
          },
        });
      }
    });

    res.status(200).json({
      success: true,
      message: 'Informações enviadas com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao salvar informações de impressoras:', error);
    res.status(500).json({ error: 'Erro ao salvar informações' });
  } finally {
    await prisma.$disconnect();
  }
}
