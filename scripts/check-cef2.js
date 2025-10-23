const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCEF2() {
  console.log('🔍 Verificando se CEF II existe...');

  try {
    const printer = await prisma.printer.findFirst({
      where: {
        OR: [
          { sigla: 'CEF II' },
          { ip: '10.0.2.76' }
        ]
      }
    });

    if (printer) {
      console.log('✅ CEF II encontrada:');
      console.log(`  - ID: ${printer.id}`);
      console.log(`  - Sigla: ${printer.sigla}`);
      console.log(`  - IP: ${printer.ip}`);
      console.log(`  - Serial: ${printer.serial}`);
    } else {
      console.log('❌ CEF II não encontrada no banco');

      // Buscar todas impressoras CEF
      const cefPrinters = await prisma.printer.findMany({
        where: {
          sigla: {
            contains: 'CEF'
          }
        }
      });

      console.log(`\n📋 Impressoras CEF no banco: ${cefPrinters.length}`);
      cefPrinters.forEach(p => {
        console.log(`  - ${p.sigla} (ID: ${p.id}, IP: ${p.ip})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCEF2();
