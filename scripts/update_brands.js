const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateItemBrands() {
  try {
    console.log('🔍 Carregando dados dos arquivos...\n');
    
    // Ler arquivo CSV (com brands "GENÉRICO")
    const csvData = [];
    const csvStream = fs.createReadStream('public/item_sem_brand.csv')
      .pipe(csv())
      .on('data', (row) => {
        csvData.push({
          id: parseInt(row.id),
          serialNumber: row.serialNumber,
          brand: row.brand
        });
      })
      .on('end', async () => {
        console.log(`📊 CSV carregado: ${csvData.length} itens encontrados`);
        
        // Ler arquivo Excel (com brands corretos)
        const workbook = XLSX.readFile('public/itens.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📊 Excel carregado: ${excelData.length} itens encontrados\n`);
        
        // Criar mapa de Series -> Brand do Excel
        const brandMap = new Map();
        excelData.forEach(item => {
          const serie = String(item.Serie).trim();
          const modelo = item.Modelo || '';
          
          // Extrair brand do modelo (pegar a primeira palavra)
          let brand = 'GENÉRICO';
          if (modelo) {
            const words = modelo.split(' ');
            if (words.length > 0) {
              const firstWord = words[0].toUpperCase();
              // Lista de brands conhecidos
              const knownBrands = ['LENOVO', 'DELL', 'HP', 'ACER', 'ASUS', 'SAMSUNG', 'POSITIVO', 'CCE', 'ITAUTEC'];
              if (knownBrands.includes(firstWord)) {
                brand = firstWord;
              } else if (modelo.toUpperCase().includes('LENOVO')) {
                brand = 'LENOVO';
              } else if (modelo.toUpperCase().includes('DELL')) {
                brand = 'DELL';
              } else if (modelo.toUpperCase().includes('HP')) {
                brand = 'HP';
              }
            }
          }
          
          brandMap.set(serie, brand);
        });
        
        console.log(`🗺️  Mapa de brands criado: ${brandMap.size} entradas\n`);
        
        // Comparar e atualizar
        let matchedItems = 0;
        let updatedItems = 0;
        const updates = [];
        
        for (const csvItem of csvData) {
          const csvSerial = String(csvItem.serialNumber).trim();
          
          // Procurar correspondência no Excel
          if (brandMap.has(csvSerial)) {
            const correctBrand = brandMap.get(csvSerial);
            matchedItems++;
            
            if (csvItem.brand === 'GENÉRICO' && correctBrand !== 'GENÉRICO') {
              updates.push({
                id: csvItem.id,
                serialNumber: csvSerial,
                oldBrand: csvItem.brand,
                newBrand: correctBrand
              });
            }
          }
        }
        
        console.log(`🔍 Correspondências encontradas: ${matchedItems}`);
        console.log(`📝 Itens para atualizar: ${updates.length}\n`);
        
        if (updates.length === 0) {
          console.log('✅ Nenhuma atualização necessária!');
          return;
        }
        
        // Mostrar preview das atualizações
        console.log('📋 Preview das atualizações:');
        updates.slice(0, 5).forEach((update, index) => {
          console.log(`${index + 1}. ID ${update.id} | Serial: ${update.serialNumber}`);
          console.log(`   ${update.oldBrand} → ${update.newBrand}\n`);
        });
        
        if (updates.length > 5) {
          console.log(`... e mais ${updates.length - 5} itens\n`);
        }
        
        // Confirmar atualização
        console.log('⚠️  Iniciando atualização no banco de dados...\n');
        
        // Executar atualizações
        for (const update of updates) {
          try {
            await prisma.item.update({
              where: { id: update.id },
              data: { brand: update.newBrand }
            });
            
            updatedItems++;
            console.log(`✅ ID ${update.id}: ${update.oldBrand} → ${update.newBrand}`);
          } catch (error) {
            console.error(`❌ Erro ao atualizar ID ${update.id}:`, error.message);
          }
        }
        
        console.log(`\n🎉 Atualização concluída!`);
        console.log(`📊 Itens atualizados: ${updatedItems}/${updates.length}`);
        
      });
      
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
updateItemBrands();