import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Lista de unidades administrativas que devem ser excluídas da listagem de escolas
    const administrativeUnits = [
      'SEC.FAZ', 'GM', 'LAB', 'PROTOCOLO', 'ARQUIVO', 'AUD', 'CPFPF', 'DEJUR', 
      'CIE', 'CAE', 'CME', 'CACS FUNDEB', 'DIGITALIZAÇÃO', 'CAED', 'NCR', 'NAI', 
      'CSDT', 'SUPED', 'CEI', 'DEB', 'DAISE', 'DAIE', 'DPPE', 'CEJA', 'CLL', 
      'NUMP', 'CEF I', 'CEF II', 'COTRAN', 'SAGP', 'ASS/SAGP', 'CAT', 'DGP', 
      'DIE', 'NF', 'CAESC', 'NL', 'CAPC', 'AC', 'NAA', 'EAG', 'CGP', 'GAB', 
      'SUPLAN', 'DCC', 'DCF', 'AG', 'PATRIMONIO', 'REC', 'RG', 'CHADA', 'OUV', 
      'NSGE', 'NSGE LAB', 'RPP'
    ];

    const schools = await prisma.school.findMany({
      where: {
        NOT: {
          name: {
            in: administrativeUnits
          }
        }
      },
      include: {
        annexes: true, // Incluir anexos vinculados
        parentSchool: true // Incluir escola principal (caso seja um anexo)
      }
    });
    
    res.status(200).json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
}