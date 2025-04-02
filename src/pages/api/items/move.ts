import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  const { itemId, toSchool } = req.body;

  // Validação dos parâmetros
  if (!itemId || !toSchool) {
    return res.status(400).json({ error: 'Parâmetros inválidos. É necessário fornecer itemId e toSchool.' });
  }

  try {
    console.log('Iniciando movimentação do item:', { itemId, toSchool });

    // Buscar o item atual e sua escola
    const currentItem = await prisma.item.findUnique({
      where: { id: itemId },
      include: { school: true }, // Inclui os dados da escola atual
    });

    if (!currentItem) {
      console.error('Item não encontrado:', itemId);
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const fromSchool = currentItem.school?.name || 'Desconhecida';

    // Verificar se a escola de destino existe
    const destinationSchool = await prisma.school.findFirst({
      where: { name: toSchool },
    });

    if (!destinationSchool) {
      console.error('Escola de destino não encontrada:', toSchool);
      return res.status(404).json({ error: 'Escola de destino não encontrada' });
    }

    // Atualizar a escola do item
    await prisma.item.update({
      where: { id: itemId },
      data: {
        school: {
          connect: { id: destinationSchool.id },
        },
      },
    });

    console.log(`Escola do item atualizada de "${fromSchool}" para "${toSchool}".`);

    // Registrar o histórico de movimentação
    const history = await prisma.itemHistory.create({
      data: {
        itemId,
        fromSchool,
        toSchool,
      },
    });

    console.log('Histórico registrado com sucesso:', history);

    res.status(200).json({ message: 'Movimentação registrada com sucesso', history });
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({ error: 'Erro ao registrar movimentação' });
  }
}