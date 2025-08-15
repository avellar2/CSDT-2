const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

async function debugComparison() {
  try {
    console.log('🔍 Analisando dados para debug...\n');
    
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
      .on('end', () => {
        console.log('📊 Primeiros 5 itens do CSV:');
        csvData.slice(0, 5).forEach((item, index) => {
          console.log(`${index + 1}. ID: ${item.id} | Serial: "${item.serialNumber}" | Brand: "${item.brand}" | Name: "${item.name}"`);
        });
        
        console.log('\n📊 Últimos 5 itens do CSV:');
        csvData.slice(-5).forEach((item, index) => {
          console.log(`${csvData.length - 4 + index}. ID: ${item.id} | Serial: "${item.serialNumber}" | Brand: "${item.brand}" | Name: "${item.name}"`);
        });
        
        // Ler arquivo Excel
        const workbook = XLSX.readFile('public/itens.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('\n📊 Primeiros 5 itens do Excel:');
        excelData.slice(0, 5).forEach((item, index) => {
          console.log(`${index + 1}. Serie: "${item.Serie}" | Modelo: "${item.Modelo}" | Local: "${item.Local}"`);
        });
        
        console.log('\n📊 Últimos 5 itens do Excel:');
        excelData.slice(-5).forEach((item, index) => {
          console.log(`${excelData.length - 4 + index}. Serie: "${item.Serie}" | Modelo: "${item.Modelo}" | Local: "${item.Local}"`);
        });
        
        // Procurar algumas correspondências específicas
        console.log('\n🔍 Testando correspondências específicas:');
        const testSerials = csvData.slice(0, 10).map(item => item.serialNumber);
        
        testSerials.forEach(serial => {
          const match = excelData.find(excelItem => 
            String(excelItem.Serie).trim() === String(serial).trim()
          );
          
          if (match) {
            console.log(`✅ Match encontrado: "${serial}" -> Modelo: "${match.Modelo}"`);
          } else {
            console.log(`❌ Não encontrado: "${serial}"`);
            
            // Procurar parciais
            const partialMatches = excelData.filter(excelItem => 
              String(excelItem.Serie).includes(serial) || 
              String(serial).includes(String(excelItem.Serie))
            );
            
            if (partialMatches.length > 0) {
              console.log(`   📝 Possíveis matches parciais:`, partialMatches.slice(0, 2).map(m => `"${m.Serie}"`));
            }
          }
        });
        
        // Verificar duplicatas no CSV
        const serialCounts = {};
        csvData.forEach(item => {
          const serial = String(item.serialNumber).trim();
          serialCounts[serial] = (serialCounts[serial] || 0) + 1;
        });
        
        const duplicates = Object.entries(serialCounts).filter(([serial, count]) => count > 1);
        if (duplicates.length > 0) {
          console.log(`\n⚠️  Seriais duplicados no CSV: ${duplicates.length}`);
          duplicates.slice(0, 3).forEach(([serial, count]) => {
            console.log(`   "${serial}": ${count} ocorrências`);
          });
        }
        
        // Verificar duplicatas no Excel
        const excelSerialCounts = {};
        excelData.forEach(item => {
          const serial = String(item.Serie).trim();
          excelSerialCounts[serial] = (excelSerialCounts[serial] || 0) + 1;
        });
        
        const excelDuplicates = Object.entries(excelSerialCounts).filter(([serial, count]) => count > 1);
        if (excelDuplicates.length > 0) {
          console.log(`\n⚠️  Seriais duplicados no Excel: ${excelDuplicates.length}`);
          excelDuplicates.slice(0, 3).forEach(([serial, count]) => {
            console.log(`   "${serial}": ${count} ocorrências`);
          });
        }
      });
      
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

debugComparison();