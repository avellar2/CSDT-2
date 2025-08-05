const fs = require('fs');
const path = require('path');

console.log('🧪 CSDT-2 - Verificação de Prontidão para Deploy');
console.log('===============================================\n');

let allTestsPassed = true;

function fail(message) {
  console.log(`❌ ${message}`);
  allTestsPassed = false;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function warn(message) {
  console.log(`⚠️  ${message}`);
}

// Teste 1: Arquivos híbridos essenciais
console.log('📋 Teste 1: Arquivos híbridos essenciais');
console.log('-----------------------------------------');

const requiredFiles = [
  'src/pages/api/printer-status-from-agent.ts',
  'local-agent/package.json',  
  'local-agent/index.js',
  'local-agent/README.md',
  'vercel.json',
  '.vercelignore'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    pass(`${file} existe`);
  } else {
    fail(`${file} não encontrado`);
  }
});

console.log('');

// Teste 2: Modificações na API principal
console.log('🔧 Teste 2: Modificações na API principal');
console.log('-----------------------------------------');

try {
  const apiContent = fs.readFileSync('src/pages/api/printer-status.ts', 'utf8');
  
  if (apiContent.includes('getCachedPrinterStatus')) {
    pass('API printer-status modificada para suporte híbrido');
  } else {
    fail('API printer-status NÃO foi modificada para suporte híbrido');
  }
  
  if (apiContent.includes('[Hybrid]')) {
    pass('Logs híbridos implementados');
  } else {
    warn('Logs híbridos podem estar faltando');
  }
} catch (error) {
  fail(`Erro ao ler API printer-status: ${error.message}`);
}

console.log('');

// Teste 3: Frontend modificado
console.log('🎨 Teste 3: Frontend modificado');
console.log('-------------------------------');

try {
  const frontendContent = fs.readFileSync('src/pages/printers.tsx', 'utf8');
  
  if (frontendContent.includes('source?:')) {
    pass('Interface modificada para mostrar origem dos dados');
  } else {
    fail('Interface NÃO foi modificada para mostrar origem dos dados');
  }
  
  if (frontendContent.includes('Agente Local')) {
    pass('Indicador "Agente Local" implementado');
  } else {
    fail('Indicador "Agente Local" NÃO implementado');
  }
} catch (error) {
  fail(`Erro ao ler frontend: ${error.message}`);
}

console.log('');

// Teste 4: Package.json configurado
console.log('📦 Teste 4: Package.json configurado');
console.log('------------------------------------');

try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.scripts['deploy:prepare']) {
    pass('Script deploy:prepare configurado');
  } else {
    fail('Script deploy:prepare NÃO configurado');
  }
  
  if (pkg.scripts['deploy:vercel']) {
    pass('Script deploy:vercel configurado');
  } else {
    fail('Script deploy:vercel NÃO configurado');
  }
  
  // Verificar dependências críticas
  const criticalDeps = ['@prisma/client', 'next', 'react'];
  criticalDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      pass(`Dependência ${dep} presente`);
    } else {
      fail(`Dependência ${dep} AUSENTE`);
    }
  });
  
} catch (error) {
  fail(`Erro ao ler package.json: ${error.message}`);
}

console.log('');

// Teste 5: Configuração Vercel
console.log('⚙️ Teste 5: Configuração Vercel');
console.log('-------------------------------');

try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.functions && vercelConfig.functions['src/pages/api/printer-status.ts']) {
    pass('Timeout configurado para printer-status API');
  } else {
    warn('Timeout para printer-status API pode estar faltando');
  }
  
  if (vercelConfig.functions && vercelConfig.functions['src/pages/api/printer-status-from-agent.ts']) {
    pass('Timeout configurado para printer-status-from-agent API');
  } else {
    warn('Timeout para printer-status-from-agent API pode estar faltando');
  }
  
} catch (error) {
  fail(`Erro ao ler vercel.json: ${error.message}`);
}

console.log('');

// Teste 6: Agente local
console.log('🏠 Teste 6: Agente local');
console.log('------------------------');

try {
  const agentPkg = JSON.parse(fs.readFileSync('local-agent/package.json', 'utf8'));
  
  const requiredAgentDeps = ['axios', 'net-snmp', 'winston', 'express'];
  requiredAgentDeps.forEach(dep => {
    if (agentPkg.dependencies[dep]) {
      pass(`Agente tem dependência ${dep}`);
    } else {
      fail(`Agente NÃO tem dependência ${dep}`);
    }
  });
  
  if (agentPkg.scripts['setup']) {
    pass('Script setup do agente configurado');
  } else {
    fail('Script setup do agente NÃO configurado');
  }
  
} catch (error) {
  fail(`Erro ao verificar agente local: ${error.message}`);
}

console.log('');

// Teste 7: Arquivos de documentação
console.log('📚 Teste 7: Documentação');
console.log('------------------------');

const docFiles = [
  'GUIA-INSTALACAO-HIBRIDA.md',
  'DEPLOY-VERCEL-GUIDE.md',
  'local-agent/README.md'
];

docFiles.forEach(file => {
  if (fs.existsSync(file)) {
    pass(`Documentação ${file} presente`);
  } else {
    warn(`Documentação ${file} pode estar faltando`);
  }
});

console.log('');

// Resultado final
console.log('🎯 RESULTADO FINAL');
console.log('==================');

if (allTestsPassed) {
  console.log('✅ TODOS OS TESTES PASSARAM!');
  console.log('');
  console.log('🚀 SEU PROJETO ESTÁ PRONTO PARA DEPLOY!');
  console.log('');
  console.log('Próximos passos:');
  console.log('1. npm run deploy:prepare');
  console.log('2. Configure LOCAL_AGENT_API_KEY na Vercel');
  console.log('3. vercel --prod');
  console.log('4. Configure agente local: cd local-agent && npm run setup');
  console.log('');
  console.log('📖 Consulte DEPLOY-VERCEL-GUIDE.md para instruções detalhadas');
} else {
  console.log('❌ ALGUNS TESTES FALHARAM!');
  console.log('');
  console.log('🔧 Corrija os problemas acima antes de fazer deploy.');
  console.log('');
  console.log('💡 Dicas:');
  console.log('- Verifique se todos os arquivos híbridos foram criados');
  console.log('- Confirme se as modificações nas APIs foram feitas');
  console.log('- Execute os scripts de criação novamente se necessário');
}

console.log('');