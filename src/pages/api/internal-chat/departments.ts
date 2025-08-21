import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

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
    console.error('Erro na API de departments:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    await prisma.$disconnect();
  }
}

// GET: Listar escolas (usadas como departamentos)
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const departments = await prisma.school.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  // Map schools to department format
  const mappedDepartments = departments.map(school => ({
    id: school.id,
    code: school.name.toUpperCase().replace(/\s+/g, '_'),
    name: school.name,
    email: `${school.name.toLowerCase().replace(/\s+/g, '.')}@escola.gov.br`,
    contact: null,
    responsible: null,
    createdAt: new Date()
  }));

  res.status(200).json({
    success: true,
    departments: mappedDepartments
  });
}

// POST: Criar nova escola (departamento)
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.body;

  // Validações
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Nome é obrigatório'
    });
  }

  // Verificar se já existe escola com mesmo nome
  const existingSchool = await prisma.school.findFirst({
    where: { name }
  });

  if (existingSchool) {
    return res.status(400).json({
      success: false,
      message: 'Já existe uma escola com este nome'
    });
  }

  const school = await prisma.school.create({
    data: {
      name: name.trim()
    }
  });

  // Map to department format
  const department = {
    id: school.id,
    code: school.name.toUpperCase().replace(/\s+/g, '_'),
    name: school.name,
    email: `${school.name.toLowerCase().replace(/\s+/g, '.')}@escola.gov.br`,
    contact: null,
    responsible: null,
    createdAt: new Date()
  };

  res.status(201).json({
    success: true,
    department
  });
}