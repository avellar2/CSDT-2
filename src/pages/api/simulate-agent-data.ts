import { NextApiRequest, NextApiResponse } from 'next';

// Simular dados do agente local para testar o cache
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed - Use POST' });
  }

  try {
    // Dados simulados do agente
    const simulatedAgentData = {
      timestamp: new Date().toISOString(),
      total: 3,
      withIssues: 1,
      printers: [
        {
          id: 1,
          ip: "192.168.1.100",
          sigla: "IMP001",
          status: "funcionando",
          errorState: "Sem Erro",
          errors: ["Sem Erro"],
          errorDetails: [],
          tonerLevel: 75,
          paperStatus: "OK",
          isOnline: true,
          lastChecked: new Date().toISOString(),
          uptime: "5d 12h",
          pageCount: 12550,
          hasCriticalErrors: false,
          source: "local-agent"
        },
        {
          id: 2,
          ip: "192.168.1.101", 
          sigla: "IMP002",
          status: "funcionando",
          errorState: "Toner Baixo",
          errors: ["Toner Baixo"],
          errorDetails: [{
            error: "Toner Baixo",
            severity: "warning" as const,
            action: "Solicitar novo toner ao almoxarifado",
            description: "O toner está terminando, trocar em breve"
          }],
          tonerLevel: 15,
          paperStatus: "OK",
          isOnline: true,
          lastChecked: new Date().toISOString(),
          uptime: "2d 8h",
          pageCount: 8920,
          hasCriticalErrors: false,
          source: "local-agent"
        },
        {
          id: 3,
          ip: "192.168.1.102",
          sigla: "IMP003",
          status: "offline",
          errorState: "Papel Atolado",
          errors: ["Papel Atolado"],
          errorDetails: [{
            error: "Papel Atolado",
            severity: "critical" as const,
            action: "Remover papel atolado seguindo manual",
            description: "Há papel preso no mecanismo da impressora"
          }],
          tonerLevel: 60,
          paperStatus: "Atolado",
          isOnline: false,
          lastChecked: new Date().toISOString(),
          uptime: "1d 3h",
          pageCount: 5430,
          hasCriticalErrors: true,
          source: "local-agent"
        }
      ],
      agentInfo: {
        version: "1.0.0-simulated",
        location: "CSDT-Teste"
      }
    };

    // Fazer POST para o endpoint do agente com dados simulados
    const agentEndpointUrl = `${req.headers.origin || 'http://localhost:3000'}/api/printer-status-from-agent`;
    
    const agentResponse = await fetch(agentEndpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LOCAL_AGENT_API_KEY || 'default-key'}`
      },
      body: JSON.stringify(simulatedAgentData)
    });

    const agentResult = await agentResponse.json();

    if (agentResponse.ok) {
      return res.status(200).json({
        success: true,
        message: 'Dados simulados enviados com sucesso para o cache',
        data: {
          simulatedPrinters: simulatedAgentData.printers.length,
          withIssues: simulatedAgentData.withIssues,
          timestamp: simulatedAgentData.timestamp
        },
        agentResponse: agentResult
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Erro ao enviar dados simulados para o cache',
        agentError: agentResult
      });
    }

  } catch (error) {
    console.error('Erro ao simular dados do agente:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao simular dados do agente',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}