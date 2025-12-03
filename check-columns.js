const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'OSExterna'
      AND column_name IN ('diretoraNaEscola', 'temImpressoraComProblema', 'relatorioImpressora', 'impressoraComProblema')
      ORDER BY column_name;
    `;

    console.log('Colunas encontradas:', result);

    if (result.length === 0) {
      console.log('\n❌ NENHUMA das colunas novas existe no banco!');
    } else if (result.length < 4) {
      console.log(`\n⚠️ Apenas ${result.length} de 4 colunas existem`);
    } else {
      console.log('\n✅ Todas as 4 colunas existem no banco');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
