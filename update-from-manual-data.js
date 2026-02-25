const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function updateFromManualData() {
  try {
    console.log('\n📥 Atualizando escolas com dados manuais...\n');

    const data = fs.readFileSync('manual-update-data.txt', 'utf-8');
    const lines = data.split('\n').filter(l => l.trim());

    let updated = 0;
    let skipped = 0;

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 3) {
        skipped++;
        continue;
      }

      const id = parseInt(parts[0].trim());
      const name = parts[1].trim();
      const newAddress = parts[2].trim();

      // Se tem endereço novo válido
      if (newAddress && newAddress.length > 5 && !isNaN(id)) {
        try {
          await prisma.school.update({
            where: { id },
            data: {
              address: newAddress,
              geocoded: false,
              latitude: null,
              longitude: null
            }
          });

          updated++;
          console.log(`✅ ${updated}. ${name.substring(0, 50)}`);
        } catch (error) {
          console.log(`❌ Erro ao atualizar ID ${id}: ${error.message}`);
        }
      } else {
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${updated} escolas atualizadas`);
    console.log(`⏭️  ${skipped} linhas ignoradas`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFromManualData();
