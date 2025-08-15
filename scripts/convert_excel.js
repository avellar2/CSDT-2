const XLSX = require('xlsx');
const fs = require('fs');

try {
  // Ler o arquivo Excel
  const workbook = XLSX.readFile('public/itens.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converter para JSON primeiro para análise
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Primeiras 3 linhas do Excel:');
  console.log(data.slice(0, 3));
  console.log('\nColunas disponíveis:', Object.keys(data[0] || {}));
  
  // Converter para CSV
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  fs.writeFileSync('public/itens_converted.csv', csv, 'utf8');
  
  console.log('\nArquivo convertido para public/itens_converted.csv');
  
} catch (error) {
  console.error('Erro:', error.message);
}