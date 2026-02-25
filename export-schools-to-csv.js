const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportSchoolsToCSV() {
  try {
    console.log('\n📋 Exportando escolas para CSV...\n');

    // Busca todas as escolas
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        district: true,
        geocoded: true,
        latitude: true,
        longitude: true
      },
      orderBy: [
        { geocoded: 'asc' }, // Não geocodificadas primeiro
        { name: 'asc' }
      ]
    });

    // Cria o CSV
    let csv = 'ID,Nome da Escola,Distrito,Endereço Atual,Geocodificada,Latitude,Longitude,Novo Endereço (Preencher)\n';

    schools.forEach(school => {
      const geocodedStatus = (school.geocoded && school.latitude && school.longitude) ? 'SIM' : 'NÃO';
      const address = (school.address || '').replace(/"/g, '""'); // Escapa aspas
      const name = (school.name || '').replace(/"/g, '""');
      const district = (school.district || '').replace(/"/g, '""');

      csv += `${school.id},"${name}","${district}","${address}",${geocodedStatus},${school.latitude || ''},${school.longitude || ''},\n`;
    });

    // Salva o arquivo
    const filename = 'escolas-para-atualizar.csv';
    fs.writeFileSync(filename, csv, 'utf-8');

    console.log(`✅ Arquivo criado: ${filename}`);
    console.log(`📊 Total de escolas: ${schools.length}`);

    const notGeocoded = schools.filter(s => !s.geocoded || !s.latitude || !s.longitude).length;
    console.log(`⚠️  Escolas não geocodificadas: ${notGeocoded}\n`);

    console.log('📝 INSTRUÇÕES:');
    console.log('1. Abra o arquivo "escolas-para-atualizar.csv" no Excel ou Google Sheets');
    console.log('2. Para cada escola NÃO geocodificada:');
    console.log('   - Pesquise no Google Maps: "Nome da Escola, Duque de Caxias"');
    console.log('   - Copie o endereço completo do Google Maps');
    console.log('   - Cole na coluna "Novo Endereço (Preencher)"');
    console.log('3. Salve o arquivo CSV');
    console.log('4. Execute o script de importação que vou criar\n');

    console.log('💡 DICA: Foque primeiro nas escolas mais importantes/principais!\n');

  } catch (error) {
    console.error('❌ Erro ao exportar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportSchoolsToCSV();
