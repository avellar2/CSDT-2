import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
// const snmp = require('net-snmp'); // Comentado temporariamente - instalar com: npm install net-snmp

const prisma = new PrismaClient();

// OIDs básicos compatíveis com a maioria das impressoras
const PRINTER_OIDs = {
  // Informações básicas do sistema (MIB-II - padrão universal)
  sysDescr: '1.3.6.1.2.1.1.1.0',        // Descrição do sistema
  sysUpTime: '1.3.6.1.2.1.1.3.0',       // Tempo de atividade
  sysContact: '1.3.6.1.2.1.1.4.0',      // Contato
  sysName: '1.3.6.1.2.1.1.5.0',         // Nome do sistema
  sysLocation: '1.3.6.1.2.1.1.6.0',     // Localização
  
  // OIDs específicos para impressoras (mais compatíveis)
  hrDeviceStatus: '1.3.6.1.2.1.25.3.2.1.5.1',     // Status do dispositivo
  hrPrinterStatus: '1.3.6.1.2.1.25.3.5.1.1.1',    // Status específico da impressora
  hrPrinterDetectedErrorState: '1.3.6.1.2.1.25.3.5.1.2.1', // Estado de erro
  
  // Contadores básicos
  ifInOctets: '1.3.6.1.2.1.2.2.1.10.1',           // Bytes recebidos
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16.1',          // Bytes enviados
  
  // OIDs alternativos para consumíveis (Xerox/HP/outros)
  // Xerox C7020/C8035 específicos
  xeroxSuppliesLevel: '1.3.6.1.4.1.253.8.53.13.2.2.1.6',
  xeroxSuppliesName: '1.3.6.1.4.1.253.8.53.13.2.2.1.5',
  
  // HP/OKI compatíveis  
  prtMarkerSuppliesLevel: '1.3.6.1.2.1.43.11.1.1.9',
  prtMarkerSuppliesType: '1.3.6.1.2.1.43.11.1.1.3',
  prtMarkerSuppliesDescription: '1.3.6.1.2.1.43.11.1.1.6',
};

// Códigos de status da impressora (em português)
const PRINTER_STATUS = {
  1: 'outro',
  2: 'desconhecido', 
  3: 'aguardando',
  4: 'imprimindo',
  5: 'aquecendo',
  6: 'impressão parada',
  7: 'offline'
};

// Códigos de erro detectados (detalhados e em português)
const ERROR_STATES = {
  0: 'Sem Erro',
  1: 'Papel Baixo',
  2: 'Papel Vazio', 
  4: 'Toner Baixo',
  8: 'Toner Vazio',
  16: 'Tampa Aberta',
  32: 'Papel Atolado',
  64: 'Offline',
  128: 'Manutenção Necessária'
};

// Detalhes específicos dos erros para melhor entendimento
const ERROR_DETAILS = {
  'Papel Baixo': {
    severity: 'warning',
    action: 'Adicionar papel na bandeja principal',
    description: 'A bandeja de papel está quase vazia'
  },
  'Papel Vazio': {
    severity: 'critical',
    action: 'Recarregar papel na bandeja imediatamente',
    description: 'Não há papel suficiente para continuar imprimindo'
  },
  'Toner Baixo': {
    severity: 'warning', 
    action: 'Solicitar novo toner ao almoxarifado',
    description: 'O toner está terminando, trocar em breve'
  },
  'Toner Vazio': {
    severity: 'critical',
    action: 'Trocar cartucho de toner urgentemente',
    description: 'Impossível imprimir sem toner'
  },
  'Tampa Aberta': {
    severity: 'error',
    action: 'Fechar todas as tampas da impressora',
    description: 'Uma ou mais tampas estão abertas'
  },
  'Papel Atolado': {
    severity: 'critical',
    action: 'Remover papel atolado seguindo manual',
    description: 'Há papel preso no mecanismo da impressora'
  },
  'Offline': {
    severity: 'error',
    action: 'Verificar conexão de rede e energia',
    description: 'Impressora não está respondendo na rede'
  },
  'Manutenção Necessária': {
    severity: 'warning',
    action: 'Contatar suporte técnico',
    description: 'A impressora precisa de manutenção preventiva'
  }
} as const;

interface ErrorDetail {
  error: string;
  severity: 'warning' | 'error' | 'critical';
  action: string;
  description: string;
}

interface PrinterStatusInfo {
  id: number;
  ip: string;
  sigla: string;
  status: string;
  errorState: string;
  errors: string[];
  errorDetails: ErrorDetail[];
  tonerLevel?: number;
  paperStatus: string;
  isOnline: boolean;
  lastChecked: string;
  uptime?: string;
  pageCount?: number;
  hasCriticalErrors: boolean;
}

async function checkPrinterStatus(printer: any): Promise<PrinterStatusInfo> {
  return new Promise((resolve) => {
    // SNMP temporariamente desabilitado - retornar status básico
    resolve({
      id: printer.id,
      ip: printer.ip || 'N/A',
      sigla: printer.sigla,
      status: 'snmp-disabled',
      errorState: 'snmp-disabled',
      errors: ['Verificação SNMP desabilitada'],
      errorDetails: [{
        error: 'Verificação SNMP desabilitada',
        severity: 'warning',
        action: 'Usar agente local para monitoramento',
        description: 'Módulo SNMP não disponível no momento'
      }],
      paperStatus: 'unknown',
      isOnline: false,
      lastChecked: new Date().toISOString(),
      hasCriticalErrors: false
    });
    
    /* CÓDIGO SNMP TEMPORARIAMENTE COMENTADO
    // Verificar se o IP é válido
    if (!printer.ip || printer.ip === 'não informado' || printer.ip.trim() === '') {
      resolve({
        id: printer.id,
        ip: printer.ip || 'N/A',
        sigla: printer.sigla,
        status: 'no-ip',
        errorState: 'no-ip',
        errors: ['IP não informado no cadastro'],
        errorDetails: [{
          error: 'IP não informado no cadastro',
          severity: 'error',
          action: 'Configurar IP válido no sistema',
          description: 'Impressora não pode ser monitorada sem endereço IP'
        }],
        paperStatus: 'unknown',
        isOnline: false,
        lastChecked: new Date().toISOString(),
        hasCriticalErrors: false
      });
      return;
    }

    const session = snmp.createSession(printer.ip, "public", {
    */
  });
}

// FUNÇÃO SNMP TEMPORARIAMENTE COMENTADA
/* 
// Tentar consultas mais específicas baseadas no tipo de impressora
function attemptAdvancedQuery(session: any, printer: any, statusInfo: PrinterStatusInfo, resolve: Function) {
  // Implementação SNMP comentada
}
*/


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Verificar se temos dados do agente local primeiro
    let cachedStatus;
    try {
      // Tentar importar dinamicamente a função do agente local
      const agentModule = await import('./printer-status-from-agent');
      cachedStatus = agentModule.getCachedPrinterStatus();
      
      if (cachedStatus.data && !cachedStatus.isStale) {
        console.log(`[Hybrid] Retornando dados do agente local (${cachedStatus.age}s atrás)`);
        return res.status(200).json({
          ...cachedStatus.data,
          source: 'local-agent',
          dataAge: cachedStatus.age
        });
      }
    } catch (importError) {
      console.log('[Hybrid] Agente local não disponível, usando verificação SNMP padrão');
      cachedStatus = { data: null, isStale: true, age: 0 };
    }

    // Se não temos dados do agente ou estão desatualizados, usar verificação local
    console.log(cachedStatus.data 
      ? `[Hybrid] Dados do agente desatualizados (${cachedStatus.age}s), usando verificação local`
      : '[Hybrid] Nenhum dado do agente disponível, usando verificação local'
    );

    // Buscar todas as impressoras
    const allPrinters = await prisma.printer.findMany();
    
    if (allPrinters.length === 0) {
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        total: 0,
        withIssues: 0,
        printers: []
      });
    }

    // Filtrar impressoras com IPs válidos e inválidos
    const printersWithValidIPs = allPrinters.filter(p => 
      p.ip && p.ip.trim() !== '' && p.ip !== 'não informado'
    );
    
    const printersWithInvalidIPs = allPrinters.filter(p => 
      !p.ip || p.ip.trim() === '' || p.ip === 'não informado'
    );

    console.log(`Verificando status de ${allPrinters.length} impressoras (${printersWithValidIPs.length} com IP válido, ${printersWithInvalidIPs.length} sem IP)...`);

    // Verificar status das impressoras com IP válido
    const statusPromises = printersWithValidIPs.map(printer => checkPrinterStatus(printer));
    
    // Adicionar impressoras sem IP como "problemas de configuração"
    const invalidIPStatuses = printersWithInvalidIPs.map(printer => ({
      id: printer.id,
      ip: printer.ip || 'N/A',
      sigla: printer.sigla,
      status: 'no-ip-configured',
      errorState: 'configuration-error',
      errors: ['IP não configurado no sistema'],
      errorDetails: [{
        error: 'IP não configurado no sistema',
        severity: 'error' as const,
        action: 'Configurar endereço IP válido no cadastro da impressora',
        description: 'Impossível monitorar impressora sem endereço IP'
      }],
      paperStatus: 'unknown',
      isOnline: false,
      lastChecked: new Date().toISOString(),
      hasCriticalErrors: false
    }));

    const validIPResults = await Promise.all(statusPromises);
    const statusResults = [...validIPResults, ...invalidIPStatuses];

    // Filtrar impressoras com problemas
    const printersWithIssues = statusResults.filter(printer => 
      !printer.isOnline || 
      printer.errors.some(error => error !== 'No Error') ||
      printer.status === 'offline' ||
      printer.status === 'stopped printing'
    );

    console.log(`[Local] Status verificado: ${statusResults.length} impressoras, ${printersWithIssues.length} com problemas`);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      total: statusResults.length,
      withIssues: printersWithIssues.length,
      printers: statusResults,
      source: 'vercel-snmp',
      fallback: cachedStatus && cachedStatus.data ? 'stale-agent-data' : 'no-agent-data'
    });

  } catch (error) {
    console.error('Erro ao verificar status das impressoras:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar status das impressoras',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}