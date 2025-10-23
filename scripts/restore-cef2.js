const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreCEF2() {
  console.log('🔄 Restaurando impressora CEF II...');

  try {
    // Verificar se já existe alguma impressora com esse serial
    const existingSerial = await prisma.printer.findFirst({
      where: {
        serial: {
          contains: 'CEF2'
        }
      }
    });

    const uniqueSerial = existingSerial ? `CEF2-${Date.now()}` : 'CEF2-2024';

    // Criar impressora CEF II novamente
    const printer = await prisma.printer.create({
      data: {
        sigla: 'CEF II',
        setor: 'CEF',
        modelo: 'Multifuncional',
        fabricante: 'HP',
        serial: uniqueSerial,
        ip: '10.0.2.76'
      }
    });

    console.log(`✅ Impressora CEF II restaurada com sucesso!`);
    console.log(`  - ID: ${printer.id}`);
    console.log(`  - Sigla: ${printer.sigla}`);
    console.log(`  - IP: ${printer.ip}`);

  } catch (error) {
    console.error('❌ Erro ao restaurar impressora:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreCEF2();
