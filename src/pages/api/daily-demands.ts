import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Configuração do filtro de data - aceitar parâmetros de query
    const { date, days } = req.query;
    
    let startOfDay, endOfDay;
    
    // Função auxiliar para criar data no fuso horário brasileiro
    const createBrazilianDate = (dateString?: string) => {
      if (dateString) {
        // Para data específica, criar no fuso horário local brasileiro
        const targetDate = new Date(dateString + 'T00:00:00-03:00');
        return new Date(targetDate.getTime());
      } else {
        // Para "hoje", usar a data atual no fuso brasileiro
        const now = new Date();
        // Ajustar para fuso horário brasileiro (UTC-3)
        const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        return new Date(brazilTime.toISOString().split('T')[0] + 'T00:00:00-03:00');
      }
    };

    if (date) {
      // Se data específica fornecida
      const targetDate = createBrazilianDate(date as string);
      startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    } else if (days) {
      // Se número de dias fornecido, buscar dos últimos X dias
      const numDays = parseInt(days as string) || 7;
      const today = createBrazilianDate();
      endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      startOfDay = new Date(today);
      startOfDay.setDate(today.getDate() - numDays);
      startOfDay.setHours(0, 0, 0, 0);
    } else {
      // Padrão: apenas hoje (no fuso brasileiro)
      const today = createBrazilianDate();
      startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    }

    console.log('Debug - Date filter:', {
      date,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Consulta com tratamento de erros específico
    const demands = await prisma.schoolDemand.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        School: {
          select: {
            name: true,
            address: true,
            district: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log('Debug - Raw demands found:', demands.length);
    console.log('Debug - Sample demand:', demands[0] ? {
      id: demands[0].id,
      createdAt: demands[0].createdAt,
      schoolName: demands[0].School?.name
    } : 'No demands');
    
    // Debug específico para escola EM OLINDA BONTURI BOLSONARO
    const olindaDemand = demands.find(d => d.School?.name?.includes('OLINDA BONTURI BOLSONARO'));
    if (olindaDemand) {
      console.log('🏫 OLINDA BONTURI BOLSONARO encontrada:', {
        id: olindaDemand.id,
        createdAt: olindaDemand.createdAt,
        demand: olindaDemand.demand?.substring(0, 50)
      });
    } else {
      console.log('🏫 OLINDA BONTURI BOLSONARO NÃO encontrada nas demandas do dia');
    }

    // Formatação segura dos dados
    const safeDemands = demands.map((demand) => ({
      id: demand.id.toString(), // Garante que o ID seja string
      title: `Demanda - ${demand.School?.name || "Escola não especificada"}`,
      description: demand.demand || "Sem descrição fornecida",
      createdAt: demand.createdAt.toISOString(), // Formato padrão para datas
    }));

    res.status(200).json({
      success: true,
      data: safeDemands,
      message: `Encontradas ${safeDemands.length} demandas`,
      debug: {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        totalFound: demands.length
      }
    });
  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  } finally {
    await prisma.$disconnect();
  }
}