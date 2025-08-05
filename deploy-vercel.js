const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 CSDT-2 - Deploy para Vercel com Suporte Híbrido');
console.log('===================================================\n');

// Verificar se as modificações híbridas estão presentes
function checkHybridFiles() {
  const requiredFiles = [
    'src/pages/api/printer-status-from-agent.ts',
    'local-agent/package.json',
    'local-agent/index.js',
    'GUIA-INSTALACAO-HIBRIDA.md'
  ];

  console.log('📋 Verificando arquivos híbridos...');
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Arquivos híbridos faltando:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  
  console.log('✅ Todos os arquivos híbridos presentes\n');
}

// Verificar se existe package.json válido
function checkPackageJson() {
  console.log('📦 Verificando package.json...');
  
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json não encontrado!');
    process.exit(1);
  }
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!pkg.dependencies['@prisma/client']) {
    console.error('❌ @prisma/client não encontrado nas dependências!');
    process.exit(1);
  }
  
  console.log('✅ package.json válido\n');
}

// Verificar se as modificações na API printer-status foram feitas
function checkApiModifications() {
  console.log('🔧 Verificando modificações na API...');
  
  const apiFile = 'src/pages/api/printer-status.ts';
  const content = fs.readFileSync(apiFile, 'utf8');
  
  if (!content.includes('getCachedPrinterStatus')) {
    console.error('❌ API printer-status.ts não foi modificada para suporte híbrido!');
    console.error('   Execute primeiro as modificações necessárias.');
    process.exit(1);
  }
  
  console.log('✅ API modificada para suporte híbrido\n');
}

// Preparar build
function prepareBuild() {
  console.log('🏗️  Preparando build...');
  
  try {
    // Instalar dependências
    console.log('   Instalando dependências...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Gerar cliente Prisma
    console.log('   Gerando cliente Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Build do Next.js
    console.log('   Fazendo build do Next.js...');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('✅ Build preparado com sucesso\n');
  } catch (error) {
    console.error('❌ Erro no build:', error.message);
    process.exit(1);
  }
}

// Mostrar informações importantes
function showDeployInfo() {
  console.log('📝 INFORMAÇÕES IMPORTANTES PARA O DEPLOY:');
  console.log('=========================================\n');
  
  console.log('🔐 VARIÁVEIS DE AMBIENTE NECESSÁRIAS NA VERCEL:');
  console.log('------------------------------------------------');
  console.log('DATABASE_URL=sua-connection-string-postgresql');
  console.log('DIRECT_URL=sua-direct-connection-string');
  console.log('NEXT_PUBLIC_SUPABASE_URL=sua-supabase-url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-supabase-key');
  console.log('LOCAL_AGENT_API_KEY=sua-chave-secreta-forte');
  console.log('');
  
  console.log('💡 NOVA VARIÁVEL HÍBRIDA:');
  console.log('LOCAL_AGENT_API_KEY - Chave para comunicação com agente local');
  console.log('Gere uma chave forte: node -p "require(\'crypto\').randomBytes(32).toString(\'hex\')"');
  console.log('');
  
  console.log('🏠 APÓS O DEPLOY:');
  console.log('-----------------');
  console.log('1. Configure o agente local: cd local-agent && npm run setup');
  console.log('2. Use a mesma LOCAL_AGENT_API_KEY nos dois lugares');
  console.log('3. Instale como serviço: npm run install-service');
  console.log('4. Teste: npm run test-connection');
  console.log('');
  
  console.log('📊 FUNCIONALIDADES HÍBRIDAS:');
  console.log('-----------------------------');
  console.log('✅ Monitoramento SNMP local via agente');
  console.log('✅ Fallback para SNMP da Vercel');
  console.log('✅ Cache inteligente (5 minutos)');
  console.log('✅ Interface mostra origem dos dados');
  console.log('✅ Instalação como serviço Windows');
  console.log('');
}

// Executar verificações
function runChecks() {
  checkHybridFiles();
  checkPackageJson();
  checkApiModifications();
  prepareBuild();
  showDeployInfo();
  
  console.log('🎉 PRONTO PARA DEPLOY!');
  console.log('======================');
  console.log('Execute:');
  console.log('1. vercel --prod (ou use a interface da Vercel)');
  console.log('2. Configure as variáveis de ambiente');
  console.log('3. Configure o agente local na sua rede');
  console.log('');
  console.log('📖 Consulte: GUIA-INSTALACAO-HIBRIDA.md para detalhes');
}

// Executar script
try {
  runChecks();
} catch (error) {
  console.error('❌ Erro durante preparação:', error.message);
  process.exit(1);
}