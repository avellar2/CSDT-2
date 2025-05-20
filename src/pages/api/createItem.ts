import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabaseClient';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { name, brand, serialNumber, schoolName } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const uid = user.id;

  console.log('Dados recebidos:', { name, brand, serialNumber, schoolName, uid }); // Log para depuração

  if (!name || !brand || !serialNumber || !schoolName || !uid) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // Validar o campo schoolName como ID
    const schoolId = parseInt(schoolName);
    if (isNaN(schoolId)) {
      return res.status(400).json({ error: 'schoolName deve ser um número válido' });
    }

    // Verifique se a escola existe
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    // Verifique se o usuário existe na tabela Profile
    const profile = await prisma.profile.findUnique({
      where: { userId: uid },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    // Verifique se o serialNumber já existe
    const existingItem = await prisma.item.findUnique({
      where: { serialNumber },
    });

    if (existingItem) {
      return res.status(409).json({ error: 'Número de série já existe' });
    }

    // Log para depuração
    console.log('Criando item com os seguintes dados:', {
      name,
      brand,
      serialNumber,
      schoolId: school.id,
      userId: uid,
    });

    try {
      // Verifique o maior valor de ID no banco de dados
      const maxId = await prisma.item.findMany({
        orderBy: { id: 'desc' },
        take: 1,
      });
      console.log('Maior ID existente:', maxId[0]?.id);

      // Crie o item
      const newItem = await prisma.item.create({
        data: {
          name,
          brand,
          serialNumber,
          School: {
            connect: { id: school.id },
          },
          Profile: {
            connect: { userId: uid },
          },
        },
      });

      res.status(201).json(newItem);
    } catch (error) {
      console.error('Erro ao criar item:', error);
      res.status(500).json({ error: 'Erro ao criar item' });
    }
  } catch (error) {
    console.error('Erro ao criar item:', error);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
}
