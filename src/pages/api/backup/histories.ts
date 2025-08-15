import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Token de autorização requerido' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Buscar todos os históricos de movimentação
    const itemHistories = await prisma.itemHistory.findMany({
      include: {
        Item: {
          select: {
            id: true,
            name: true,
            brand: true,
            serialNumber: true
          }
        }
      },
      orderBy: {
        movedAt: 'desc'
      }
    });

    // Buscar memorandos (sem itens relacionados por enquanto)
    const memorandums = await prisma.memorandum.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Buscar registros CHADA (desabilitado por enquanto)
    const chadaRecords: any[] = [];

    const backupHistories = {
      itemHistories: itemHistories.map(history => ({
        id: history.id,
        itemId: history.itemId,
        itemName: history.Item?.name,
        itemSerial: history.Item?.serialNumber,
        fromSchool: history.fromSchool,
        toSchool: history.toSchool,
        movedAt: history.movedAt,
        generatedBy: history.generatedBy
      })),
      memorandums: memorandums.map(memo => ({
        id: memo.id,
        number: memo.number,
        type: memo.type,
        schoolName: memo.schoolName,
        district: memo.district,
        createdAt: memo.createdAt,
        generatedBy: memo.generatedBy
      })),
      chadaRecords: []
    };

    res.status(200).json(backupHistories);
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}