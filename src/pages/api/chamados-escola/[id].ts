import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'ID do chamado é obrigatório'
    });
  }

  if (req.method === 'GET') {
    try {
      const chamado = await prisma.chamados_escola.findUnique({
        where: { id },
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

      if (!chamado) {
        return res.status(404).json({
          success: false,
          error: 'Chamado não encontrado'
        });
      }

      res.status(200).json({
        success: true,
        data: chamado
      });
    } catch (error) {
      console.error('Erro ao buscar chamado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  else if (req.method === 'PUT') {
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

      const updateData: any = {};
      const allowedFields = ['title', 'description', 'category', 'priority', 'status', 'assignedTo', 'notes', 'phone', 'contact'];

      // Filtrar campos permitidos
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Se está marcando como resolvido, adicionar data de resolução
      if (req.body.status === 'RESOLVED' && !updateData.resolvedAt) {
        updateData.resolvedAt = new Date();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum campo válido para atualizar'
        });
      }

      const chamado = await prisma.chamados_escola.update({
        where: { id },
        data: updateData,
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

      res.status(200).json({
        success: true,
        data: chamado,
        message: 'Chamado atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  else if (req.method === 'DELETE') {
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

      await prisma.chamados_escola.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'Chamado excluído com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}