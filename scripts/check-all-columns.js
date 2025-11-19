const XLSX = require('xlsx');

const workbook = XLSX.readFile('c:/Users/Vanderson/Desktop/IEDUCAR 18-11-2025.xlsx');
const worksheet = workbook.Sheets['EDUCAR'];

// Ler com header: 1 para incluir TODAS as colunas (até vazias)
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== CABEÇALHO (linha 1) ===');
console.log('Colunas encontradas:');
data[0].forEach((col, idx) => {
  const letra = String.fromCharCode(65 + idx); // A=65, B=66, etc
  console.log(`  Coluna ${letra} (índice ${idx}): "${col}"`);
});

console.log('\n=== PRIMEIRA LINHA DE DADOS (linha 2) ===');
data[1].forEach((val, idx) => {
  const letra = String.fromCharCode(65 + idx);
  console.log(`  Coluna ${letra}: ${val}`);
});

console.log('\n=== LINHA 10 (E M Itamar Franco) ===');
if (data[10]) {
  data[10].forEach((val, idx) => {
    const letra = String.fromCharCode(65 + idx);
    console.log(`  Coluna ${letra}: ${val}`);
  });
}

// Calcular totais de todas as colunas numéricas
console.log('\n=== TOTAIS ===');
const totals = [];
for (let colIdx = 0; colIdx < data[0].length; colIdx++) {
  const letra = String.fromCharCode(65 + colIdx);
  const colName = data[0][colIdx] || `(sem nome)`;
  let total = 0;

  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const val = parseInt(data[rowIdx][colIdx]);
    if (!isNaN(val)) {
      total += val;
    }
  }

  console.log(`Coluna ${letra} - "${colName}": ${total}`);
}
