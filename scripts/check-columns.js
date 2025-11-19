const XLSX = require('xlsx');

const workbook = XLSX.readFile('c:/Users/Vanderson/Desktop/IEDUCAR 18-11-2025.xlsx');
const worksheet = workbook.Sheets['EDUCAR'];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Primeiras 10 escolas com valores das colunas ao redor de 1ª FASE:\n');
data.slice(0, 10).forEach((row, idx) => {
  console.log(`${idx + 1}. ${row['Escolas']}`);
  console.log(`   DESKTOP - ADM: ${row['DESKTOP - ADM']}`);
  console.log(`   LABORATÓRIOS DESKTOP: ${row['LABORATÓRIOS DESKTOP']}`);
  console.log(`   1ª FASE: ${row['1ª FASE']}`);
  console.log(`   PENDÊNCIA: ${row['PENDÊNCIA']}`);
  console.log();
});

// Calcular total de cada coluna (forçando conversão para número)
const totalLab = data.reduce((sum, row) => sum + (parseInt(row['LABORATÓRIOS DESKTOP']) || 0), 0);
const total1Fase = data.reduce((sum, row) => sum + (parseInt(row['1ª FASE']) || 0), 0);
const totalPend = data.reduce((sum, row) => sum + (parseInt(row['PENDÊNCIA']) || 0), 0);
const totalDesktop = data.reduce((sum, row) => sum + (parseInt(row['DESKTOP - ADM']) || 0), 0);

console.log('\n=== TOTAIS POR COLUNA ===');
console.log(`DESKTOP - ADM: ${totalDesktop}`);
console.log(`LABORATÓRIOS DESKTOP: ${totalLab}`);
console.log(`1ª FASE: ${total1Fase}`);
console.log(`PENDÊNCIA: ${totalPend}`);
console.log();
console.log('=== POSSÍVEIS COMBINAÇÕES ===');
console.log(`1ª FASE + LABORATÓRIOS DESKTOP = ${total1Fase + totalLab}`);
console.log(`1ª FASE + PENDÊNCIA = ${total1Fase + totalPend}`);
console.log(`LABORATÓRIOS DESKTOP + PENDÊNCIA = ${totalLab + totalPend}`);
