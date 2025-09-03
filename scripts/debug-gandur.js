const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugGandur() {
  console.log('🔍 Investigando a escola Gandur...\n');
  
  try {
    // Buscar escola Gandur
    const gandurSchool = await prisma.school.findFirst({
      where: {
        name: {
          contains: 'GANDUR',
          mode: 'insensitive'
        }
      },
      include: {
        annexes: true,
        parentSchool: true
      }
    });

    if (!gandurSchool) {
      console.log('❌ Escola Gandur não encontrada');
      return;
    }

    console.log('🏫 Escola encontrada:');
    console.log(`   ID: ${gandurSchool.id}`);
    console.log(`   Nome: ${gandurSchool.name}`);
    console.log(`   Parent School ID: ${gandurSchool.parentSchoolId}`);
    console.log(`   É anexo: ${gandurSchool.parentSchoolId !== null}`);
    
    if (gandurSchool.parentSchool) {
      console.log(`   Escola principal: ${gandurSchool.parentSchool.name}`);
    }

    if (gandurSchool.annexes && gandurSchool.annexes.length > 0) {
      console.log(`\n📍 Anexos (${gandurSchool.annexes.length}):`);
      gandurSchool.annexes.forEach(annex => {
        console.log(`   - ${annex.name} (ID: ${annex.id})`);
      });
    }

    // Buscar itens relacionados
    console.log('\n💻 Itens na escola Gandur:');
    const items = await prisma.item.findMany({
      where: { schoolId: gandurSchool.id },
      include: {
        School: true
      }
    });

    if (items.length === 0) {
      console.log('   Nenhum item encontrado diretamente na escola Gandur');
    } else {
      items.forEach(item => {
        console.log(`   - ${item.name} (${item.brand}) - Serial: ${item.serialNumber}`);
        console.log(`     Escola: ${item.School?.name} (ID: ${item.School?.id})`);
      });
    }

    // Se Gandur tem anexos, buscar itens dos anexos
    if (gandurSchool.annexes && gandurSchool.annexes.length > 0) {
      console.log('\n💻 Itens nos anexos da Gandur:');
      const annexIds = gandurSchool.annexes.map(a => a.id);
      const annexItems = await prisma.item.findMany({
        where: { 
          schoolId: { in: annexIds }
        },
        include: {
          School: true
        }
      });

      if (annexItems.length === 0) {
        console.log('   Nenhum item encontrado nos anexos');
      } else {
        annexItems.forEach(item => {
          console.log(`   - ${item.name} (${item.brand}) - Serial: ${item.serialNumber}`);
          console.log(`     Anexo: ${item.School?.name} (ID: ${item.School?.id})`);
        });
      }
    }

    // Simular a consulta da API
    console.log('\n🔧 Simulando consulta da API...');
    const schoolIds = [gandurSchool.id, ...(gandurSchool.annexes?.map(annex => annex.id) || [])];
    console.log(`   School IDs para busca: [${schoolIds.join(', ')}]`);
    
    const allItems = await prisma.item.findMany({
      where: { 
        schoolId: {
          in: schoolIds
        }
      },
      include: {
        School: true
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n📊 Total de itens encontrados: ${allItems.length}`);
    allItems.forEach(item => {
      const isMainSchool = item.School?.id === gandurSchool.id;
      const isAnnex = item.School?.parentSchoolId !== null;
      
      console.log(`\n   Item: ${item.name} (${item.brand})`);
      console.log(`   Serial: ${item.serialNumber}`);
      console.log(`   School ID: ${item.schoolId}`);
      console.log(`   School Name: ${item.School?.name}`);
      console.log(`   School Parent ID: ${item.School?.parentSchoolId}`);
      console.log(`   Is Main School: ${isMainSchool}`);
      console.log(`   Is Annex: ${isAnnex}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGandur();