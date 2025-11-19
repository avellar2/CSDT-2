const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Colunas a desconsiderar
const COLUNAS_IGNORADAS = [
  'LAPTOP - ADM',
  'Já Recebeu equipamentos',
  'Data e recolhimento DESKTOP',
  'Data de Recebimento do desktop 2º FASE',
  'data e recolhimento desktop',
  'data de recebimento do desktop 2º fase',
  'laptop - adm',
  'já recebeu equipamentos',
  'data', // Ignorar qualquer coluna com "data"
  'qt', // Ignorar coluna de quantidade
  'pendência', // Ignorar coluna de pendência
  'fase', // Ignorar coluna de fase
];

async function importarLocados() {
  try {
    console.log('📂 Lendo arquivo Excel...');

    // Ler o arquivo Excel
    const workbook = XLSX.readFile('c:/Users/Vanderson/Desktop/IEDUCAR 18-11-2025.xlsx');

    // Pegar a primeira planilha
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`📋 Planilha: ${sheetName}`);

    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Total de linhas encontradas: ${data.length}`);

    if (data.length === 0) {
      console.log('⚠️ Nenhum dado encontrado na planilha');
      return;
    }

    // Mostrar as colunas disponíveis
    console.log('\n📋 Colunas encontradas:');
    Object.keys(data[0]).forEach((col, idx) => {
      const ignorada = COLUNAS_IGNORADAS.some(
        ignorar => col.toLowerCase().includes(ignorar.toLowerCase())
      );
      console.log(`  ${idx + 1}. ${col} ${ignorada ? '❌ (IGNORADA)' : '✅'}`);
    });

    // Debug: Mostrar primeira linha completa
    console.log('\n🔍 DEBUG - Primeira linha de dados:');
    console.log(data[0]);

    console.log('\n🔄 Processando dados...');

    // Mapear os dados
    const dadosParaImportar = [];

    for (const row of data) {
      // Pegar o nome da escola - testar múltiplas variações
      const name = row['ESCOLA'] ||
                   row['Escola'] ||
                   row['escola'] ||
                   row['ESCOLAS'] ||
                   row['Escolas'] ||
                   row['escolas'] ||
                   row['NOME'] ||
                   row['Nome'] ||
                   row['nome'] ||
                   row['UNIDADE'] ||
                   row['Unidade'] ||
                   '';

      if (!name || name.trim() === '' || typeof name !== 'string') {
        continue; // Pular linhas vazias silenciosamente
      }

      // Criar objeto com os dados, ignorando as colunas especificadas
      const item = {
        name: name.trim(),
      };

      // Helper para verificar se coluna deve ser ignorada
      const deveIgnorar = (col) => {
        return COLUNAS_IGNORADAS.some(ignorar => col.toLowerCase().includes(ignorar.toLowerCase()));
      };

      // Helper para verificar se valor é numérico válido
      const isNumeroValido = (val) => {
        return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseInt(val)));
      };

      // Mapear as colunas de equipamentos
      // PCs/Desktops
      const pcsCols = Object.keys(row).filter(col => {
        const colLower = col.toLowerCase();
        return !deveIgnorar(col) &&
               isNumeroValido(row[col]) &&
               (colLower.includes('desktop') ||
                (colLower.includes('pc') && !colLower.includes('notebook'))) &&
               !colLower.includes('laptop');
      });

      // Notebooks/Laptops
      const notebooksCols = Object.keys(row).filter(col => {
        const colLower = col.toLowerCase();
        return !deveIgnorar(col) &&
               isNumeroValido(row[col]) &&
               (colLower.includes('notebook') ||
                colLower.includes('laptop')) &&
               col !== 'LAPTOP - ADM'; // Garantir que essa seja explicitamente ignorada
      });

      // Tablets
      const tabletsCols = Object.keys(row).filter(col => {
        const colLower = col.toLowerCase();
        return !deveIgnorar(col) &&
               isNumeroValido(row[col]) &&
               colLower.includes('tablet');
      });

      // Monitores
      const monitorsCols = Object.keys(row).filter(col => {
        const colLower = col.toLowerCase();
        return !deveIgnorar(col) &&
               isNumeroValido(row[col]) &&
               colLower.includes('monitor');
      });

      // Estabilizadores
      const estabilizadoresCols = Object.keys(row).filter(col => {
        const colLower = col.toLowerCase();
        return !deveIgnorar(col) &&
               isNumeroValido(row[col]) &&
               colLower.includes('estabilizador');
      });

      // Impressoras
      const impressorasCols = Object.keys(row).filter(col => {
        const colLower = col.toLowerCase();
        return !deveIgnorar(col) &&
               isNumeroValido(row[col]) &&
               colLower.includes('impressora');
      });

      // Somar valores (caso haja múltiplas colunas)
      item.pcs = pcsCols.reduce((sum, col) => sum + (parseInt(row[col]) || 0), 0);
      item.notebooks = notebooksCols.reduce((sum, col) => sum + (parseInt(row[col]) || 0), 0);
      item.tablets = tabletsCols.reduce((sum, col) => sum + (parseInt(row[col]) || 0), 0);
      item.monitors = monitorsCols.reduce((sum, col) => sum + (parseInt(row[col]) || 0), 0);
      item.estabilizadores = estabilizadoresCols.reduce((sum, col) => sum + (parseInt(row[col]) || 0), 0);
      item.impressoras = impressorasCols.reduce((sum, col) => sum + (parseInt(row[col]) || 0), 0);

      dadosParaImportar.push(item);
    }

    console.log(`\n✅ ${dadosParaImportar.length} registros processados`);

    // Mostrar preview dos primeiros 3 registros
    console.log('\n📝 Preview dos primeiros registros:');
    dadosParaImportar.slice(0, 3).forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.name}`);
      console.log(`   PCs: ${item.pcs}`);
      console.log(`   Notebooks: ${item.notebooks}`);
      console.log(`   Tablets: ${item.tablets}`);
      console.log(`   Monitores: ${item.monitors}`);
      console.log(`   Estabilizadores: ${item.estabilizadores}`);
      console.log(`   Impressoras: ${item.impressoras}`);
    });

    // Confirmar importação
    console.log('\n⚠️ ATENÇÃO: Esta operação irá LIMPAR a tabela Locados e importar os novos dados!');
    console.log('Para continuar, execute o script com o parâmetro --confirm\n');

    if (!process.argv.includes('--confirm')) {
      console.log('❌ Importação cancelada. Use: node import-locados-from-excel.js --confirm');
      return;
    }

    // Limpar tabela existente
    console.log('\n🗑️ Limpando tabela existente...');
    await prisma.locados.deleteMany({});

    // Inserir novos dados
    console.log('💾 Inserindo novos dados...');

    let inserted = 0;
    for (const item of dadosParaImportar) {
      try {
        await prisma.locados.create({
          data: item
        });
        inserted++;
        process.stdout.write(`\r   Inseridos: ${inserted}/${dadosParaImportar.length}`);
      } catch (error) {
        console.error(`\n❌ Erro ao inserir ${item.name}:`, error.message);
      }
    }

    console.log('\n\n✅ Importação concluída com sucesso!');
    console.log(`📊 Total importado: ${inserted} registros`);

    // Mostrar resumo
    const totals = dadosParaImportar.reduce((acc, item) => ({
      pcs: acc.pcs + item.pcs,
      notebooks: acc.notebooks + item.notebooks,
      tablets: acc.tablets + item.tablets,
      monitors: acc.monitors + item.monitors,
      estabilizadores: acc.estabilizadores + item.estabilizadores,
      impressoras: acc.impressoras + item.impressoras,
    }), { pcs: 0, notebooks: 0, tablets: 0, monitors: 0, estabilizadores: 0, impressoras: 0 });

    console.log('\n📊 Resumo dos equipamentos importados:');
    console.log(`   PCs: ${totals.pcs}`);
    console.log(`   Notebooks: ${totals.notebooks}`);
    console.log(`   Tablets: ${totals.tablets}`);
    console.log(`   Monitores: ${totals.monitors}`);
    console.log(`   Estabilizadores: ${totals.estabilizadores}`);
    console.log(`   Impressoras: ${totals.impressoras}`);
    console.log(`   TOTAL: ${Object.values(totals).reduce((a, b) => a + b, 0)}`);

  } catch (error) {
    console.error('❌ Erro ao importar:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
importarLocados();
