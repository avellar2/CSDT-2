const Service = require('node-windows').Service;
const path = require('path');

// Criar objeto de serviço
const svc = new Service({
  name: 'CSDT2-LocalAgent',
  script: path.join(__dirname, 'index.js')
});

// Escutar eventos
svc.on('uninstall', () => {
  console.log('✅ Serviço CSDT2-LocalAgent removido com sucesso!');
});

svc.on('error', (err) => {
  console.error('❌ Erro ao remover serviço:', err);
});

// Desinstalar o serviço
console.log('🗑️  Removendo serviço CSDT2-LocalAgent...');
console.log('ℹ️  Execute como Administrador para remover o serviço Windows');
svc.uninstall();