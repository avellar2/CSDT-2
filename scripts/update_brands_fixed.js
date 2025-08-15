const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function extractBrandFromModel(modelo) {
  if (!modelo) return 'GENÉRICO';
  
  const modeloUpper = modelo.toUpperCase();
  
  // Lista de brands conhecidos com padrões de detecção
  const brandPatterns = [
    { brand: 'LENOVO', patterns: ['LENOVO', 'THINKPAD', 'IDEAPAD'] },
    { brand: 'DELL', patterns: ['DELL', 'OPTIPLEX', 'LATITUDE', 'INSPIRON', 'VOSTRO'] },
    { brand: 'HP', patterns: ['HP', 'HEWLETT', 'PAVILION', 'ELITEBOOK', 'PROBOOK'] },
    { brand: 'ACER', patterns: ['ACER', 'ASPIRE', 'PREDATOR'] },
    { brand: 'ASUS', patterns: ['ASUS', 'ZENBOOK', 'VIVOBOOK'] },
    { brand: 'SAMSUNG', patterns: ['SAMSUNG'] },
    { brand: 'POSITIVO', patterns: ['POSITIVO', 'PREMIUM', 'MOTION'] },
    { brand: 'CCE', patterns: ['CCE'] },
    { brand: 'ITAUTEC', patterns: ['ITAUTEC'] },
    { brand: 'LG', patterns: ['LG'] },
    { brand: 'AOC', patterns: ['AOC'] },
    { brand: 'MULTILASER', patterns: ['MULTILASER'] },
    { brand: 'PHILIPS', patterns: ['PHILIPS'] }
  ];
  
  // Procurar por padrões
  for (const { brand, patterns } of brandPatterns) {
    if (patterns.some(pattern => modeloUpper.includes(pattern))) {
      return brand;
    }
  }
  
  // Se não encontrou, tentar a primeira palavra
  const firstWord = modeloUpper.split(' ')[0];
  const knownBrands = ['LENOVO', 'DELL', 'HP', 'ACER', 'ASUS', 'SAMSUNG', 'POSITIVO', 'CCE', 'ITAUTEC', 'LG', 'AOC'];
  if (knownBrands.includes(firstWord)) {
    return firstWord;
  }
  
  return 'GENÉRICO';
}

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
          brand: row.brand,
          name: row.name
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
        let brandExtractionStats = {};
        
        excelData.forEach(item => {
          const serie = String(item.Serie).trim();
          const modelo = item.Modelo || '';
          
          const brand = extractBrandFromModel(modelo);
          brandMap.set(serie, { brand, modelo });
          
          // Estatísticas
          brandExtractionStats[brand] = (brandExtractionStats[brand] || 0) + 1;
        });
        
        console.log('📈 Estatísticas de brands extraídos:');
        Object.entries(brandExtractionStats)
          .sort((a, b) => b[1] - a[1])
          .forEach(([brand, count]) => {
            console.log(`   ${brand}: ${count} itens`);
          });
        
        console.log(`\n🗺️  Mapa de brands criado: ${brandMap.size} entradas\n`);
        
        // Comparar e atualizar
        let matchedItems = 0;
        let updatedItems = 0;
        const updates = [];
        
        for (const csvItem of csvData) {
          const csvSerial = String(csvItem.serialNumber).trim();
          
          // Procurar correspondência no Excel
          if (brandMap.has(csvSerial)) {
            const excelMatch = brandMap.get(csvSerial);
            const correctBrand = excelMatch.brand;
            matchedItems++;
            
            if (csvItem.brand === 'GENÉRICO' && correctBrand !== 'GENÉRICO') {
              updates.push({
                id: csvItem.id,
                serialNumber: csvSerial,
                oldBrand: csvItem.brand,
                newBrand: correctBrand,
                modelo: excelMatch.modelo
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
        updates.slice(0, 10).forEach((update, index) => {
          console.log(`${index + 1}. ID ${update.id} | Serial: ${update.serialNumber}`);
          console.log(`   ${update.oldBrand} → ${update.newBrand}`);
          console.log(`   Modelo: ${update.modelo}\n`);
        });
        
        if (updates.length > 10) {
          console.log(`... e mais ${updates.length - 10} itens\n`);
        }
        
        // Estatísticas dos updates
        const updateStats = {};
        updates.forEach(update => {
          updateStats[update.newBrand] = (updateStats[update.newBrand] || 0) + 1;
        });
        
        console.log('📊 Estatísticas de atualizações por brand:');
        Object.entries(updateStats)
          .sort((a, b) => b[1] - a[1])
          .forEach(([brand, count]) => {
            console.log(`   ${brand}: ${count} atualizações`);
          });
        
        console.log('\n⚠️  Iniciando atualização no banco de dados...\n');
        
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