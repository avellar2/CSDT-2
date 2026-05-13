import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingDGP() {
  console.log('➕ Adicionando impressoras DGP faltantes...\n');

  // DGP #2: E42540F HP (usar ID 2 que está disponível)
  try {
    const dgp2 = await prisma.printer.create({
      data: {
        id: 2,
        sigla: 'DGP',
        setor: 'DGP',
        modelo: 'E42540F',
        fabricante: 'HP',
        serial: 'BRBST7107M',
        ip: '10.0.8.75'
      }
    });
    console.log('✅ Criado: DGP #2 | E42540F HP | IP: 10.0.8.75 | ID:', dgp2.id);
  } catch (e: any) {
    console.log('⚠️  DGP #2 erro:', e.message);
  }

  // DGP #3 já foi criado com ID 51

  // Verificar resultado final
  const dgps = await prisma.printer.findMany({
    where: { sigla: 'DGP' },
    orderBy: { ip: 'asc' }
  });

  console.log('\n🖨️  DGP no banco agora:');
  dgps.forEach(d => {
    console.log(`   ID: ${d.id} | ${d.modelo.padEnd(15)} | ${d.fabricante.padEnd(8)} | IP: ${d.ip}`);
  });

  const total = await prisma.printer.count();
  console.log(`\n🖨️  Total de impressoras no banco: ${total}`);

  // Comparar com planilha
  console.log('\n📋 Comparação com planilha:');
  console.log('   Planilha: 3 DGP');
  console.log(`   Banco: ${dgps.length} DGP`);
  console.log(dgps.length === 3 ? '   ✅ IGUAIS!' : '   ❌ DIFERENTES!');

  // Listar todas as impressoras por sigla
  const allPrinters = await prisma.printer.findMany({
    orderBy: { sigla: 'asc' }
  });

  console.log('\n📋 Todas as impressoras:');
  allPrinters.forEach(p => {
    console.log(`   ${p.sigla.padEnd(15)} | ${p.modelo.padEnd(15)} | ${p.ip}`);
  });
}

addMissingDGP()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    prisma.$disconnect();
    process.exit(1);
  });
