import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      schoolId,
      title,
      description,
      category,
      equipmentAffected,
      createdBy,
      attachments
    } = req.body;

    // Validações
    if (!schoolId || !title || !description || !createdBy) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: schoolId, title, description, createdBy' 
      });
    }

    // Criar o chamado técnico
    const ticket = await prisma.technicalTicket.create({
      data: {
        schoolId: parseInt(schoolId),
        title: title.trim(),
        description: description.trim(),
        category: category || 'OTHER',
        equipmentAffected: equipmentAffected?.trim() || null,
        createdBy,
        attachments: attachments || [],
        status: 'OPEN'
      },
      include: {
        School: true
      }
    });

    console.log(`Chamado técnico criado: ${ticket.id} - ${ticket.title}`);

    res.status(201).json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Erro ao criar chamado técnico:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}