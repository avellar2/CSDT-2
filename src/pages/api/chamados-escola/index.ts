import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Buscar todos os chamados com informações da escola
      const chamados = await prisma.chamadoEscola.findMany({
        include: {
          School: {
            select: {
              id: true,
              name: true,
              district: true,
              phone: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        success: true,
        data: chamados
      });
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  else if (req.method === 'POST') {
    try {
      // Verificar autenticação
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Token de autenticação necessário'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({
          success: false,
          error: 'Token inválido'
        });
      }

      const {
        schoolId,
        schoolName,
        title,
        description,
        category = 'OTHER',
        priority = 'MEDIUM',
        phone,
        contact,
        notes
      } = req.body;

      // Validações básicas
      if (!schoolId || !schoolName || !title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: schoolId, schoolName, title, description'
        });
      }

      // Criar o chamado
      const chamado = await prisma.chamadoEscola.create({
        data: {
          schoolId: parseInt(schoolId),
          schoolName,
          title,
          description,
          category,
          priority,
          phone,
          contact,
          notes,
          createdBy: user.id
        },
        include: {
          School: {
            select: {
              id: true,
              name: true,
              district: true,
              phone: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: chamado,
        message: 'Chamado criado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}