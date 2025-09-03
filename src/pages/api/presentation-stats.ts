import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Lista de unidades administrativas que devem ser excluídas da contagem de escolas
    const administrativeUnits = [
      'SEC.FAZ', 'GM', 'LAB', 'PROTOCOLO', 'ARQUIVO', 'AUD', 'CPFPF', 'DEJUR', 
      'CIE', 'CAE', 'CME', 'CACS FUNDEB', 'DIGITALIZAÇÃO', 'CAED', 'NCR', 'NAI', 
      'CSDT', 'SUPED', 'CEI', 'DEB', 'DAISE', 'DAIE', 'DPPE', 'CEJA', 'CLL', 
      'NUMP', 'CEF I', 'CEF II', 'COTRAN', 'SAGP', 'ASS/SAGP', 'CAT', 'DGP', 
      'DIE', 'NF', 'CAESC', 'NL', 'CAPC', 'AC', 'NAA', 'EAG', 'CGP', 'GAB', 
      'SUPLAN', 'DCC', 'DCF', 'AG', 'PATRIMONIO', 'REC', 'RG', 'CHADA', 'OUV', 
      'NSGE', 'NSGE LAB', 'RPP'
    ];

    // Contagem de escolas reais (excluindo unidades administrativas)
    const schoolsCount = await prisma.school.count({
      where: {
        NOT: {
          name: {
            in: administrativeUnits
          }
        }
      }
    });

    // Contagem total de equipamentos
    const equipmentCount = await prisma.item.count();

    // Contagem de impressoras monitoradas
    const printerCount = await prisma.printer.count();

    // Contagem de OS internas e externas do último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const internalOsCount = await prisma.internalOS.count({
      where: {
        createdAt: {
          gte: lastMonth
        }
      }
    });

    const externalOsCount = await prisma.oSExterna.count({
      where: {
        createdAt: {
          gte: lastMonth
        }
      }
    });

    // Calcular disponibilidade - assumindo todas as impressoras como online já que não há campo status
    const availability = '99.9';

    const stats = {
      schools: schoolsCount,
      equipment: equipmentCount,
      printers: printerCount,
      availability: `${availability}%`,
      monthlyOs: internalOsCount + externalOsCount,
      lastUpdated: new Date().toISOString()
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching presentation stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}