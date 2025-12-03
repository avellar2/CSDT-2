require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

console.log('🔄 Usando banco local:', process.env.DATABASE_URL.substring(0, 40) + '...\n');

try {
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✅ Banco local atualizado com sucesso!');
} catch (error) {
  console.error('\n❌ Erro ao atualizar banco local');
  process.exit(1);
}
