const Service = require('node-windows').Service;
const path = require('path');

// Criar objeto de serviço
const svc = new Service({
  name: 'CSDT2-LocalAgent',
  description: 'Agente local para monitoramento SNMP das impressoras - CSDT-2',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ]
});

// Escutar eventos
svc.on('install', () => {
  console.log('✅ Serviço CSDT2-LocalAgent instalado com sucesso!');
  console.log('🎯 Para iniciar: net start CSDT2-LocalAgent');
  console.log('🛑 Para parar: net stop CSDT2-LocalAgent');
  console.log('📋 Status: services.msc -> procure por "CSDT2-LocalAgent"');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('⚠️  Serviço já está instalado.');
  console.log('🔄 Para reinstalar, execute primeiro: node uninstall-service.js');
});

svc.on('start', () => {
  console.log('🚀 Serviço iniciado com sucesso!');
  console.log('🌐 Interface disponível em: http://localhost:3001/status');
});

svc.on('error', (err) => {
  console.error('❌ Erro no serviço:', err);
});

// Instalar o serviço
console.log('📦 Instalando serviço CSDT2-LocalAgent...');
console.log('ℹ️  Execute como Administrador para instalar o serviço Windows');
svc.install();