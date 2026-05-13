import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs para deletar (baseado na análise)
const idsToDelete = [
  20, // CEI duplicata (serial com espaço)
  47, // DCC incorreto (serial: 2TX063851, modelo: C8035) - manter ID 42
  24, // DPPE incorreto (serial: AL7B047328, modelo: ES8473) - manter ID 38
  5   // PROTOCOLO incorreto (serial: BW01031010, modelo: MC573) - manter ID 35
];

// Função auxiliar para deletar PrinterStatus antes da Printer
async function deletePrinterWithStatus(id: number) {
  // Primeiro, deletar todos os PrinterStatus relacionados
  const statusCount = await prisma.printerStatus.deleteMany({
    where: { printerId: id }
  });

  // Depois, deletar a Printer
  return await prisma.printer.delete({
    where: { id }
  });
}

async function cleanupDuplicates() {
  console.log('🧹 Limpando impressoras duplicadas...\n');

  let deleted = 0;

  for (const id of idsToDelete) {
    try {
      // Primeiro, buscar para mostrar o que será deletado
      const printer = await prisma.printer.findUnique({
        where: { id }
      });

      if (!printer) {
        console.log(`⚠️  ID ${id} não encontrado`);
        continue;
      }

      // Deletar (primeiro status, depois impressora)
      await deletePrinterWithStatus(id);

      deleted++;
      console.log(`🗑️  Deletado: ID ${id} | ${printer.sigla} | Serial: ${printer.serial} | Modelo: ${printer.modelo}`);
    } catch (error) {
      console.error(`❌ Erro ao deletar ID ${id}:`, error);
    }
  }

  console.log('\n📊 RESUMO:');
  console.log(`   🗑️  Deletados: ${deleted}`);

  // Mostrar resultado final
  const allPrinters = await prisma.printer.findMany({
    orderBy: { sigla: 'asc' }
  });

  // Verificar se ainda há duplicatas
  const siglaCount: Record<string, number> = {};
  allPrinters.forEach(p => {
    siglaCount[p.sigla] = (siglaCount[p.sigla] || 0) + 1;
  });

  const duplicates = Object.entries(siglaCount)
    .filter(([_, count]) => count > 1)
    .map(([sigla, count]) => ({ sigla, count }));

  if (duplicates.length > 0) {
    console.log('\n⚠️  Ainda há duplicatas:');
    duplicates.forEach(d => {
      console.log(`   ${d.sigla}: ${d.count} ocorrências`);
    });
  } else {
    console.log('\n✅ Nenhuma duplicata restante!');
  }

  console.log(`\n🖨️  Total de impressoras no banco: ${allPrinters.length}`);

  // Listar impressoras por sigla para verificação
  console.log('\n📋 Impressoras por sigla (ordenado):');
  const sorted = allPrinters.sort((a, b) => a.sigla.localeCompare(b.sigla));
  sorted.forEach(p => {
    console.log(`   ${p.sigla.padEnd(15)} | ${p.modelo.padEnd(15)} | ${p.fabricante.padEnd(8)} | ${p.ip}`);
  });
}

cleanupDuplicates()
  .then(() => {
    console.log('\n✅ Limpeza concluída!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    prisma.$disconnect();
    process.exit(1);
  });
