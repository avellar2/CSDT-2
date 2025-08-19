import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { demandIds, targetDate } = req.body;

  if (!demandIds || !Array.isArray(demandIds)) {
    return res.status(400).json({ error: "demandIds deve ser um array" });
  }

  try {
    // Buscar demandas e suas escolas
    const demands = await prisma.schoolDemand.findMany({
      where: {
        id: { in: demandIds.map(id => Number(id)) }
      },
      include: {
        School: true
      }
    });

    // Configurar filtro de data se fornecido
    let dateFilter = {};
    if (targetDate) {
      // Função auxiliar para criar data no fuso horário brasileiro
      const createBrazilianDate = (dateString: string) => {
        const targetDate = new Date(dateString + 'T00:00:00-03:00');
        return new Date(targetDate.getTime());
      };
      
      const target = createBrazilianDate(targetDate);
      const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
      
      dateFilter = {
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      };
    }

    // Verificar OS criadas para essas escolas
    const schoolNames = demands.map(d => d.School.name);
    
    const osCreated = await prisma.os.findMany({
      where: {
        unidadeEscolar: { in: schoolNames }
      },
      select: {
        unidadeEscolar: true,
        status: true,
        numeroOs: true,
        createdAt: true
      }
    });

    // Verificar OS Externas criadas (todas, não só assinadas)
    const osExternasCreated = await prisma.oSExterna.findMany({
      where: {
        unidadeEscolar: { in: schoolNames }
      },
      select: {
        unidadeEscolar: true,
        numeroOs: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Verificar OS assinadas (com filtro de data se fornecido)
    const osAssinadas = await prisma.osAssinada.findMany({
      where: {
        unidadeEscolar: { in: schoolNames },
        ...dateFilter
      },
      select: {
        unidadeEscolar: true,
        numeroOs: true,
        updatedAt: true
      }
    });

    // Verificar OS Externas assinadas (com filtro de data se fornecido)
    const osExternas = await prisma.oSExterna.findMany({
      where: {
        unidadeEscolar: { in: schoolNames },
        status: 'Assinado',
        ...dateFilter
      },
      select: {
        unidadeEscolar: true,
        numeroOs: true,
        status: true,
        updatedAt: true,
        createdAt: true
      }
    });

    // Debug detalhado para investigação
    console.log('\n🔍 DEBUG DETALHADO - check-os-status:');
    console.log('Target Date:', targetDate);
    console.log('Date Filter:', dateFilter);
    console.log('School Names:', schoolNames);
    console.log('OS Tradicionais criadas:', osCreated.length);
    console.log('OS Externas criadas:', osExternasCreated.map(os => ({
      escola: os.unidadeEscolar,
      numeroOs: os.numeroOs,
      status: os.status,
      createdAt: os.createdAt,
      updatedAt: os.updatedAt
    })));
    console.log('OS Externas assinadas (filtradas por data):', osExternas.map(os => ({
      escola: os.unidadeEscolar,
      numeroOs: os.numeroOs,
      status: os.status,
      createdAt: os.createdAt,
      updatedAt: os.updatedAt
    })));
    console.log('OS Assinadas encontradas:', osAssinadas.map(os => ({
      escola: os.unidadeEscolar,
      numeroOs: os.numeroOs,
      updatedAt: os.updatedAt
    })));

    // Mapear status das demandas
    const demandStatus = demands.map(demand => {
      const schoolName = demand.School.name;
      
      // Verificar OS criadas (tradicional ou externa)
      const hasOsTraditional = osCreated.find(os => os.unidadeEscolar === schoolName);
      const hasOsExterna = osExternasCreated.find(os => os.unidadeEscolar === schoolName);
      const hasOs = hasOsTraditional || hasOsExterna;
      
      // Verificar OS assinadas (tradicional ou externa) para a data específica
      const isSignedTraditional = osAssinadas.find(os => os.unidadeEscolar === schoolName);
      const isSignedExterna = osExternas.find(os => os.unidadeEscolar === schoolName);
      
      const isSigned = isSignedTraditional || isSignedExterna;

      // Debug para investigação
      console.log(`🔍 Debug OS Status - ${schoolName}:`, {
        hasOsTraditional: !!hasOsTraditional,
        hasOsExterna: !!hasOsExterna,
        hasOs: !!hasOs,
        isSignedTraditional: !!isSignedTraditional,
        isSignedExterna: !!isSignedExterna,
        isSigned: !!isSigned,
        finalStatus: isSigned ? 'signed' : hasOs ? 'created' : 'pending',
        targetDate,
        osExternasTotal: osExternas.length,
        osAssinadasTotal: osAssinadas.length
      });

      return {
        demandId: demand.id,
        schoolName,
        status: isSigned ? 'signed' : hasOs ? 'created' : 'pending',
        numeroOs: (hasOsTraditional?.numeroOs || hasOsExterna?.numeroOs || isSigned?.numeroOs || 'N/A'),
        signedType: isSigned ? (isSignedTraditional ? 'traditional' : 'externa') : null,
        osType: hasOs ? (hasOsTraditional ? 'traditional' : 'externa') : null
      };
    });

    return res.status(200).json({ demandStatus });
  } catch (error) {
    console.error("Erro ao verificar status das OS:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}