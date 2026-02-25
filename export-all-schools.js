const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportAllSchools() {
  try {
    console.log('\n📋 Exportando TODAS as escolas para CSV...\n');

    // Busca TODAS as escolas
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        district: true,
        director: true,
        phone: true,
        students: true,
        geocoded: true,
        latitude: true,
        longitude: true
      },
      orderBy: { name: 'asc' }
    });

    // Cria o CSV
    let csv = 'ID;Nome da Escola;Distrito;Diretor;Telefone;Alunos;Endereço Atual;Geocodificada;Novo Endereço Google Maps (PREENCHER TODOS)\n';

    schools.forEach(school => {
      const geocodedStatus = (school.geocoded && school.latitude && school.longitude) ? 'SIM' : 'NÃO';

      // Escapa aspas duplas e quebras de linha
      const name = (school.name || '').replace(/"/g, '""').replace(/[\r\n]/g, ' ');
      const district = (school.district || '').replace(/"/g, '""').replace(/[\r\n]/g, ' ');
      const director = (school.director || '').replace(/"/g, '""').replace(/[\r\n]/g, ' ');
      const phone = (school.phone || '').replace(/"/g, '""').replace(/[\r\n]/g, ' ');
      const address = (school.address || '').replace(/"/g, '""').replace(/[\r\n]/g, ' ');
      const students = school.students || '';

      csv += `${school.id};"${name}";"${district}";"${director}";"${phone}";${students};"${address}";${geocodedStatus};\n`;
    });

    // Salva o arquivo
    const filename = 'TODAS-ESCOLAS-ATUALIZAR.csv';
    fs.writeFileSync(filename, '\ufeff' + csv, 'utf-8'); // \ufeff é BOM para Excel reconhecer UTF-8

    console.log(`✅ Arquivo criado: ${filename}`);
    console.log(`📊 Total de escolas: ${schools.length}\n`);

    console.log('📝 INSTRUÇÕES:');
    console.log('1. Abra "TODAS-ESCOLAS-ATUALIZAR.csv" no Excel');
    console.log('2. Para CADA escola:');
    console.log('   a) Pesquise no Google Maps: "[Nome da Escola], Duque de Caxias"');
    console.log('   b) Copie o endereço COMPLETO do Google Maps');
    console.log('   c) Cole na última coluna "Novo Endereço Google Maps"');
    console.log('3. Salve o arquivo (mantenha o nome)');
    console.log('4. Execute: node import-updated-addresses.js\n');

    console.log('💡 DICA:');
    console.log('- Pode fazer aos poucos (10, 20 por vez)');
    console.log('- O script só atualiza as que tiverem "Novo Endereço" preenchido');
    console.log('- Use ponto-e-vírgula (;) como separador no Excel\n');

  } catch (error) {
    console.error('❌ Erro ao exportar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllSchools();
