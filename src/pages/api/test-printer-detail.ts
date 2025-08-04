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

  try {
    const session = snmp.createSession(ip, "public", {
      timeout: 5000,
      retries: 1,
      transport: "udp4"
    });

    // OIDs para testar com mais detalhes sobre consumíveis
    const testOids = [
      '1.3.6.1.2.1.1.1.0',           // sysDescr
      '1.3.6.1.2.1.25.3.2.1.5.1',   // hrDeviceStatus  
      '1.3.6.1.2.1.25.3.5.1.1.1',   // hrPrinterStatus
      '1.3.6.1.2.1.25.3.5.1.2.1',   // hrPrinterDetectedErrorState
      
      // Consumíveis - níveis
      '1.3.6.1.2.1.43.11.1.1.9.1.1', // Nível consumível 1
      '1.3.6.1.2.1.43.11.1.1.9.1.2', // Nível consumível 2
      '1.3.6.1.2.1.43.11.1.1.9.1.3', // Nível consumível 3
      '1.3.6.1.2.1.43.11.1.1.9.1.4', // Nível consumível 4
      
      // Consumíveis - descrições
      '1.3.6.1.2.1.43.11.1.1.6.1.1', // Descrição consumível 1
      '1.3.6.1.2.1.43.11.1.1.6.1.2', // Descrição consumível 2
      '1.3.6.1.2.1.43.11.1.1.6.1.3', // Descrição consumível 3
      '1.3.6.1.2.1.43.11.1.1.6.1.4', // Descrição consumível 4
      
      // Consumíveis - capacidade máxima
      '1.3.6.1.2.1.43.11.1.1.8.1.1', // Capacidade máxima consumível 1
      '1.3.6.1.2.1.43.11.1.1.8.1.2', // Capacidade máxima consumível 2
      
      // Consumíveis - tipo
      '1.3.6.1.2.1.43.11.1.1.3.1.1', // Tipo consumível 1 (3=toner, 4=ink, etc)
      '1.3.6.1.2.1.43.11.1.1.3.1.2', // Tipo consumível 2
      
      // Papel
      '1.3.6.1.2.1.43.8.2.1.10.1.1', // Status bandeja papel 1
      '1.3.6.1.2.1.43.8.2.1.10.1.2', // Status bandeja papel 2
    ];

    session.get(testOids, (error: any, varbinds: any[]) => {
      session.close();

      if (error) {
        return res.status(500).json({ 
          error: 'Erro SNMP', 
          details: error.message,
          ip 
        });
      }

      const results: any = { ip, timestamp: new Date().toISOString(), oids: {} };

      varbinds.forEach((vb: any, index: number) => {
        const oidName = [
          'sysDescr',
          'hrDeviceStatus', 
          'hrPrinterStatus',
          'hrPrinterDetectedErrorState',
          
          // Níveis
          'consumivel1_nivel',
          'consumivel2_nivel',
          'consumivel3_nivel', 
          'consumivel4_nivel',
          
          // Descrições
          'consumivel1_descricao',
          'consumivel2_descricao',
          'consumivel3_descricao',
          'consumivel4_descricao',
          
          // Capacidades
          'consumivel1_capacidade',
          'consumivel2_capacidade',
          
          // Tipos
          'consumivel1_tipo',
          'consumivel2_tipo',
          
          // Papel
          'papel_bandeja1_status',
          'papel_bandeja2_status'
        ][index];

        if (snmp.isVarbindError(vb)) {
          results.oids[oidName] = {
            error: snmp.varbindError(vb),
            oid: testOids[index]
          };
        } else {
          results.oids[oidName] = {
            value: vb.value,
            type: typeof vb.value,
            oid: testOids[index]
          };

          // Interpretações específicas
          if (oidName === 'hrDeviceStatus') {
            const statusCodes = {
              1: 'unknown',
              2: 'running', 
              3: 'warning',
              4: 'testing',
              5: 'down'
            };
            results.oids[oidName].interpretation = statusCodes[parseInt(vb.value) as keyof typeof statusCodes] || 'unknown';
          }

          if (oidName === 'hrPrinterDetectedErrorState') {
            const errorCode = parseInt(vb.value);
            const errorBits = [];
            if (errorCode & 1) errorBits.push('Low Paper');
            if (errorCode & 2) errorBits.push('No Paper');
            if (errorCode & 4) errorBits.push('Low Toner');
            if (errorCode & 8) errorBits.push('No Toner');
            if (errorCode & 16) errorBits.push('Door Open');
            if (errorCode & 32) errorBits.push('Jammed');
            if (errorCode & 64) errorBits.push('Offline');
            if (errorCode & 128) errorBits.push('Service Requested');
            
            results.oids[oidName].errorBits = errorBits;
            results.oids[oidName].rawErrorCode = errorCode;
          }

          // Interpretar tipos de consumíveis
          if (oidName.includes('_tipo')) {
            const typeCode = parseInt(vb.value);
            const consumibleTypes = {
              1: 'Other',
              2: 'Unknown', 
              3: 'Toner',
              4: 'Waste Toner',
              5: 'Ink',
              6: 'Ink Cartridge',
              7: 'Ink Ribbon',
              8: 'Waste Ink',
              9: 'OPC',
              10: 'Developer',
              11: 'Fuser Oil',
              12: 'Solid Wax',
              13: 'Ribbon Wax',
              14: 'Waste Wax'
            };
            results.oids[oidName].interpretation = consumibleTypes[typeCode as keyof typeof consumibleTypes] || `Tipo ${typeCode}`;
          }

          // Calcular porcentagem real para níveis de consumíveis
          if (oidName.includes('_nivel')) {
            const level = parseInt(vb.value);
            const consumibleNumber = oidName.match(/consumivel(\d)_nivel/)?.[1];
            
            if (consumibleNumber) {
              const capacityField = `consumivel${consumibleNumber}_capacidade`;
              const capacity = results.oids[capacityField]?.value;
              
              if (capacity && capacity > 0) {
                const percentage = Math.round((level / capacity) * 100);
                results.oids[oidName].percentage = percentage;
              }
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: results
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao testar impressora',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      ip
    });
  }
}