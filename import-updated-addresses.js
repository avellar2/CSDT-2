const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importUpdatedAddresses() {
  try {
    console.log('\n📥 Importando endereços atualizados...\n');

    // Lê o arquivo CSV
    const csv = fs.readFileSync('escolas-para-atualizar.csv', 'utf-8')
      .replace(/^\ufeff/, ''); // Remove BOM se existir
    const lines = csv.split('\n');

    // Remove header
    lines.shift();

    let updated = 0;
    let skipped = 0;
    const toReset = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Parse CSV com vírgulas (formato: ID,Nome,Distrito,Endereço,Geocoded,Lat,Lng,NovoEndereço)
      const parts = line.split(',');

      if (parts.length < 8) {
        console.log(`⚠️  Linha ignorada (formato inválido): ${line.substring(0, 50)}...`);
        continue;
      }

      const id = parts[0].trim();
      const name = parts[1].trim().replace(/^"|"$/g, '');
      const newAddressRaw = parts[7]; // Última coluna
      const newAddress = newAddressRaw ? newAddressRaw.trim().replace(/^"|"$/g, '') : '';

      // Se há novo endereço, atualiza
      if (newAddress && newAddress.length > 5) {
        try {
          await prisma.school.update({
            where: { id: parseInt(id) },
            data: {
              address: newAddress,
              geocoded: false, // Marca para geocodificar novamente
              latitude: null,
              longitude: null
            }
          });

          toReset.push(name.substring(0, 50));
          updated++;
          console.log(`✅ ${updated}. Atualizado: ${name.substring(0, 50)}`);
        } catch (error) {
          console.log(`❌ Erro ao atualizar escola ID ${id}: ${error.message}`);
        }
      } else {
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${updated} escolas atualizadas com novos endereços`);
    console.log(`⏭️  ${skipped} escolas sem mudanças (coluna vazia)`);
    console.log('='.repeat(60) + '\n');

    if (updated > 0) {
      console.log('🚀 PRÓXIMO PASSO:');
      console.log('1. Abra o mapa de escolas no sistema');
      console.log('2. Clique no botão "Geocodificar" na header');
      console.log(`3. O sistema vai geocodificar as ${updated} escolas com endereços novos\n`);

      console.log('📋 Escolas que serão geocodificadas:');
      toReset.slice(0, 10).forEach((name, idx) => {
        console.log(`   ${idx + 1}. ${name}`);
      });
      if (toReset.length > 10) {
        console.log(`   ... e mais ${toReset.length - 10} escolas\n`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao importar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importUpdatedAddresses();
