import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  const { name, brand, serialNumber, schoolName, userId } = req.body;

  // Validação dos parâmetros
  if (!name || !brand || !serialNumber || !schoolName || !userId) {
    return res.status(400).json({ error: 'Parâmetros inválidos. Todos os campos são obrigatórios.' });
  }

  try {
    console.log('Cadastrando novo item:', { name, brand, serialNumber, schoolName, userId });

    // Verificar se a escola existe
    const school = await prisma.school.findFirst({
      where: { name: schoolName },
    });

    if (!school) {
      console.error('Escola não encontrada:', schoolName);
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    // Criar o item e registrar o histórico inicial
    const newItem = await prisma.item.create({
      data: {
        name,
        brand,
        serialNumber,
        School: {
          connect: { id: school.id },
        },
        ItemHistory: {
          create: {
            fromSchool: 'Nenhuma', // Ponto inicial
            toSchool: schoolName, // Escola onde o item foi cadastrado
          },
        },
        userId,
        Profile: {
          connect: { userId }
        } // Adicionando o campo obrigatório userId
      },
    });

    console.log('Item criado com sucesso:', newItem);

    res.status(201).json({ message: 'Item criado com sucesso', item: newItem });
  } catch (error) {
    console.error('Erro ao cadastrar item:', error);
    res.status(500).json({ error: 'Erro ao cadastrar item' });
  }
}