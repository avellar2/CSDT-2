require('dotenv').config();
const axios = require('axios');
const snmp = require('net-snmp');

const config = {
  vercelAppUrl: process.env.VERCEL_APP_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || 'default-key',
  snmpCommunity: process.env.SNMP_COMMUNITY || 'public'
};

console.log('🧪 CSDT-2 Local Agent - Teste de Conectividade');
console.log('===============================================\n');

async function testVercelConnection() {
  console.log('🌐 Testando conexão com Vercel...');
  try {
    const response = await axios.get(`${config.vercelAppUrl}/api/printers`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'User-Agent': 'CSDT2-LocalAgent-Test'
      },
      timeout: 10000
    });
    
    console.log('✅ Conexão com Vercel OK');
    console.log(`   Status: ${response.status}`);
    console.log(`   Impressoras encontradas: ${response.data.length}`);
    return response.data;
  } catch (error) {
    console.log('❌ Erro na conexão com Vercel:');
    if (error.code === 'ENOTFOUND') {
      console.log('   URL não encontrada. Verifique VERCEL_APP_URL');
    } else if (error.response?.status === 401) {
      console.log('   API Key inválida. Verifique se está configurada corretamente na Vercel');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   Conexão recusada. Verifique se a aplicação está online');
    } else {
      console.log(`   ${error.message}`);
    }
    return null;
  }
}

async function testSNMP(ip) {
  return new Promise((resolve) => {
    console.log(`📡 Testando SNMP em ${ip}...`);
    
    const session = snmp.createSession(ip, config.snmpCommunity, {
      timeout: 3000,
      retries: 1
    });

    session.get(['1.3.6.1.2.1.1.1.0'], (error, varbinds) => {
      if (error) {
        console.log(`❌ SNMP falhou para ${ip}: ${error.message}`);
        resolve(false);
      } else {
        const desc = varbinds[0].value.toString();
        console.log(`✅ SNMP OK para ${ip}: ${desc.substring(0, 50)}...`);
        resolve(true);
      }
      session.close();
    });

    setTimeout(() => {
      try { session.close(); } catch (e) {}
      console.log(`⏰ Timeout SNMP para ${ip}`);
      resolve(false);
    }, 4000);
  });
}

async function testAgentEndpoint() {
  console.log('📤 Testando envio de dados para Vercel...');
  try {
    const testData = {
      timestamp: new Date().toISOString(),
      total: 1,
      withIssues: 0,
      printers: [{
        id: 999,
        ip: '127.0.0.1',
        sigla: 'TEST',
        status: 'test',
        errorState: 'none',
        errors: ['Test'],
        errorDetails: [],
        paperStatus: 'unknown',
        isOnline: true,
        lastChecked: new Date().toISOString(),
        hasCriticalErrors: false,
        source: 'test'
      }],
      agentInfo: {
        version: '1.0.0-test',
        location: 'test-environment'
      }
    };

    const response = await axios.post(`${config.vercelAppUrl}/api/printer-status-from-agent`, testData, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CSDT2-LocalAgent-Test'
      },
      timeout: 10000
    });

    console.log('✅ Endpoint do agente OK');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${response.data.message}`);
    return true;
  } catch (error) {
    console.log('❌ Erro no endpoint do agente:');
    if (error.response?.status === 401) {
      console.log('   API Key inválida ou não configurada na Vercel');
    } else if (error.response?.status === 404) {
      console.log('   Endpoint não encontrado. Certifique-se que o código foi deployado');
    } else {
      console.log(`   ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log(`Configuração atual:`);
  console.log(`- Vercel URL: ${config.vercelAppUrl}`);
  console.log(`- API Key: ${config.apiKey.substring(0, 8)}...`);
  console.log(`- SNMP Community: ${config.snmpCommunity}\n`);

  // Teste 1: Conexão com Vercel
  const printers = await testVercelConnection();
  console.log('');

  // Teste 2: Endpoint do agente
  await testAgentEndpoint();
  console.log('');

  // Teste 3: SNMP em algumas impressoras (se disponíveis)
  if (printers && printers.length > 0) {
    console.log('📡 Testando conectividade SNMP...');
    const testPrinters = printers.slice(0, 3); // Testar apenas as 3 primeiras
    
    for (const printer of testPrinters) {
      if (printer.ip && printer.ip !== 'não informado') {
        await testSNMP(printer.ip);
      }
    }
  } else {
    console.log('⚠️  Nenhuma impressora disponível para teste SNMP');
  }

  console.log('\n🏁 Testes concluídos!');
  console.log('\nSe todos os testes passaram, o agente está pronto para uso.');
  console.log('Execute: npm start (ou npm run install-service para instalar como serviço)');
}

runTests().catch(console.error);