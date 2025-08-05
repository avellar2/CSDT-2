import { NextApiRequest, NextApiResponse } from 'next';

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

// Armazenamento em memória para os dados do agente
// Em produção, você pode usar Redis ou outro cache
let cachedPrinterStatus: AgentStatusData | null = null;
let lastUpdateTime: number = 0;

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
    cachedPrinterStatus = {
      ...agentData,
      timestamp: new Date().toISOString() // Usar timestamp do servidor
    };
    
    lastUpdateTime = Date.now();

    console.log(`[Agent] Recebidos dados de ${agentData.printers.length} impressoras do agente local`);
    console.log(`[Agent] ${agentData.withIssues} impressoras com problemas detectadas`);

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
        timestamp: cachedPrinterStatus.timestamp
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
  const now = Date.now();
  const age = now - lastUpdateTime;
  const maxAge = 5 * 60 * 1000; // 5 minutos
  
  return {
    data: cachedPrinterStatus,
    isStale: age > maxAge,
    age: Math.floor(age / 1000) // idade em segundos
  };
}