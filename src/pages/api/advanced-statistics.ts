import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extrair parâmetros de filtro da query
    const { period, startDate, endDate, technician, school, status, osType } = req.query;
    
    // Calcular período baseado nos filtros
    const now = new Date();
    let dateFilter: Date;
    
    if (period === 'custom' && startDate && endDate) {
      dateFilter = new Date(startDate as string);
    } else {
      switch (period) {
        case '30days':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case '12months':
        default:
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          break;
      }
    }
    
    const twelveMonthsAgo = dateFilter;
    
    // Construir filtros dinâmicos
    const createWhereClause = (includeDate = true, includeStatus = true, includeSchool = true, includeTechnician = true) => {
      const where: any = {};
      
      if (includeDate) {
        where.createdAt = { gte: twelveMonthsAgo };
        if (period === 'custom' && endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }
      
      if (includeStatus && status) {
        where.status = status;
      }
      
      if (includeSchool && school) {
        where.unidadeEscolar = { contains: school as string, mode: 'insensitive' };
      }
      
      return where;
    };

    // 1. KPIs Gerais
    const [
      totalInternalOS,
      totalOSExterna,
      totalOS,
      totalOsAssinadaTable,
      totalOSExternaAssinadas,
      pendingOS,
      resolvedOS,
      totalMemorandums,
      totalItems
    ] = await Promise.all([
      prisma.internalOS.count({ 
        where: {
          ...createWhereClause(true, false, false, true),
          ...(technician && { 
            tecnicoId: {
              in: await prisma.profile.findMany({
                where: { displayName: { contains: technician as string, mode: 'insensitive' } },
                select: { id: true }
              }).then(profiles => profiles.map(p => p.id))
            }
          })
        }
      }),
      prisma.oSExterna.count({ where: createWhereClause() }),
      prisma.os.count({ where: createWhereClause() }),
      prisma.osAssinada.count({ where: createWhereClause() }),
      prisma.oSExterna.count({ where: { ...createWhereClause(), status: 'Assinado' } }),
      prisma.oSExterna.count({ where: { ...createWhereClause(), status: 'Pendente' } }),
      prisma.oSExterna.count({ where: { ...createWhereClause(), status: 'Assinado' } }),
      prisma.memorandum.count({ where: createWhereClause(true, false, true, false) }),
      prisma.item.count()
    ]);

    // Somar OS assinadas de ambas as tabelas
    const totalOsAssinada = totalOsAssinadaTable + totalOSExternaAssinadas;

    // 2. Dados Temporais
    
    const monthlyData = await Promise.all([
      // OS Internas por mês
      prisma.internalOS.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: {
          ...createWhereClause(true, false, false, true),
          ...(technician && { 
            tecnicoId: {
              in: await prisma.profile.findMany({
                where: { displayName: { contains: technician as string, mode: 'insensitive' } },
                select: { id: true }
              }).then(profiles => profiles.map(p => p.id))
            }
          })
        }
      }),
      // OS Externas (novas) por mês
      prisma.oSExterna.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: createWhereClause()
      }),
      // OS (antigas não assinadas) por mês
      prisma.os.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: createWhereClause()
      }),
      // OS Assinadas por mês
      prisma.osAssinada.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: createWhereClause()
      }),
      // Memorandos por mês
      prisma.newMemorandum.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: createWhereClause(true, false, true, false)
      })
    ]);

    // 3. Análise por Técnico
    const [internalTechStats, externalTechStats] = await Promise.all([
      // Técnicos - OS Internas (com nomes)
      prisma.internalOS.groupBy({
        by: ['tecnicoId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      // Técnicos - OS Externas (novas)
      prisma.oSExterna.groupBy({
        by: ['tecnicoResponsavel'],
        _count: { id: true },
        where: { tecnicoResponsavel: { not: null } },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    // Buscar nomes dos técnicos para OS Internas
    const techniciansProfiles = await prisma.profile.findMany({
      select: { id: true, displayName: true }
    });
    
    const technicianMap = Object.fromEntries(
      techniciansProfiles.map(tech => [tech.id, tech.displayName])
    );

    // Processar dados dos técnicos internos com nomes
    const processedInternalTechs = internalTechStats.map(tech => ({
      ...tech,
      displayName: technicianMap[tech.tecnicoId] || `Técnico ${tech.tecnicoId}`
    }));

    const technicianPerformance = [processedInternalTechs, externalTechStats];

    // 4. Análise de Equipamentos (OS Externas)
    const equipmentData = await prisma.oSExterna.findMany({
      select: {
        pcsProprio: true,
        pcsLocado: true,
        notebooksProprio: true,
        notebooksLocado: true,
        monitoresProprio: true,
        monitoresLocado: true,
        tabletsProprio: true,
        tabletsLocado: true,
        temLaboratorio: true,
        oki: true,
        kyocera: true,
        hp: true,
        ricoh: true
      }
    });

    // 5. Análise por Escola/Unidade
    const [osExternaSchools, osSchools, osAssinadaSchools, internalSectors] = await Promise.all([
      // Escolas - OS Externas (novas)
      prisma.oSExterna.groupBy({
        by: ['unidadeEscolar'],
        _count: { id: true },
        where: { unidadeEscolar: { not: null } }
      }),
      // Escolas - OS (antigas não assinadas)
      prisma.os.groupBy({
        by: ['unidadeEscolar'],
        _count: { id: true }
      }),
      // Escolas - OS Assinadas
      prisma.osAssinada.groupBy({
        by: ['unidadeEscolar'],
        _count: { id: true }
      }),
      // Setores - OS Internas
      prisma.internalOS.groupBy({
        by: ['setorId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ]);

    // Agregar dados das 3 tabelas de OS externas por escola
    const schoolsMap = new Map();
    
    // Adicionar dados de OSExterna
    osExternaSchools.forEach(school => {
      if (school.unidadeEscolar && school.unidadeEscolar.trim() !== '') {
        schoolsMap.set(school.unidadeEscolar, (schoolsMap.get(school.unidadeEscolar) || 0) + school._count.id);
      }
    });
    
    // Adicionar dados de OS
    osSchools.forEach(school => {
      if (school.unidadeEscolar && school.unidadeEscolar.trim() !== '') {
        schoolsMap.set(school.unidadeEscolar, (schoolsMap.get(school.unidadeEscolar) || 0) + school._count.id);
      }
    });
    
    // Adicionar dados de OsAssinada
    osAssinadaSchools.forEach(school => {
      if (school.unidadeEscolar && school.unidadeEscolar.trim() !== '') {
        schoolsMap.set(school.unidadeEscolar, (schoolsMap.get(school.unidadeEscolar) || 0) + school._count.id);
      }
    });

    // Converter para array e ordenar
    const aggregatedSchools = Array.from(schoolsMap.entries())
      .map(([unidadeEscolar, count]) => ({
        unidadeEscolar,
        _count: { id: count }
      }))
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    const schoolAnalysis = [aggregatedSchools, internalSectors];

    // 6. Análise de Problemas
    const problemAnalysis = await Promise.all([
      // Problemas mais comuns - OS Internas
      prisma.internalOS.groupBy({
        by: ['problema'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      // Status de resolução - OS Externas
      prisma.oSExterna.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ]);

    // 7. Análise de Memorandos
    const memorandumAnalysis = await Promise.all([
      // Memorandos por tipo
      prisma.newMemorandum.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      // Escolas que mais recebem memorandos
      prisma.newMemorandum.groupBy({
        by: ['schoolName'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ]);

    // 8. Análise de Conectividade
    const connectivityData = await prisma.oSExterna.findMany({
      select: {
        redeBr: true,
        educacaoConectada: true,
        naoHaProvedor: true,
        temLaboratorio: true
      },
      where: {
        OR: [
          { redeBr: { not: null } },
          { educacaoConectada: { not: null } },
          { naoHaProvedor: { not: null } }
        ]
      }
    });

    // Processar dados de equipamentos
    const equipmentSummary = {
      totalPCs: equipmentData.reduce((sum, item) => sum + (item.pcsProprio || 0) + (item.pcsLocado || 0), 0),
      totalNotebooks: equipmentData.reduce((sum, item) => sum + (item.notebooksProprio || 0) + (item.notebooksLocado || 0), 0),
      totalMonitors: equipmentData.reduce((sum, item) => sum + (item.monitoresProprio || 0) + (item.monitoresLocado || 0), 0),
      totalTablets: equipmentData.reduce((sum, item) => sum + (item.tabletsProprio || 0) + (item.tabletsLocado || 0), 0),
      schoolsWithLab: equipmentData.filter(item => item.temLaboratorio).length,
      schoolsWithoutLab: equipmentData.filter(item => !item.temLaboratorio).length,
      printerStats: {
        oki: equipmentData.reduce((sum, item) => sum + (item.oki || 0), 0),
        kyocera: equipmentData.reduce((sum, item) => sum + (item.kyocera || 0), 0),
        hp: equipmentData.reduce((sum, item) => sum + (item.hp || 0), 0),
        ricoh: equipmentData.reduce((sum, item) => sum + (item.ricoh || 0), 0)
      }
    };

    // Processar dados de conectividade
    const connectivitySummary = {
      redeBr: {
        sim: connectivityData.filter(item => item.redeBr === 'Sim').length,
        nao: connectivityData.filter(item => item.redeBr === 'Não').length
      },
      educacaoConectada: {
        sim: connectivityData.filter(item => item.educacaoConectada === 'Sim').length,
        nao: connectivityData.filter(item => item.educacaoConectada === 'Não').length
      },
      naoHaProvedor: {
        sim: connectivityData.filter(item => item.naoHaProvedor === 'Sim').length,
        nao: connectivityData.filter(item => item.naoHaProvedor === 'Não').length
      }
    };

    // Processar dados mensais
    const processMonthlyData = (data: any[]) => {
      const monthlyStats = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return {
          month: date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
          count: 0
        };
      });

      data.forEach(item => {
        const itemDate = new Date(item.createdAt);
        const monthIndex = (itemDate.getFullYear() - twelveMonthsAgo.getFullYear()) * 12 + 
                          (itemDate.getMonth() - twelveMonthsAgo.getMonth());
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyStats[monthIndex].count += item._count.id;
        }
      });

      return monthlyStats;
    };

    res.status(200).json({
      // KPIs Principais
      kpis: {
        totalInternalOS,
        totalOSExterna,
        totalOS,
        totalOsAssinada,
        totalAllOS: totalInternalOS + totalOSExterna + totalOS + totalOsAssinada,
        pendingOS,
        resolvedOS,
        resolutionRate: pendingOS + totalOSExternaAssinadas > 0 ? ((totalOSExternaAssinadas / (pendingOS + totalOSExternaAssinadas)) * 100).toFixed(1) : 0,
        pendingRate: pendingOS + totalOSExternaAssinadas > 0 ? ((pendingOS / (pendingOS + totalOSExternaAssinadas)) * 100).toFixed(1) : 0,
        totalMemorandums,
        totalItems
      },

      // Dados Temporais
      temporal: {
        internalOS: processMonthlyData(monthlyData[0]),
        osExterna: processMonthlyData(monthlyData[1]),
        os: processMonthlyData(monthlyData[2]),
        osAssinada: processMonthlyData(monthlyData[3]),
        memorandums: processMonthlyData(monthlyData[4])
      },

      // Performance dos Técnicos
      technicians: {
        internal: technicianPerformance[0].slice(0, 10),
        external: technicianPerformance[1].slice(0, 10),
        os: [] // Temporariamente vazio até resolver problema com dados
      },

      // Análise de Equipamentos
      equipment: equipmentSummary,

      // Análise de Escolas
      schools: {
        external: schoolAnalysis[0],
        internal: schoolAnalysis[1]
      },

      // Análise de Problemas
      problems: {
        common: problemAnalysis[0],
        status: problemAnalysis[1]
      },

      // Análise de Memorandos
      memorandums: {
        byType: memorandumAnalysis[0],
        bySchool: memorandumAnalysis[1]
      },

      // Análise de Conectividade
      connectivity: connectivitySummary
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas avançadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}