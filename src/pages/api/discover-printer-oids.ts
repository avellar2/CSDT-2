import { NextApiRequest, NextApiResponse } from 'next';
const snmp = require('net-snmp');

// OIDs amplos para descoberta - vamos tentar vários padrões
const DISCOVERY_OIDS = {
  // OIDs padrão RFC 3805
  standard: [
    '1.3.6.1.2.1.43.11.1.1.9.1.1',  // prtMarkerSuppliesLevel.1.1
    '1.3.6.1.2.1.43.11.1.1.9.1.2',  // prtMarkerSuppliesLevel.1.2  
    '1.3.6.1.2.1.43.11.1.1.9.1.3',  // prtMarkerSuppliesLevel.1.3
    '1.3.6.1.2.1.43.11.1.1.9.1.4',  // prtMarkerSuppliesLevel.1.4
    '1.3.6.1.2.1.43.11.1.1.6.1.1',  // prtMarkerSuppliesDescription.1.1
    '1.3.6.1.2.1.43.11.1.1.6.1.2',  // prtMarkerSuppliesDescription.1.2
    '1.3.6.1.2.1.43.11.1.1.6.1.3',  // prtMarkerSuppliesDescription.1.3
    '1.3.6.1.2.1.43.11.1.1.6.1.4',  // prtMarkerSuppliesDescription.1.4
  ],
  
  // Xerox específicos - múltiplas variações
  xerox: [
    '1.3.6.1.4.1.253.8.53.13.2.2.1.6.1.1', // Xerox supplies level
    '1.3.6.1.4.1.253.8.53.13.2.2.1.6.1.2',
    '1.3.6.1.4.1.253.8.53.13.2.2.1.6.1.3', 
    '1.3.6.1.4.1.253.8.53.13.2.2.1.6.1.4',
    '1.3.6.1.4.1.253.8.53.13.2.2.1.5.1.1', // Xerox supplies name
    '1.3.6.1.4.1.253.8.53.13.2.2.1.5.1.2',
    '1.3.6.1.4.1.253.8.53.13.2.2.1.5.1.3',
    '1.3.6.1.4.1.253.8.53.13.2.2.1.5.1.4',
    // Outras variações Xerox
    '1.3.6.1.4.1.253.8.53.4.2.1.3.1.1',
    '1.3.6.1.4.1.253.8.53.4.2.1.3.1.2',
  ],
  
  // HP LaserJet 
  hp: [
    '1.3.6.1.4.1.11.2.3.9.4.2.1.4.1.2.6.0',
    '1.3.6.1.4.1.11.2.3.9.4.2.1.4.1.2.5.0',
    '1.3.6.1.4.1.11.2.3.9.4.2.1.4.1.1.2.1.1',
    '1.3.6.1.4.1.11.2.3.9.4.2.1.1.2.1.1.1.6',
  ],
  
  // OKI múltiplas variações
  oki: [
    '1.3.6.1.4.1.2001.1.1.1.1.11.1.10.13.1.4.1.1',
    '1.3.6.1.4.1.2001.1.1.1.1.11.1.10.13.1.4.1.2', 
    '1.3.6.1.4.1.2001.1.1.1.1.11.1.10.13.1.4.1.3',
    '1.3.6.1.4.1.2001.1.1.1.1.11.1.10.13.1.4.1.4',
    '1.3.6.1.4.1.2001.1.1.1.1.11.1.10.13.1.3.1.1', // OKI names
    '1.3.6.1.4.1.2001.1.1.1.1.11.1.10.13.1.3.1.2',
  ],
  
  // Variações alternativas comuns
  alternative: [
    '1.3.6.1.2.1.43.11.1.1.9.2.1',   // Variação de índice
    '1.3.6.1.2.1.43.11.1.1.9.2.2',
    '1.3.6.1.2.1.43.12.1.1.4.1.1',   // Outras tabelas de consumíveis
    '1.3.6.1.2.1.43.12.1.1.4.1.2',
  ]
};

// Função auxiliar para testar OIDs padrão
function tryStandardOids(session: any, results: any, res: NextApiResponse) {
  const standardOids = [
    '1.3.6.1.2.1.43.11.1.1.9.1.1',  // Standard toner level 1
    '1.3.6.1.2.1.43.11.1.1.9.1.2',  // Standard toner level 2
    '1.3.6.1.2.1.43.11.1.1.9.1.3',  // Standard toner level 3
    '1.3.6.1.2.1.43.11.1.1.9.1.4',  // Standard toner level 4
    '1.3.6.1.2.1.43.11.1.1.6.1.1',  // Standard toner name 1
    '1.3.6.1.2.1.43.11.1.1.6.1.2',  // Standard toner name 2
    '1.3.6.1.2.1.43.11.1.1.6.1.3',  // Standard toner name 3
    '1.3.6.1.2.1.43.11.1.1.6.1.4',  // Standard toner name 4
  ];

  session.get(standardOids, (stdError: any, stdVarbinds: any[]) => {
    session.close();

    if (!stdError && stdVarbinds) {
      // Processar níveis (primeiros 4 OIDs)
      stdVarbinds.slice(0, 4).forEach((vb, index) => {
        if (vb && !snmp.isVarbindError(vb) && vb.value !== null && vb.value !== undefined) {
          const level = parseInt(vb.value);
          
          // Validar se é um valor sensato para nível de consumível
          if (!isNaN(level) && level >= 0 && level <= 10000) {
            // Buscar nome correspondente nos próximos 4 OIDs
            const nameVb = stdVarbinds[4 + index];
            let name = `Consumível ${index + 1}`;
            
            if (nameVb && !snmp.isVarbindError(nameVb) && nameVb.value) {
              name = nameVb.value.toString();
            }
            
            results.consumables.push({
              slot: index + 1,
              name: name,
              level: level,
              type: 'Standard',
              oid: standardOids[index],
              manufacturer_specific: false
            });
          }
        }
      });
    }

    // Se ainda não encontrou nada, tentar variações alternativas
    if (results.consumables.length === 0) {
      tryAlternativeOids(session, results, res);
    } else {
      res.status(200).json({
        success: true,
        data: results
      });
    }
  });
}

// Função auxiliar para testar OIDs alternativos
function tryAlternativeOids(session: any, results: any, res: NextApiResponse) {
  const altOids = DISCOVERY_OIDS.alternative;
  
  session.get(altOids, (altError: any, altVarbinds: any[]) => {
    session.close();

    if (!altError && altVarbinds) {
      altVarbinds.forEach((vb, index) => {
        if (vb && !snmp.isVarbindError(vb) && vb.value !== null && vb.value !== undefined) {
          const level = parseInt(vb.value);
          
          if (!isNaN(level) && level >= 0 && level <= 10000) {
            results.consumables.push({
              slot: index + 1,
              name: `Consumível Alternativo ${index + 1}`,
              level: level,
              type: 'Alternative',
              oid: altOids[index],
              manufacturer_specific: false
            });
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: results
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ip } = req.query;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'IP é obrigatório' });
  }

  try {
    const session = snmp.createSession(ip, "public", {
      timeout: 5000,
      retries: 1,
      transport: "udp4"
    });

    // Primeiro, descobrir o fabricante
    session.get(['1.3.6.1.2.1.1.1.0'], async (error: any, varbinds: any[]) => {
      if (error) {
        session.close();
        return res.status(500).json({ 
          error: 'Erro ao conectar com impressora', 
          details: error.message 
        });
      }

      const sysDescr = varbinds[0]?.value?.toString().toLowerCase() || '';
      let manufacturer = 'unknown';
      
      if (sysDescr.includes('xerox')) manufacturer = 'xerox';
      else if (sysDescr.includes('hp') || sysDescr.includes('hewlett')) manufacturer = 'hp';
      else if (sysDescr.includes('oki')) manufacturer = 'oki';

      const results: any = {
        ip,
        manufacturer,
        sysDescr,
        timestamp: new Date().toISOString(),
        consumables: []
      };

      // Testar primeiro OIDs específicos do fabricante detectado
      let manufacturerOids: string[] = [];
      
      if (manufacturer === 'xerox') {
        manufacturerOids = DISCOVERY_OIDS.xerox;
      } else if (manufacturer === 'hp') {
        manufacturerOids = DISCOVERY_OIDS.hp;
      } else if (manufacturer === 'oki') {
        manufacturerOids = DISCOVERY_OIDS.oki;
      }

      // Se tem OIDs específicos do fabricante, testar primeiro
      if (manufacturerOids.length > 0) {
        console.log(`Testando ${manufacturerOids.length} OIDs específicos para ${manufacturer}`);
        
        session.get(manufacturerOids.slice(0, 10), (manufError: any, manufVarbinds: any[]) => {
          let foundConsumables = false;

          if (!manufError && manufVarbinds) {
            manufVarbinds.forEach((vb: any, index: number) => {
              if (vb && !snmp.isVarbindError(vb) && vb.value !== null && vb.value !== undefined) {
                const level = parseInt(vb.value);
                
                // Filtrar valores válidos (geralmente entre 0-100 ou 0-capacidade máxima)
                if (!isNaN(level) && level >= 0 && level <= 10000) {
                  results.consumables.push({
                    slot: index + 1,
                    name: `${manufacturer.toUpperCase()} Consumível ${index + 1}`,
                    level: level,
                    type: 'Toner/Tinta',
                    oid: manufacturerOids[index],
                    manufacturer_specific: true
                  });
                  foundConsumables = true;
                }
              }
            });
          }

          // Se encontrou com OIDs específicos, retornar
          if (foundConsumables) {
            session.close();
            return res.status(200).json({
              success: true,
              data: results
            });
          }

          // Se não encontrou, tentar OIDs padrão
          tryStandardOids(session, results, res);
        });
      } else {
        // Se não tem fabricante específico, ir direto para padrões
        tryStandardOids(session, results, res);
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao descobrir OIDs da impressora',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}