const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const printersToRemove = [
  'CEF I',
  'CEF II', // Caso seja CEF II em vez de CEF1
  'DIGITALIZAÇÃO'
];

async function removePrinters() {
  console.log('🔍 Buscando impressoras para remover...');

  try {
    // Buscar impressoras
    const printers = await prisma.printer.findMany({
      where: {
        sigla: {
          in: printersToRemove
        }
      }
    });

    console.log(`📋 Encontradas ${printers.length} impressoras:`);
    printers.forEach(p => {
      console.log(`  - ${p.sigla} (ID: ${p.id}, IP: ${p.ip})`);
    });

    if (printers.length === 0) {
      console.log('❌ Nenhuma impressora encontrada para remover.');
      return;
    }

    // Confirmar remoção
    console.log('\n🗑️  Removendo impressoras...');

    // Primeiro remover os status relacionados
    const printerIds = printers.map(p => p.id);

    const deletedStatuses = await prisma.printerStatus.deleteMany({
      where: {
        printerId: {
          in: printerIds
        }
      }
    });

    console.log(`✅ Removidos ${deletedStatuses.count} status de impressoras`);

    // Depois remover as impressoras
    const result = await prisma.printer.deleteMany({
      where: {
        sigla: {
          in: printersToRemove
        }
      }
    });

    console.log(`✅ Removidas ${result.count} impressoras com sucesso!`);
    console.log('\n📊 Resumo:');
    console.log(`  - Status removidos: ${deletedStatuses.count}`);
    console.log(`  - Impressoras removidas: ${result.count}`);

  } catch (error) {
    console.error('❌ Erro ao remover impressoras:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removePrinters();
