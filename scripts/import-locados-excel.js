const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function importLocados() {
  try {
    console.log('Iniciando importação...');

    // Caminho da planilha
    const excelPath = path.join('c:', 'Users', 'Vanderson', 'Desktop', 'COMPUTADORES LOCADOS TOTAL.xlsx');

    // Ler a planilha
    console.log('Lendo planilha:', excelPath);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('Dados lidos da planilha:', data.length, 'linhas');
    console.log('Primeiras linhas:', data.slice(0, 3));

    // Limpar tabela locados
    console.log('Limpando tabela locados...');
    await prisma.locados.deleteMany({});

    // Inserir novos dados
    console.log('Inserindo novos dados...');
    let count = 0;

    for (const row of data) {
      // Buscar as colunas "Escolas" e "TOTAL"
      const escola = row['Escolas'] || row['ESCOLAS'] || row['escolas'];
      const total = row['TOTAL'] || row['Total'] || row['total'];

      if (escola && total !== undefined && total !== null) {
        await prisma.locados.create({
          data: {
            name: escola.toString().trim(),
            pcs: parseInt(total) || 0,
            notebooks: 0,
            tablets: 0,
            estabilizadores: 0,
            impressoras: 0
          }
        });
        count++;
        console.log(`✓ Importado: ${escola} - ${total} PCs`);
      }
    }

    console.log(`\n✅ Importação concluída! ${count} escolas importadas.`);

  } catch (error) {
    console.error('❌ Erro ao importar:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importLocados();
