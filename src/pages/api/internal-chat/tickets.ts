import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return await handleGet(req, res);
    } else if (req.method === 'POST') {
      return await handlePost(req, res);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Erro na API de tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    await prisma.$disconnect();
  }
}

// GET: Listar tickets
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { schoolId, status, assignedTo } = req.query;

  const whereClause: any = {};

  if (schoolId) {
    whereClause.schoolId = parseInt(schoolId as string);
  }

  if (status) {
    whereClause.status = status;
  }

  if (assignedTo) {
    whereClause.assignedTo = assignedTo;
  }

  const tickets = await prisma.internalTicket.findMany({
    where: whereClause,
    include: {
      School: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1 // Última mensagem para preview
      },
      _count: {
        select: {
          messages: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.status(200).json({
    success: true,
    tickets
  });
}

// POST: Criar novo ticket
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const {
    schoolId,
    title,
    description,
    category = 'OTHER'
  } = req.body;

  // Validações
  if (!schoolId || !title) {
    return res.status(400).json({
      success: false,
      message: 'SchoolId e title são obrigatórios'
    });
  }

  // Verificar se a escola existe
  const school = await prisma.school.findUnique({
    where: { id: parseInt(schoolId) }
  });

  if (!school) {
    return res.status(404).json({
      success: false,
      message: 'Escola/Setor não encontrado'
    });
  }

  const ticket = await prisma.internalTicket.create({
    data: {
      schoolId: parseInt(schoolId),
      title,
      description,
      category,
      priority: 'NORMAL' // Prioridade padrão, será definida pelo TI
    },
    include: {
      School: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    ticket
  });
}