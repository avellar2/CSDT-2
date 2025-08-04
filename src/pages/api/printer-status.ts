import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
const snmp = require('net-snmp');

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
      timeout: 3000,
      retries: 1,
      transport: "udp4"
    });

    // Começar com OIDs mais básicos e universais
    const basicOids = [
      PRINTER_OIDs.sysDescr,
      PRINTER_OIDs.sysUpTime,
      PRINTER_OIDs.hrDeviceStatus
    ];

    session.get(basicOids, (error: any, varbinds: any[]) => {
      let statusInfo: PrinterStatusInfo = {
        id: printer.id,
        ip: printer.ip,
        sigla: printer.sigla,
        status: 'unknown',
        errorState: 'unknown',
        errors: [],
        errorDetails: [],
        paperStatus: 'unknown',
        isOnline: false,
        lastChecked: new Date().toISOString(),
        hasCriticalErrors: false
      };

      if (error) {
        console.error(`Erro SNMP para impressora ${printer.ip}:`, error.message);
        if (error.message.includes('ENOTFOUND')) {
          statusInfo.errors.push('IP não encontrado na rede');
          statusInfo.errorDetails.push({
            error: 'IP não encontrado na rede',
            severity: 'error',
            action: 'Verificar se o IP está correto e se a impressora está ligada',
            description: 'O endereço IP não responde na rede'
          });
        } else if (error.message.includes('timeout')) {
          statusInfo.errors.push('Timeout - impressora não responde');
          statusInfo.errorDetails.push({
            error: 'Timeout - impressora não responde',
            severity: 'error',
            action: 'Verificar se a impressora está ligada e conectada à rede',
            description: 'A impressora não respondeu dentro do tempo limite'
          });
        } else if (error.message.includes('forcibly closed')) {
          statusInfo.errors.push('SNMP não habilitado ou bloqueado');
          statusInfo.errorDetails.push({
            error: 'SNMP não habilitado ou bloqueado',
            severity: 'warning',
            action: 'Habilitar SNMP nas configurações da impressora',
            description: 'O protocolo SNMP não está ativo na impressora'
          });
        } else {
          statusInfo.errors.push('Erro de conexão SNMP');
          statusInfo.errorDetails.push({
            error: 'Erro de conexão SNMP',
            severity: 'error',
            action: 'Verificar conectividade de rede',
            description: 'Falha na comunicação SNMP com a impressora'
          });
        }
        session.close();
        resolve(statusInfo);
        return;
      }

      try {
        statusInfo.isOnline = true;
        statusInfo.status = 'online';
        statusInfo.errors = ['Sem Erro'];
        statusInfo.errorDetails = [];

        varbinds.forEach((vb: any) => {
          if (snmp.isVarbindError(vb)) {
            console.warn(`OID ${vb.oid} não suportado pela impressora ${printer.ip}`);
            return;
          }

          try {
            switch (vb.oid) {
              case PRINTER_OIDs.sysDescr:
                // Detectar tipo de impressora pela descrição e aplicar análise específica
                const desc = vb.value.toString().toLowerCase();
                console.log(`Descrição da impressora ${printer.ip}: ${desc}`);
                
                // Armazenar tipo para uso posterior
                if (desc.includes('xerox')) {
                  statusInfo.status = 'xerox-detected';
                } else if (desc.includes('oki')) {
                  statusInfo.status = 'oki-detected';
                } else if (desc.includes('hp')) {
                  statusInfo.status = 'hp-detected';
                } else {
                  statusInfo.status = 'printer-detected';
                }
                break;

              case PRINTER_OIDs.sysUpTime:
                if (vb.value !== null && vb.value !== undefined) {
                  const uptimeMs = parseInt(vb.value) * 10;
                  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  statusInfo.uptime = `${days}d ${hours}h`;
                }
                break;

              case PRINTER_OIDs.hrDeviceStatus:
                const deviceStatus = parseInt(vb.value);
                switch (deviceStatus) {
                  case 1: 
                    statusInfo.status = 'desconhecido'; 
                    break;
                  case 2: 
                    statusInfo.status = 'funcionando'; 
                    statusInfo.errors = ['Sem Erro'];
                    statusInfo.errorDetails = [];
                    break;
                  case 3: 
                    statusInfo.status = 'funcionando'; 
                    statusInfo.errors = ['Sem Erro'];
                    statusInfo.errorDetails = [];
                    break;
                  case 4: 
                    statusInfo.status = 'testando'; 
                    statusInfo.errors = ['Em Teste'];
                    statusInfo.errorDetails = [{
                      error: 'Em Teste',
                      severity: 'warning',
                      action: 'Aguardar conclusão do teste',
                      description: 'A impressora está executando rotinas de teste interno'
                    }];
                    break;
                  case 5: 
                    statusInfo.status = 'inoperante'; 
                    statusInfo.errors = ['Dispositivo Inoperante'];
                    statusInfo.errorDetails = [{
                      error: 'Dispositivo Inoperante',
                      severity: 'critical',
                      action: 'Verificar impressora imediatamente - pode estar com erro grave',
                      description: 'A impressora está fora de operação e não consegue imprimir'
                    }];
                    statusInfo.hasCriticalErrors = true;
                    break;
                  default: 
                    statusInfo.status = 'outro';
                }
                break;
            }
          } catch (vbError) {
            console.warn(`Erro ao processar OID ${vb.oid}:`, vbError);
          }
        });

        // Tentar obter informações específicas da impressora em uma segunda consulta
        attemptAdvancedQuery(session, printer, statusInfo, resolve);

      } catch (parseError) {
        console.error(`Erro ao processar dados SNMP para ${printer.ip}:`, parseError);
        statusInfo.errors = ['Erro ao processar resposta SNMP'];
        session.close();
        resolve(statusInfo);
      }
    });

    // Timeout de segurança
    setTimeout(() => {
      try {
        session.close();
      } catch (e) {}
      resolve({
        id: printer.id,
        ip: printer.ip,
        sigla: printer.sigla,
        status: 'timeout',
        errorState: 'timeout',
        errors: ['Timeout na consulta SNMP'],
        errorDetails: [{
          error: 'Timeout na consulta SNMP',
          severity: 'error',
          action: 'Verificar se a impressora está ligada e acessível',
          description: 'A impressora não respondeu dentro do tempo limite'
        }],
        paperStatus: 'unknown',
        isOnline: false,
        lastChecked: new Date().toISOString(),
        hasCriticalErrors: false
      });
    }, 5000);
  });
}

// Tentar consultas mais específicas baseadas no tipo de impressora
function attemptAdvancedQuery(session: any, printer: any, statusInfo: PrinterStatusInfo, resolve: Function) {
  const advancedOids = [
    PRINTER_OIDs.hrPrinterStatus,
    PRINTER_OIDs.hrPrinterDetectedErrorState
  ];

  session.get(advancedOids, (error: any, varbinds: any[]) => {
    if (error) {
      statusInfo.paperStatus = 'unknown';
      statusInfo.tonerLevel = undefined;
    } else {
      varbinds.forEach((vb: any) => {
        if (!snmp.isVarbindError(vb)) {
          try {
            switch (vb.oid) {
              case PRINTER_OIDs.hrPrinterStatus:
                const printerStatus = parseInt(vb.value);
                const newStatus = PRINTER_STATUS[printerStatus as keyof typeof PRINTER_STATUS];
                if (newStatus) {
                  statusInfo.status = newStatus;
                }
                break;

              case PRINTER_OIDs.hrPrinterDetectedErrorState:
                const errorCode = parseInt(vb.value);
                if (errorCode > 0) {
                  const errors: string[] = [];
                  const errorDetails: ErrorDetail[] = [];
                  
                  Object.entries(ERROR_STATES).forEach(([bit, description]) => {
                    const bitValue = parseInt(bit);
                    if (errorCode & bitValue && bitValue > 0) {
                      errors.push(description);
                      
                      // Adicionar detalhes do erro se disponível
                      const detail = ERROR_DETAILS[description as keyof typeof ERROR_DETAILS];
                      if (detail) {
                        errorDetails.push({
                          error: description,
                          severity: detail.severity,
                          action: detail.action,
                          description: detail.description
                        });
                      }
                    }
                  });
                  
                  if (errors.length > 0) {
                    statusInfo.errors = errors;
                    statusInfo.errorDetails = errorDetails;
                    
                    // Verificar se há erros críticos
                    statusInfo.hasCriticalErrors = errorDetails.some(
                      detail => detail.severity === 'critical'
                    );
                  }
                }
                break;
            }
          } catch (e) {
            console.warn(`Erro ao processar OID avançado ${vb.oid}:`, e);
          }
        }
      });
    }

    session.close();
    resolve(statusInfo);
  });
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
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

    console.log(`Status verificado: ${statusResults.length} impressoras, ${printersWithIssues.length} com problemas`);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      total: statusResults.length,
      withIssues: printersWithIssues.length,
      printers: statusResults
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