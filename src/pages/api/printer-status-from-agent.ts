import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

// Interface para os dados recebidos do agente local
interface AgentPrinterStatus {
  id: number;
  ip: string;
  sigla: string;
  status: string;
  errorState: string;
  errors: string[];
  errorDetails: Array<{
    error: string;
    severity: 'warning' | 'error' | 'critical';
    action: string;
    description: string;
  }>;
  tonerLevel?: number;
  paperStatus: string;
  isOnline: boolean;
  lastChecked: string;
  uptime?: string;
  pageCount?: number;
  hasCriticalErrors: boolean;
  source: string;
}

interface AgentStatusData {
  timestamp: string;
  total: number;
  withIssues: number;
  printers: AgentPrinterStatus[];
  agentInfo: {
    version: string;
    location: string;
  };
}

// Cache global usando variáveis de processo para ambiente serverless
declare global {
  var __PRINTER_CACHE__: AgentStatusData | undefined;
  var __PRINTER_CACHE_TIME__: number | undefined;
}

// Inicializar cache global
global.__PRINTER_CACHE__ = global.__PRINTER_CACHE__ || undefined;
global.__PRINTER_CACHE_TIME__ = global.__PRINTER_CACHE_TIME__ || 0;

const printerCache = {
  setData(data: AgentStatusData): void {
    global.__PRINTER_CACHE__ = data;
    global.__PRINTER_CACHE_TIME__ = Date.now();
    console.log(`[Cache] Dados armazenados: ${data.printers.length} impressoras às ${new Date().toLocaleTimeString()}`);
  },

  getData(): { data: AgentStatusData | null; lastUpdateTime: number } {
    return {
      data: global.__PRINTER_CACHE__ || null,
      lastUpdateTime: global.__PRINTER_CACHE_TIME__ || 0
    };
  },

  hasData(): boolean {
    return global.__PRINTER_CACHE__ !== undefined;
  },

  getAge(): number {
    return Math.floor((Date.now() - (global.__PRINTER_CACHE_TIME__ || 0)) / 1000);
  },

  isStale(maxAgeMs: number = 5 * 60 * 1000): boolean {
    return (Date.now() - (global.__PRINTER_CACHE_TIME__ || 0)) > maxAgeMs;
  }
};

// Função para validar a chave de API
function validateApiKey(req: NextApiRequest): boolean {
  const providedKey = req.headers.authorization?.replace('Bearer ', '');
  const validKey = process.env.LOCAL_AGENT_API_KEY || 'default-key';
  
  return providedKey === validKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validar chave de API
  if (!validateApiKey(req)) {
    console.warn('Tentativa de acesso não autorizada ao endpoint do agente local');
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  try {
    const agentData: AgentStatusData = req.body;

    // Validar dados básicos
    if (!agentData.timestamp || !Array.isArray(agentData.printers)) {
      return res.status(400).json({ 
        error: 'Invalid data format',
        details: 'timestamp and printers array are required'
      });
    }

    // Validar que cada impressora tem os campos obrigatórios
    const invalidPrinters = agentData.printers.filter(printer => 
      !printer.id || !printer.sigla || !printer.ip
    );

    if (invalidPrinters.length > 0) {
      return res.status(400).json({
        error: 'Invalid printer data',
        details: `${invalidPrinters.length} printers missing required fields (id, sigla, ip)`
      });
    }

    // Atualizar cache com os novos dados
    const processedData: AgentStatusData = {
      ...agentData,
      timestamp: new Date().toISOString() // Usar timestamp do servidor
    };

    printerCache.setData(processedData);

    console.log(`[Agent] Recebidos dados de ${agentData.printers.length} impressoras do agente local`);
    console.log(`[Agent] ${agentData.withIssues} impressoras com problemas detectadas`);

    // Salvar dados no banco de dados
    try {
      // Usar transaction para garantir atomicidade
      await prisma.$transaction(async (tx) => {
        // Deletar status antigos (mais de 1 hora)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        await tx.printerStatus.deleteMany({
          where: {
            updatedAt: {
              lt: oneHourAgo
            }
          }
        });

        // Salvar novo status para cada impressora
        for (const printer of agentData.printers) {
          // Verificar se já existe status para esta impressora
          const existing = await tx.printerStatus.findFirst({
            where: { printerId: printer.id }
          });

          const statusData = {
            status: printer.status,
            errorState: printer.errorState,
            errors: printer.errors,
            errorDetails: printer.errorDetails,
            tonerLevel: printer.tonerLevel,
            paperStatus: printer.paperStatus,
            isOnline: printer.isOnline,
            uptime: printer.uptime,
            pageCount: printer.pageCount,
            hasCriticalErrors: printer.hasCriticalErrors,
            responseTime: undefined,
            lastChecked: new Date(printer.lastChecked)
          };

          if (existing) {
            // Atualizar status existente
            await tx.printerStatus.update({
              where: { id: existing.id },
              data: statusData
            });
          } else {
            // Criar novo status
            await tx.printerStatus.create({
              data: {
                printerId: printer.id,
                ...statusData
              }
            });
          }
        }
      });

      console.log(`[Agent] Status salvo no banco de dados para ${agentData.printers.length} impressoras`);
    } catch (dbError) {
      console.error('[Agent] Erro ao salvar status no banco:', dbError);
      // Não falhar a requisição por erro de banco
    }

    // Log de impressoras com problemas críticos para monitoramento
    const criticalPrinters = agentData.printers.filter(p => p.hasCriticalErrors);
    if (criticalPrinters.length > 0) {
      console.warn(`[Agent] ALERTA: ${criticalPrinters.length} impressoras com erros críticos:`,
        criticalPrinters.map(p => `${p.sigla} (${p.ip})`).join(', ')
      );
    }

    res.status(200).json({
      success: true,
      message: 'Status received and cached successfully',
      data: {
        processedPrinters: agentData.printers.length,
        withIssues: agentData.withIssues,
        criticalIssues: criticalPrinters.length,
        timestamp: processedData.timestamp
      }
    });

  } catch (error) {
    console.error('Erro ao processar dados do agente local:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Função auxiliar para obter os dados em cache (usada por outras APIs)
export function getCachedPrinterStatus(): {
  data: AgentStatusData | null;
  isStale: boolean;
  age: number;
} {
  const cacheData = printerCache.getData();
  const age = printerCache.getAge();
  const isStale = printerCache.isStale();
  
  console.log(`[Cache] Consultando cache: hasData=${printerCache.hasData()}, age=${age}s, isStale=${isStale}`);
  
  return {
    data: cacheData.data,
    isStale,
    age
  };
}