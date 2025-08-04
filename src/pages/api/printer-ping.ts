import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

interface PingResult {
  id: number;
  ip: string;
  sigla: string;
  isReachable: boolean;
  responseTime: number | null;
  status: string;
  lastChecked: string;
}

async function pingHost(ip: string): Promise<{ isReachable: boolean; responseTime: number | null }> {
  if (!ip || ip.trim() === '' || ip === 'não informado') {
    return { isReachable: false, responseTime: null };
  }

  try {
    // Usar ping do sistema operacional (funciona no Windows e Linux)
    const isWindows = process.platform === 'win32';
    const pingCommand = isWindows 
      ? `ping -n 1 -w 1000 ${ip}` 
      : `ping -c 1 -W 1 ${ip}`;

    const { stdout, stderr } = await execAsync(pingCommand);
    
    if (stderr) {
      console.warn(`Ping stderr para ${ip}:`, stderr);
    }

    const isReachable = isWindows 
      ? !stdout.includes('Esgotado o tempo limite do pedido') && !stdout.includes('Request timed out')
      : stdout.includes('1 received') || stdout.includes('1 packets transmitted, 1 received');

    // Tentar extrair tempo de resposta
    let responseTime: number | null = null;
    if (isReachable) {
      const timeMatch = isWindows 
        ? stdout.match(/tempo[<=]\s*(\d+)ms/i) || stdout.match(/time[<=]\s*(\d+)ms/i)
        : stdout.match(/time=(\d+\.?\d*)\s*ms/);
      
      if (timeMatch) {
        responseTime = parseFloat(timeMatch[1]);
      }
    }

    return { isReachable, responseTime };
  } catch (error) {
    console.error(`Erro ao fazer ping para ${ip}:`, error);
    return { isReachable: false, responseTime: null };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const allPrinters = await prisma.printer.findMany();
    
    if (allPrinters.length === 0) {
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        total: 0,
        reachable: 0,
        printers: []
      });
    }

    console.log(`Fazendo ping em ${allPrinters.length} impressoras...`);

    // Fazer ping em todas as impressoras
    const pingPromises = allPrinters.map(async (printer): Promise<PingResult> => {
      const pingResult = await pingHost(printer.ip);
      
      return {
        id: printer.id,
        ip: printer.ip || 'N/A',
        sigla: printer.sigla,
        isReachable: pingResult.isReachable,
        responseTime: pingResult.responseTime,
        status: !printer.ip || printer.ip === 'não informado' 
          ? 'no-ip' 
          : pingResult.isReachable 
            ? 'reachable' 
            : 'unreachable',
        lastChecked: new Date().toISOString()
      };
    });

    const results = await Promise.all(pingPromises);
    
    // Estatísticas
    const reachableCount = results.filter(r => r.isReachable).length;
    const unreachableCount = results.filter(r => !r.isReachable && r.status !== 'no-ip').length;
    const noIPCount = results.filter(r => r.status === 'no-ip').length;

    console.log(`Ping concluído: ${reachableCount} alcançáveis, ${unreachableCount} inalcançáveis, ${noIPCount} sem IP`);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      total: results.length,
      reachable: reachableCount,
      unreachable: unreachableCount,
      noIP: noIPCount,
      printers: results
    });

  } catch (error) {
    console.error('Erro ao fazer ping das impressoras:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar conectividade das impressoras',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}