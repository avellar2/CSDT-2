import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method === 'GET') {
    // Listar diagnósticos
    try {
      const diagnostics = await prisma.chadaDiagnostic.findMany({
        include: {
          Item: {
            select: {
              id: true,
              name: true,
              brand: true,
              serialNumber: true
            }
          },
          Sector: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calcular tempo desde o diagnóstico
      const diagnosticsWithDays = diagnostics.map(diagnostic => {
        const today = new Date();
        const createdAt = new Date(diagnostic.createdAt);
        const diffTime = Math.abs(today.getTime() - createdAt.getTime());
        
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let timeWaiting;
        if (diffDays > 0) {
          timeWaiting = `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          timeWaiting = `${diffHours}h`;
        } else {
          timeWaiting = `${diffMinutes}min`;
        }
        
        return {
          ...diagnostic,
          daysWaiting: diffDays,
          timeWaiting: timeWaiting,
          isDelayed: diffDays >= 3 // Considera atrasado após 3 dias
        };
      });

      res.status(200).json(diagnosticsWithDays);
    } catch (error) {
      console.error('Erro ao buscar diagnósticos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'POST') {
    // Criar novo diagnóstico
    try {
      const {
        itemId,
        sectorId,
        sectorName,
        technicianChada,
        diagnostic,
        requestedPart,
        createdBy
      } = req.body;

      // Validar campos obrigatórios
      if (!itemId || !sectorId || !sectorName || !technicianChada || !diagnostic || !requestedPart || !createdBy) {
        return res.status(400).json({ 
          error: 'Todos os campos são obrigatórios' 
        });
      }

      const newDiagnostic = await prisma.chadaDiagnostic.create({
        data: {
          itemId: parseInt(itemId),
          sectorId: parseInt(sectorId),
          sectorName,
          technicianChada,
          diagnostic,
          requestedPart,
          createdBy,
          status: 'AGUARDANDO_PECA'
        },
        include: {
          Item: {
            select: {
              id: true,
              name: true,
              brand: true,
              serialNumber: true
            }
          },
          Sector: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json(newDiagnostic);
    } catch (error) {
      console.error('Erro ao criar diagnóstico:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'PATCH') {
    // Atualizar status do diagnóstico
    try {
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'ID e status são obrigatórios' });
      }

      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      // Se status for INSTALADO, marcar data de conclusão
      if (status === 'INSTALADO') {
        updateData.completedAt = new Date();
      }

      const updatedDiagnostic = await prisma.chadaDiagnostic.update({
        where: { id },
        data: updateData,
        include: {
          Item: {
            select: {
              id: true,
              name: true,
              brand: true,
              serialNumber: true
            }
          },
          Sector: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(200).json(updatedDiagnostic);
    } catch (error) {
      console.error('Erro ao atualizar diagnóstico:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}