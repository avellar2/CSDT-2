const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 CSDT-2 Local Agent - Setup Wizard');
  console.log('=====================================\n');

  // Gerar API Key segura
  const apiKey = crypto.randomBytes(32).toString('hex');
  console.log('🔐 API Key gerada automaticamente:', apiKey);
  console.log('⚠️  IMPORTANTE: Adicione esta chave nas variáveis de ambiente da Vercel!\n');

  // Solicitar URL da Vercel
  const vercelUrl = await question('🌐 Digite a URL da sua aplicação na Vercel (ex: https://sua-app.vercel.app): ');
  
  // Solicitar intervalo de verificação
  const checkInterval = await question('⏱️  Intervalo de verificação em segundos [30]: ') || '30';
  
  // Solicitar porta local
  const localPort = await question('🔌 Porta do servidor local [3001]: ') || '3001';

  // Configurações SNMP
  const snmpTimeout = await question('⏳ Timeout SNMP em milissegundos [5000]: ') || '5000';
  const snmpRetries = await question('🔄 Tentativas SNMP [2]: ') || '2';
  const snmpCommunity = await question('🏘️  Community string SNMP [public]: ') || 'public';

  // Nível de log
  const logLevel = await question('📝 Nível de log (error/warn/info/debug) [info]: ') || 'info';

  // Criar conteúdo do .env
  const envContent = `# CSDT-2 Local Agent Configuration
# Generated on ${new Date().toISOString()}

# URL da sua aplicação na Vercel
VERCEL_APP_URL=${vercelUrl}

# Chave de API para autenticar com sua aplicação
API_KEY=${apiKey}

# Intervalo de verificação em segundos
CHECK_INTERVAL=${checkInterval}

# Porta do servidor local
LOCAL_PORT=${localPort}

# Timeout SNMP em milissegundos
SNMP_TIMEOUT=${snmpTimeout}

# Número de tentativas SNMP
SNMP_RETRIES=${snmpRetries}

# Community string SNMP
SNMP_COMMUNITY=${snmpCommunity}

# Log level (error, warn, info, debug)
LOG_LEVEL=${logLevel}
`;

  // Salvar arquivo .env
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ Arquivo .env criado com sucesso!');

  // Criar pasta de logs
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
    console.log('📁 Pasta de logs criada');
  }

  console.log('\n📋 Próximos passos:');
  console.log('==================');
  console.log('1. Adicione esta variável de ambiente na Vercel:');
  console.log(`   LOCAL_AGENT_API_KEY=${apiKey}`);
  console.log('\n2. Instale as dependências:');
  console.log('   npm install');
  console.log('\n3. Teste o agente:');
  console.log('   npm run dev');
  console.log('\n4. Para instalar como serviço Windows (execute como Admin):');
  console.log('   npm run install-service');
  console.log('\n5. Verifique o status em:');
  console.log(`   http://localhost:${localPort}/status`);

  console.log('\n🎯 Configuração concluída com sucesso!');
  rl.close();
}

// Verificar se já existe .env
if (fs.existsSync('.env')) {
  console.log('⚠️  Arquivo .env já existe!');
  rl.question('Deseja sobrescrever? (s/N): ', (answer) => {
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
      setup();
    } else {
      console.log('❌ Setup cancelado.');
      rl.close();
    }
  });
} else {
  setup();
}