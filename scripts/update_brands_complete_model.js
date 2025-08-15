const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateItemBrandsWithCompleteModel() {
  try {
    console.log('🔍 Carregando dados dos arquivos para atualizar com modelo completo...\n');
    
    // Ler arquivo CSV
    const csvData = [];
    const csvStream = fs.createReadStream('public/item_sem_brand.csv')
      .pipe(csv())
      .on('data', (row) => {
        csvData.push({
          id: parseInt(row.id),
          serialNumber: row.serialNumber,
          brand: row.brand,
          name: row.name
        });
      })
      .on('end', async () => {
        console.log(`📊 CSV carregado: ${csvData.length} itens encontrados`);
        
        // Ler arquivo Excel
        const workbook = XLSX.readFile('public/itens.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📊 Excel carregado: ${excelData.length} itens encontrados\n`);
        
        // Criar mapa de Series -> Modelo completo do Excel
        const modeloMap = new Map();
        
        excelData.forEach(item => {
          const serie = String(item.Serie).trim();
          const modelo = (item.Modelo || '').trim();
          
          if (modelo) {
            modeloMap.set(serie, modelo);
          }
        });
        
        console.log(`🗺️  Mapa de modelos criado: ${modeloMap.size} entradas\n`);
        
        // Encontrar todos os itens que têm correspondência no Excel
        const updates = [];
        let matchedItems = 0;
        
        for (const csvItem of csvData) {
          const csvSerial = String(csvItem.serialNumber).trim();
          
          // Procurar correspondência no Excel
          if (modeloMap.has(csvSerial)) {
            const completeModel = modeloMap.get(csvSerial);
            matchedItems++;
            
            // Atualizar TODOS os itens que têm correspondência, independente do brand atual
            updates.push({
              id: csvItem.id,
              serialNumber: csvSerial,
              currentBrand: csvItem.brand,
              newBrand: completeModel
            });
          }
        }
        
        console.log(`🔍 Correspondências encontradas: ${matchedItems}`);
        console.log(`📝 Itens para atualizar: ${updates.length}\n`);
        
        if (updates.length === 0) {
          console.log('✅ Nenhuma atualização necessária!');
          return;
        }
        
        // Mostrar preview das atualizações
        console.log('📋 Preview das atualizações (primeiros 10):');
        updates.slice(0, 10).forEach((update, index) => {
          console.log(`${index + 1}. ID ${update.id} | Serial: ${update.serialNumber}`);
          console.log(`   DE: "${update.currentBrand}"`);
          console.log(`   PARA: "${update.newBrand}"\n`);
        });
        
        if (updates.length > 10) {
          console.log(`... e mais ${updates.length - 10} itens\n`);
        }
        
        console.log('⚠️  Iniciando atualização no banco de dados...\n');
        
        let updatedCount = 0;
        let errorCount = 0;
        
        // Executar atualizações
        for (const update of updates) {
          try {
            await prisma.item.update({
              where: { id: update.id },
              data: { brand: update.newBrand }
            });
            
            updatedCount++;
            console.log(`✅ ID ${update.id}: Atualizado com modelo completo`);
          } catch (error) {
            errorCount++;
            console.error(`❌ Erro ao atualizar ID ${update.id}:`, error.message);
          }
        }
        
        console.log(`\n🎉 Atualização concluída!`);
        console.log(`📊 Itens atualizados: ${updatedCount}/${updates.length}`);
        console.log(`❌ Erros: ${errorCount}`);
        
        // Verificar quantos itens ainda ficaram com "GENÉRICO"
        const remainingGeneric = await prisma.item.count({
          where: { brand: 'GENÉRICO' }
        });
        
        console.log(`\n📊 Itens restantes com brand "GENÉRICO": ${remainingGeneric}`);
        
      });
      
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
updateItemBrandsWithCompleteModel();