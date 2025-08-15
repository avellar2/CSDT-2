const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyUpdates() {
  try {
    console.log('🔍 Verificando as atualizações no banco de dados...\n');
    
    // IDs que foram atualizados
    const updatedIds = [147, 148, 305, 306, 307, 338, 545, 553, 597, 598, 713, 765, 874, 908, 917, 1214, 1215, 1216, 1217, 1218, 1219, 1220, 1221, 1222, 1223];
    
    // Buscar os itens atualizados
    const updatedItems = await prisma.item.findMany({
      where: {
        id: { in: updatedIds }
      },
      select: {
        id: true,
        serialNumber: true,
        brand: true,
        name: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 Verificando ${updatedIds.length} itens atualizados:`);
    console.log('ID\tSerial Number\t\tBrand\t\tName');
    console.log('─'.repeat(80));
    
    updatedItems.forEach(item => {
      const serialFormatted = (item.serialNumber || '').padEnd(20);
      const brandFormatted = (item.brand || '').padEnd(10);
      console.log(`${item.id}\t${serialFormatted}\t${brandFormatted}\t${item.name}`);
    });
    
    // Estatísticas
    const brandCounts = {};
    updatedItems.forEach(item => {
      brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
    });
    
    console.log('\n📈 Resumo das atualizações:');
    Object.entries(brandCounts).forEach(([brand, count]) => {
      console.log(`   ${brand}: ${count} itens`);
    });
    
    console.log(`\n✅ Total verificado: ${updatedItems.length}/${updatedIds.length} itens`);
    
    // Verificar se ainda existem itens com brand "GENÉRICO" que poderiam ser atualizados
    const remainingGeneric = await prisma.item.count({
      where: { brand: 'GENÉRICO' }
    });
    
    console.log(`\n📊 Itens restantes com brand "GENÉRICO": ${remainingGeneric}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUpdates();