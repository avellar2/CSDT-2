import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabaseClient';

const prisma = new PrismaClient();

interface CreateItemRequest {
  name: string;
  brand: string;
  serialNumber: string;
  schoolId: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização obrigatório' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { role: true, displayName: true }
    });

    if (!profile) {
      return res.status(403).json({ error: 'Perfil de usuário não encontrado' });
    }

    // Check permissions (only ADMIN, ADMTOTAL, TECH can create items)
    if (!['ADMIN', 'ADMTOTAL', 'TECH'].includes(profile.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente para cadastrar itens' });
    }

    // Validate request body
    const { name, brand, serialNumber, schoolId }: CreateItemRequest = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome do item é obrigatório' });
    }

    if (!brand?.trim()) {
      return res.status(400).json({ error: 'Marca é obrigatória' });
    }

    if (!serialNumber?.trim()) {
      return res.status(400).json({ error: 'Número de série é obrigatório' });
    }

    if (!schoolId) {
      return res.status(400).json({ error: 'Escola é obrigatória' });
    }

    // Validate serial number length
    if (serialNumber.trim().length < 3) {
      return res.status(400).json({ error: 'Número de série deve ter pelo menos 3 caracteres' });
    }

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true }
    });

    if (!school) {
      return res.status(400).json({ error: 'Escola não encontrada' });
    }

    // Check for duplicate serial number
    const existingItem = await prisma.item.findFirst({
      where: { 
        serialNumber: serialNumber.toUpperCase().trim()
      },
      select: { 
        id: true, 
        name: true, 
        School: { select: { name: true } } 
      }
    });

    if (existingItem) {
      return res.status(409).json({ 
        error: `Item com série "${serialNumber}" já existe: ${existingItem.name} na ${existingItem.School?.name}` 
      });
    }

    // Create the item
    const item = await prisma.item.create({
      data: {
        name: name.toUpperCase().trim(),
        brand: brand.toUpperCase().trim(),
        serialNumber: serialNumber.toUpperCase().trim(),
        userId: user.id,
        schoolId: schoolId,
        status: 'DISPONIVEL'
      },
      include: {
        School: {
          select: { id: true, name: true }
        },
        Profile: {
          select: { displayName: true }
        }
      }
    });

    // Create history entry
    await prisma.itemHistory.create({
      data: {
        itemId: item.id,
        fromSchool: 'NOVO',
        toSchool: school.name,
        generatedBy: profile.displayName
      }
    });

    res.status(201).json({
      success: true,
      message: 'Item cadastrado com sucesso',
      item: {
        id: item.id,
        name: item.name,
        brand: item.brand,
        serialNumber: item.serialNumber,
        status: item.status,
        school: item.School,
        createdBy: item.Profile.displayName,
        createdAt: item.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao criar item:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return res.status(409).json({ 
          error: 'Número de série já existe no sistema' 
        });
      }
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor. Tente novamente.' 
    });
  } finally {
    await prisma.$disconnect();
  }
}