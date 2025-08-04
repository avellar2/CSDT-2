import { NextApiRequest, NextApiResponse } from 'next';
const snmp = require('net-snmp');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ip } = req.query;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'IP é obrigatório' });
  }

  const diagnostics = {
    ip,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    server: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    tests: [] as any[]
  };

  try {
    // Teste 1: Verificar se consegue criar sessão SNMP
    diagnostics.tests.push({
      test: 'SNMP Session Creation',
      status: 'attempting',
      details: 'Tentando criar sessão SNMP...'
    });

    const session = snmp.createSession(ip, "public", {
      timeout: 10000, // Timeout maior para produção
      retries: 2,     // Mais tentativas
      transport: "udp4",
      sourceAddress: "0.0.0.0" // Bind em todas as interfaces
    });

    // Teste 2: OID básico do sistema
    const basicOid = '1.3.6.1.2.1.1.1.0'; // sysDescr
    
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        try {
          session.close();
        } catch (e) {}
        reject(new Error('Timeout após 15 segundos'));
      }, 15000);

      session.get([basicOid], (error: any, varbinds: any[]) => {
        clearTimeout(timeoutId);
        
        if (error) {
          diagnostics.tests.push({
            test: 'Basic SNMP Query',
            status: 'failed',
            error: error.message,
            errorCode: error.code,
            details: `Erro ao consultar ${basicOid}: ${error.message}`
          });
          
          // Analisar tipo de erro
          if (error.message.includes('ENOTFOUND')) {
            diagnostics.tests.push({
              test: 'DNS Resolution',
              status: 'failed',
              details: 'IP não encontrado na rede - problema de DNS ou conectividade'
            });
          } else if (error.message.includes('timeout')) {
            diagnostics.tests.push({
              test: 'Network Timeout',
              status: 'failed',
              details: 'Timeout na conexão - firewall ou impressora não responde SNMP'
            });
          } else if (error.message.includes('forcibly closed') || error.message.includes('ECONNRESET')) {
            diagnostics.tests.push({
              test: 'Connection Reset',
              status: 'failed',
              details: 'Conexão rejeitada - SNMP pode estar desabilitado ou bloqueado'
            });
          }
          
          reject(error);
        } else {
          diagnostics.tests.push({
            test: 'Basic SNMP Query',
            status: 'success',
            details: `Sucesso ao consultar ${basicOid}`,
            result: varbinds[0]?.value?.toString() || 'Valor vazio'
          });
          
          resolve(varbinds);
        }
        
        try {
          session.close();
        } catch (e) {}
      });
    });

    // Se chegou até aqui, SNMP está funcionando
    diagnostics.tests.push({
      test: 'Overall SNMP Connectivity',
      status: 'success',
      details: 'SNMP está funcionando corretamente'
    });

  } catch (error: any) {
    diagnostics.tests.push({
      test: 'Overall SNMP Connectivity',
      status: 'failed',
      error: error.message,
      details: `Falha geral na conectividade SNMP: ${error.message}`
    });

    // Diagnósticos adicionais baseado no ambiente
    if (process.env.NODE_ENV === 'production') {
      diagnostics.tests.push({
        test: 'Production Environment Check',
        status: 'info',
        details: 'Em produção: verifique se o servidor tem acesso à rede das impressoras'
      });
    }
  }

  // Adicionar sugestões baseadas nos resultados
  const suggestions = [];
  
  if (diagnostics.tests.some(t => t.error?.includes('ENOTFOUND'))) {
    suggestions.push('Verificar se o IP da impressora está correto e acessível da rede do servidor');
  }
  
  if (diagnostics.tests.some(t => t.error?.includes('timeout'))) {
    suggestions.push('Verificar firewall, SNMP habilitado na impressora, e conectividade de rede');
  }
  
  if (diagnostics.tests.some(t => t.error?.includes('forcibly closed'))) {
    suggestions.push('SNMP pode estar desabilitado na impressora ou usando community string diferente');
  }

  if (process.env.NODE_ENV === 'production') {
    suggestions.push('Em produção: confirmar que o servidor está na mesma rede/VLAN das impressoras');
  }

  res.status(200).json({
    success: diagnostics.tests.some(t => t.status === 'success'),
    diagnostics,
    suggestions
  });
}