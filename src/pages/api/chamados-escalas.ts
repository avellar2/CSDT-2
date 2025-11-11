import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const {
        escola,
        titulo,
        descricao,
        categoria,
        tecnico,
        osOriginal,
        automatico = false
      } = req.body;

      // Validar campos obrigatórios
      if (!escola || !titulo || !descricao || !categoria || !tecnico) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: escola, titulo, descricao, categoria, tecnico'
        });
      }

      // Criar o chamado
      const chamado = await prisma.chamados_escalas.create({
        data: {
          escola,
          titulo,
          descricao,
          categoria,
          tecnico,
          osOriginal: osOriginal || null,
          automatico,
          status: 'PENDENTE',
          dataCriacao: new Date(),
          dataAgendamento: null,
          observacoes: null,
          updatedAt: new Date()
        }
      });

      return res.status(201).json({
        success: true,
        data: chamado,
        message: automatico
          ? 'Chamado automático criado com sucesso'
          : 'Chamado criado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  else if (req.method === 'GET') {
    try {
      const { status, tecnico } = req.query;

      let whereClause: any = {};

      if (status && status !== 'TODOS') {
        whereClause.status = status;
      }

      if (tecnico) {
        whereClause.tecnico = tecnico;
      }

      const chamados = await prisma.chamados_escalas.findMany({
        where: whereClause,
        orderBy: {
          dataCriacao: 'desc'
        }
      });

      return res.status(200).json({
        success: true,
        data: chamados,
        total: chamados.length
      });

    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  else if (req.method === 'PUT') {
    try {
      const { id, status, dataAgendamento, observacoes } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID do chamado é obrigatório'
        });
      }

      const chamadoAtualizado = await prisma.chamados_escalas.update({
        where: { id: parseInt(id) },
        data: {
          status: status || undefined,
          dataAgendamento: dataAgendamento ? new Date(dataAgendamento) : undefined,
          observacoes: observacoes || undefined
        }
      });

      return res.status(200).json({
        success: true,
        data: chamadoAtualizado,
        message: 'Chamado atualizado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao atualizar chamado:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID do chamado é obrigatório'
        });
      }

      await prisma.chamados_escalas.delete({
        where: { id: parseInt(id as string) }
      });

      return res.status(200).json({
        success: true,
        message: 'Chamado excluído com sucesso'
      });

    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} não permitido`
    });
  }
}