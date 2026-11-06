import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  canTechnicianSeeRouteEntity,
  dateKeyFromPrismaDate,
  isRouteManager,
  isValidDateKey,
  loadRouteScope,
  routeStatusIsOpen,
} from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

function chamadoDateKey(chamado: {
  dataAgendamento: Date | null;
  dataCriacao: Date;
}): string {
  return formatBrazilDateKey(chamado.dataAgendamento || chamado.dataCriacao);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === 'POST') {
    try {
      const {
        escola,
        titulo,
        descricao,
        categoria,
        tecnico,
        osOriginal,
        automatico = false,
        routeId,
      } = req.body || {};

      // Validar campos obrigatórios
      if (!escola || !titulo || !descricao || !categoria || !tecnico) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: escola, titulo, descricao, categoria, tecnico'
        });
      }

      let parsedRouteId =
        routeId === null || routeId === undefined || routeId === ''
          ? null
          : Number(routeId);

      if (
        parsedRouteId !== null &&
        (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0)
      ) {
        return res.status(400).json({ success: false, error: 'routeId inválido' });
      }

      const todayKey = formatBrazilDateKey(new Date());

      // Técnico: se houver exatamente uma rota dele no dia, o chamado nasce
      // vinculado a ela; com várias rotas, fica na fila administrativa.
      if (parsedRouteId === null && auth.profile.role === 'TECH') {
        const memberships = await prisma.dailyRouteTechnician.findMany({
          where: {
            technicianId: auth.profile.id,
            active: true,
            routeDate: new Date(`${todayKey}T00:00:00.000Z`),
            route: { status: { notIn: ['CANCELLED'] } },
          },
          select: { routeId: true },
        });

        if (memberships.length === 1) {
          parsedRouteId = memberships[0].routeId;
        }
      }

      if (parsedRouteId !== null) {
        const route = await prisma.dailyRoute.findUnique({
          where: { id: parsedRouteId },
          select: {
            id: true,
            date: true,
            status: true,
            technicians: {
              where: { active: true },
              select: { technicianId: true },
            },
          },
        });

        if (!route) {
          return res.status(404).json({ success: false, error: 'Rota não encontrada' });
        }

        if (!routeStatusIsOpen(route.status)) {
          return res.status(409).json({ success: false, error: 'A rota está encerrada.' });
        }

        if (dateKeyFromPrismaDate(route.date) !== todayKey) {
          return res.status(400).json({
            success: false,
            error: 'O chamado deve pertencer à mesma data da rota.',
          });
        }

        if (
          auth.profile.role === 'TECH' &&
          !route.technicians.some(
            (membership) => membership.technicianId === auth.profile.id
          )
        ) {
          return res.status(403).json({
            success: false,
            error: 'Você só pode criar chamados na sua própria rota.',
          });
        }
      }

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
          routeId: parsedRouteId,
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
      const { status, tecnico, routeId } = req.query;

      const whereClause: Record<string, unknown> = {};

      if (status && status !== 'TODOS') {
        whereClause.status = status;
      }

      if (tecnico) {
        whereClause.tecnico = tecnico;
      }

      if (typeof routeId === 'string' && routeId && routeId !== 'all') {
        if (routeId === 'unassigned') {
          whereClause.routeId = null;
        } else {
          const parsedRouteFilter = Number(routeId);
          if (!Number.isInteger(parsedRouteFilter) || parsedRouteFilter <= 0) {
            return res.status(400).json({
              success: false,
              error: 'routeId deve ser "all", "unassigned" ou um ID numérico válido.',
            });
          }
          whereClause.routeId = parsedRouteFilter;
        }
      }

      const chamados = await prisma.chamados_escalas.findMany({
        where: whereClause,
        take: 200,
        orderBy: {
          dataCriacao: 'desc'
        }
      });

      // Escopo por rota aplicado no backend.
      let visible = chamados;
      if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
        const scope = await loadRouteScope(
          chamados.map((chamado) => chamadoDateKey(chamado))
        );

        visible = chamados.filter((chamado) =>
          canTechnicianSeeRouteEntity({
            scope,
            dateKey: chamadoDateKey(chamado),
            routeId: chamado.routeId,
            profileId: auth.profile.id,
          })
        );
      }

      return res.status(200).json({
        success: true,
        data: visible,
        total: visible.length
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
      const { id, status, dataAgendamento, observacoes, routeId } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID do chamado é obrigatório'
        });
      }

      const existing = await prisma.chamados_escalas.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Chamado não encontrado' });
      }

      if (
        dataAgendamento !== undefined &&
        dataAgendamento !== null &&
        Number.isNaN(new Date(dataAgendamento).getTime())
      ) {
        return res.status(400).json({
          success: false,
          error: 'dataAgendamento inválida.',
        });
      }

      if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
        const scope = await loadRouteScope([chamadoDateKey(existing)]);

        if (
          !canTechnicianSeeRouteEntity({
            scope,
            dateKey: chamadoDateKey(existing),
            routeId: existing.routeId,
            profileId: auth.profile.id,
          })
        ) {
          return res.status(403).json({
            success: false,
            error: 'Este chamado pertence a outra rota.',
          });
        }

        // Reagendar um chamado com rota muda a equipe responsável: só gestor.
        if (
          existing.routeId !== null &&
          dataAgendamento &&
          formatBrazilDateKey(new Date(dataAgendamento)) !== chamadoDateKey(existing)
        ) {
          return res.status(403).json({
            success: false,
            error:
              'Somente ADMIN ou ADMTOTAL podem reagendar um chamado com rota para outra data.',
          });
        }
      }

      const updateData: Record<string, unknown> = {
        status: status || undefined,
        dataAgendamento: dataAgendamento ? new Date(dataAgendamento) : undefined,
        observacoes: observacoes || undefined,
      };

      if (routeId !== undefined) {
        if (!isRouteManager(auth.profile.role)) {
          return res.status(403).json({
            success: false,
            error: 'Somente ADMIN ou ADMTOTAL podem transferir chamados entre rotas.',
          });
        }

        if (routeId === null || routeId === '') {
          updateData.routeId = null;
        } else {
          const parsedRouteId = Number(routeId);
          if (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0) {
            return res.status(400).json({ success: false, error: 'routeId inválido' });
          }

          const route = await prisma.dailyRoute.findUnique({
            where: { id: parsedRouteId },
            select: { id: true, date: true, status: true },
          });

          if (!route) {
            return res.status(404).json({ success: false, error: 'Rota não encontrada' });
          }

          if (!routeStatusIsOpen(route.status)) {
            return res.status(409).json({ success: false, error: 'A rota está encerrada.' });
          }

          const targetDate = dataAgendamento
            ? formatBrazilDateKey(new Date(dataAgendamento))
            : chamadoDateKey(existing);

          if (dateKeyFromPrismaDate(route.date) !== targetDate) {
            return res.status(400).json({
              success: false,
              error: 'A data do chamado deve ser a mesma data da rota.',
            });
          }

          updateData.routeId = parsedRouteId;
        }
      }

      // Reagendar para outro dia sem informar a rota invalida o vínculo atual:
      // o chamado sai da rota (fila administrativa) e a movimentação é auditada.
      if (
        dataAgendamento &&
        updateData.routeId === undefined &&
        existing.routeId !== null
      ) {
        const newDateKey = formatBrazilDateKey(new Date(dataAgendamento));
        const currentRoute = await prisma.dailyRoute.findUnique({
          where: { id: existing.routeId },
          select: { date: true },
        });

        if (
          !currentRoute ||
          dateKeyFromPrismaDate(currentRoute.date) !== newDateKey
        ) {
          updateData.routeId = null;
        }
      }

      const chamadoAtualizado = await prisma.$transaction(async (tx) => {
        const updated = await tx.chamados_escalas.update({
          where: { id: parseInt(id) },
          data: updateData,
        });

        if (
          updateData.routeId !== undefined &&
          updated.routeId !== existing.routeId
        ) {
          await tx.routeTransfer.create({
            data: {
              entityType: 'CHAMADO',
              entityId: existing.id,
              fromRouteId: existing.routeId,
              toRouteId: updated.routeId,
              movedBy: auth.id,
              note: 'Alteração via atualização do chamado',
            },
          });
        }

        return updated;
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

      const existing = await prisma.chamados_escalas.findUnique({
        where: { id: parseInt(id as string) },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Chamado não encontrado' });
      }

      if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
        const scope = await loadRouteScope([chamadoDateKey(existing)]);

        if (
          !canTechnicianSeeRouteEntity({
            scope,
            dateKey: chamadoDateKey(existing),
            routeId: existing.routeId,
            profileId: auth.profile.id,
          })
        ) {
          return res.status(403).json({
            success: false,
            error: 'Este chamado pertence a outra rota.',
          });
        }
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
