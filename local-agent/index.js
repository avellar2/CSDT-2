require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const winston = require('winston');
const snmp = require('net-snmp');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuração do Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Configurações
const config = {
  vercelAppUrl: process.env.VERCEL_APP_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || 'default-key',
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30,
  localPort: parseInt(process.env.LOCAL_PORT) || 3001,
  snmpTimeout: parseInt(process.env.SNMP_TIMEOUT) || 5000,
  snmpRetries: parseInt(process.env.SNMP_RETRIES) || 2,
  snmpCommunity: process.env.SNMP_COMMUNITY || 'public'
};

// OIDs das impressoras (copiado do código original)
const PRINTER_OIDs = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysContact: '1.3.6.1.2.1.1.4.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  sysLocation: '1.3.6.1.2.1.1.6.0',
  hrDeviceStatus: '1.3.6.1.2.1.25.3.2.1.5.1',
  hrPrinterStatus: '1.3.6.1.2.1.25.3.5.1.1.1',
  hrPrinterDetectedErrorState: '1.3.6.1.2.1.25.3.5.1.2.1',
  ifInOctets: '1.3.6.1.2.1.2.2.1.10.1',
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16.1',
  xeroxSuppliesLevel: '1.3.6.1.4.1.253.8.53.13.2.2.1.6',
  xeroxSuppliesName: '1.3.6.1.4.1.253.8.53.13.2.2.1.5',
  prtMarkerSuppliesLevel: '1.3.6.1.2.1.43.11.1.1.9',
  prtMarkerSuppliesType: '1.3.6.1.2.1.43.11.1.1.3',
  prtMarkerSuppliesDescription: '1.3.6.1.2.1.43.11.1.1.6',
};

const PRINTER_STATUS = {
  1: 'outro',
  2: 'desconhecido', 
  3: 'aguardando',
  4: 'imprimindo',
  5: 'aquecendo',
  6: 'impressão parada',
  7: 'offline'
};

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
};

class LocalAgent {
  constructor() {
    this.app = express();
    this.setupExpress();
    this.lastCheckResults = [];
    this.isRunning = false;
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());

    // Endpoint de status do agente
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        lastCheck: this.lastCheckResults.length > 0 ? this.lastCheckResults[0]?.timestamp : null,
        totalPrinters: this.lastCheckResults.length,
        config: {
          vercelAppUrl: config.vercelAppUrl,
          checkInterval: config.checkInterval,
          localPort: config.localPort
        }
      });
    });

    // Endpoint para forçar verificação manual
    this.app.post('/check-now', async (req, res) => {
      try {
        logger.info('Verificação manual solicitada');
        await this.checkAllPrinters();
        res.json({ success: true, message: 'Verificação executada com sucesso' });
      } catch (error) {
        logger.error('Erro na verificação manual:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Endpoint para ver últimos resultados
    this.app.get('/last-results', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        results: this.lastCheckResults
      });
    });
  }

  async getPrintersFromVercel() {
    try {
      const response = await axios.get(`${config.vercelAppUrl}/api/printers`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'User-Agent': 'CSDT2-LocalAgent/1.0'
        },
        timeout: 10000
      });
      
      logger.info(`Obtidas ${response.data.length} impressoras da Vercel`);
      return response.data;
    } catch (error) {
      logger.error('Erro ao obter impressoras da Vercel:', error.message);
      throw error;
    }
  }

  async checkPrinterStatus(printer) {
    return new Promise((resolve) => {
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
          hasCriticalErrors: false,
          source: 'local-agent'
        });
        return;
      }

      const session = snmp.createSession(printer.ip, config.snmpCommunity, {
        timeout: config.snmpTimeout,
        retries: config.snmpRetries,
        transport: "udp4",
        sourceAddress: "0.0.0.0"
      });

      const basicOids = [
        PRINTER_OIDs.sysDescr,
        PRINTER_OIDs.sysUpTime,
        PRINTER_OIDs.hrDeviceStatus
      ];

      session.get(basicOids, (error, varbinds) => {
        let statusInfo = {
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
          hasCriticalErrors: false,
          source: 'local-agent'
        };

        if (error) {
          logger.warn(`Erro SNMP para impressora ${printer.ip}: ${error.message}`);
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

          varbinds.forEach((vb) => {
            if (snmp.isVarbindError(vb)) {
              return;
            }

            try {
              switch (vb.oid) {
                case PRINTER_OIDs.sysDescr:
                  const desc = vb.value.toString().toLowerCase();
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
                    case 2: 
                    case 3: 
                      statusInfo.status = 'funcionando'; 
                      statusInfo.errors = ['Sem Erro'];
                      statusInfo.errorDetails = [];
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
              logger.warn(`Erro ao processar OID ${vb.oid}:`, vbError);
            }
          });

          this.attemptAdvancedQuery(session, printer, statusInfo, resolve);
        } catch (parseError) {
          logger.error(`Erro ao processar dados SNMP para ${printer.ip}:`, parseError);
          statusInfo.errors = ['Erro ao processar resposta SNMP'];
          session.close();
          resolve(statusInfo);
        }
      });

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
          hasCriticalErrors: false,
          source: 'local-agent'
        });
      }, config.snmpTimeout + 1000);
    });
  }

  attemptAdvancedQuery(session, printer, statusInfo, resolve) {
    const advancedOids = [
      PRINTER_OIDs.hrPrinterStatus,
      PRINTER_OIDs.hrPrinterDetectedErrorState
    ];

    session.get(advancedOids, (error, varbinds) => {
      if (!error) {
        varbinds.forEach((vb) => {
          if (!snmp.isVarbindError(vb)) {
            try {
              switch (vb.oid) {
                case PRINTER_OIDs.hrPrinterStatus:
                  const printerStatus = parseInt(vb.value);
                  const newStatus = PRINTER_STATUS[printerStatus];
                  if (newStatus) {
                    statusInfo.status = newStatus;
                  }
                  break;

                case PRINTER_OIDs.hrPrinterDetectedErrorState:
                  const errorCode = parseInt(vb.value);
                  if (errorCode > 0) {
                    const errors = [];
                    const errorDetails = [];
                    
                    Object.entries(ERROR_STATES).forEach(([bit, description]) => {
                      const bitValue = parseInt(bit);
                      if (errorCode & bitValue && bitValue > 0) {
                        errors.push(description);
                        
                        const detail = ERROR_DETAILS[description];
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
                      statusInfo.hasCriticalErrors = errorDetails.some(
                        detail => detail.severity === 'critical'
                      );
                    }
                  }
                  break;
              }
            } catch (e) {
              logger.warn(`Erro ao processar OID avançado ${vb.oid}:`, e);
            }
          }
        });
      }

      session.close();
      resolve(statusInfo);
    });
  }

  async sendStatusToVercel(statusResults) {
    try {
      const response = await axios.post(`${config.vercelAppUrl}/api/printer-status-from-agent`, {
        timestamp: new Date().toISOString(),
        total: statusResults.length,
        withIssues: statusResults.filter(p => !p.isOnline || p.errors.some(error => error !== 'Sem Erro')).length,
        printers: statusResults,
        agentInfo: {
          version: '1.0.0',
          location: 'local-network'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CSDT2-LocalAgent/1.0'
        },
        timeout: 15000
      });

      logger.info(`Status enviado para Vercel com sucesso. Response: ${response.status}`);
      return true;
    } catch (error) {
      logger.error('Erro ao enviar status para Vercel:', error.message);
      return false;
    }
  }

  async checkAllPrinters() {
    try {
      logger.info('Iniciando verificação de impressoras...');
      
      const printers = await this.getPrintersFromVercel();
      if (printers.length === 0) {
        logger.warn('Nenhuma impressora encontrada');
        return;
      }

      logger.info(`Verificando status de ${printers.length} impressoras`);
      const statusPromises = printers.map(printer => this.checkPrinterStatus(printer));
      const statusResults = await Promise.all(statusPromises);

      this.lastCheckResults = statusResults;

      const withIssues = statusResults.filter(p => 
        !p.isOnline || p.errors.some(error => error !== 'Sem Erro')
      ).length;

      logger.info(`Verificação concluída: ${statusResults.length} impressoras, ${withIssues} com problemas`);

      // Enviar resultados para Vercel
      await this.sendStatusToVercel(statusResults);

    } catch (error) {
      logger.error('Erro na verificação de impressoras:', error);
    }
  }

  startScheduler() {
    logger.info(`Iniciando agendador - verificação a cada ${config.checkInterval} segundos`);
    
    // Executar imediatamente na inicialização
    setTimeout(() => this.checkAllPrinters(), 5000);
    
    // Agendar execução periódica
    const cronExpression = `*/${config.checkInterval} * * * * *`;
    cron.schedule(cronExpression, () => {
      if (!this.isRunning) {
        this.isRunning = true;
        this.checkAllPrinters().finally(() => {
          this.isRunning = false;
        });
      }
    });
  }

  start() {
    logger.info('=== CSDT-2 Local Agent Starting ===');
    logger.info(`Configuração:`);
    logger.info(`- Vercel App URL: ${config.vercelAppUrl}`);
    logger.info(`- Check Interval: ${config.checkInterval}s`);
    logger.info(`- Local Port: ${config.localPort}`);
    logger.info(`- SNMP Timeout: ${config.snmpTimeout}ms`);

    this.app.listen(config.localPort, () => {
      logger.info(`Servidor local rodando na porta ${config.localPort}`);
      logger.info(`Status disponível em: http://localhost:${config.localPort}/status`);
    });

    this.startScheduler();
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Inicializar agente
const agent = new LocalAgent();
agent.start();