const XLSX = require('xlsx');
const path = require('path');

// Ler o arquivo Excel
const excelPath = path.join(__dirname, '..', 'public', 'itens.xlsx');
console.log('Lendo arquivo:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Total de linhas:', data.length);
  console.log('\nPrimeiras 5 linhas:');
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
  
  // Mostrar as colunas disponíveis
  if (data.length > 0) {
    console.log('\nColunas disponíveis:');
    Object.keys(data[0]).forEach(col => console.log(`- ${col}`));
  }
  
} catch (error) {
  console.error('Erro ao ler Excel:', error.message);
}