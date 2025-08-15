const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFinalUpdates() {
  try {
    console.log('🔍 Verificação final das atualizações...\n');
    
    // Verificar se ainda existem itens com "GENÉRICO"
    const genericCount = await prisma.item.count({
      where: { brand: 'GENÉRICO' }
    });
    
    console.log(`📊 Itens com brand "GENÉRICO": ${genericCount}`);
    
    // Mostrar alguns exemplos dos itens atualizados
    const updatedItems = await prisma.item.findMany({
      where: {
        brand: { not: 'GENÉRICO' }
      },
      select: {
        id: true,
        serialNumber: true,
        brand: true,
        name: true
      },
      orderBy: {
        id: 'asc'
      },
      take: 10
    });
    
    console.log('\n📋 Primeiros 10 itens com brands atualizados:');
    console.log('ID\tSerial\t\t\tName\t\tBrand');
    console.log('─'.repeat(120));
    
    updatedItems.forEach(item => {
      const serialFormatted = (item.serialNumber || '').substring(0, 15).padEnd(15);
      const nameFormatted = (item.name || '').substring(0, 15).padEnd(15);
      const brandTruncated = item.brand.substring(0, 50);
      console.log(`${item.id}\t${serialFormatted}\t${nameFormatted}\t${brandTruncated}`);
    });
    
    // Contar total de itens atualizados
    const totalItems = await prisma.item.count();
    const updatedCount = await prisma.item.count({
      where: { brand: { not: 'GENÉRICO' } }
    });
    
    console.log(`\n📊 Estatísticas finais:`);
    console.log(`   Total de itens na tabela: ${totalItems}`);
    console.log(`   Itens com brands atualizados: ${updatedCount}`);
    console.log(`   Itens ainda com "GENÉRICO": ${genericCount}`);
    console.log(`   Percentual atualizado: ${((updatedCount / totalItems) * 100).toFixed(1)}%`);
    
    // Verificar alguns tipos de brands mais comuns
    const brandStats = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN brand LIKE 'COMPUTADOR%' THEN 'COMPUTADOR'
          WHEN brand LIKE 'NOTEBOOK%' THEN 'NOTEBOOK' 
          WHEN brand LIKE 'MONITOR%' THEN 'MONITOR'
          WHEN brand LIKE 'ESTABILIZADOR%' THEN 'ESTABILIZADOR'
          ELSE 'OUTROS'
        END as category,
        COUNT(*) as count
      FROM "Item"
      WHERE brand != 'GENÉRICO'
      GROUP BY category
      ORDER BY count DESC
    `;
    
    console.log(`\n📈 Categorias dos modelos atualizados:`);
    brandStats.forEach(stat => {
      console.log(`   ${stat.category}: ${stat.count} itens`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinalUpdates();