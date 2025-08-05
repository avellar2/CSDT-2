import { NextApiRequest, NextApiResponse } from 'next';

// Vamos testar se conseguimos acessar os dados do agente
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Tentar importar dinamicamente a função do agente local
    const agentModule = await import('./printer-status-from-agent');
    const cachedStatus = agentModule.getCachedPrinterStatus();
    
    return res.status(200).json({
      success: true,
      hasData: !!cachedStatus.data,
      isStale: cachedStatus.isStale,
      age: cachedStatus.age,
      timestamp: cachedStatus.data?.timestamp,
      totalPrinters: cachedStatus.data?.total || 0,
      debug: 'Test endpoint working'
    });
    
  } catch (importError) {
    return res.status(200).json({
      success: false,
      error: 'Import failed',
      message: importError.message,
      debug: 'Agent module not accessible'
    });
  }
}