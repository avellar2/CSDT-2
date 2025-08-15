const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// Função para extrair name do modelo
function extractName(modelo) {
  const modeloUpper = modelo.toUpperCase();
  
  const equipmentPatterns = {
    'NOTEBOOK': /NOTEBOOK|NOTE BOOK/i,
    'COMPUTADOR': /COMPUTADOR|MINI COMPUTADOR|PC\b|OPTIPLEX/i,
    'MONITOR': /MONITOR/i,
    'ESTABILIZADOR': /ESTABILIZADOR/i,
    'MOUSE': /MOUSE/i,
    'TECLADO': /TECLADO/i,
    'IMPRESSORA': /IMPRESSORA/i
  };
  
  for (const [equipmentName, pattern] of Object.entries(equipmentPatterns)) {
    if (pattern.test(modeloUpper)) {
      return equipmentName;
    }
  }
  
  return null;
}

async function main() {
  try {
    console.log('📋 Gerando relatório de problemas...');
    
    // Buscar escolas
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    });
    
    const schoolMap = {};
    schools.forEach(school => {
      schoolMap[school.name.toUpperCase()] = school.id;
    });
    
    // Ler Excel
    const excelPath = path.join(__dirname, '..', 'public', 'itens.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const categoriesNotFound = [];
    const schoolsNotFound = [];
    const validItems = [];
    
    console.log('🔄 Analisando itens...');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const serie = String(row.Serie || '').trim();
      const modelo = String(row.Modelo || '').trim();
      const local = String(row.Local || '').trim();
      
      if (!serie || !modelo) continue;
      
      // Verificar categoria
      const name = extractName(modelo);
      if (!name) {
        categoriesNotFound.push({ 
          Serie: serie, 
          Modelo: modelo, 
          Local: local,
          Problema: 'CATEGORIA NÃO IDENTIFICADA',
          Sugestao: 'Definir se é: COMPUTADOR, MONITOR, MOUSE, TECLADO, ESTABILIZADOR, IMPRESSORA, NOTEBOOK'
        });
        continue;
      }
      
      // Verificar escola
      if (local) {
        const localUpper = local.toUpperCase();
        if (!schoolMap[localUpper]) {
          schoolsNotFound.push({ 
            Serie: serie, 
            Modelo: modelo, 
            Local: local,
            Problema: 'ESCOLA NÃO ENCONTRADA',
            Sugestao: 'Corrigir nome da escola no Excel'
          });
          continue;
        }
      }
      
      validItems.push({
        Serie: serie,
        Modelo: modelo,
        Local: local,
        Status: 'OK - Pode ser inserido'
      });
    }
    
    // Criar planilha com problemas
    const workbookOutput = XLSX.utils.book_new();
    
    // Aba 1: Resumo
    const resumo = [
      ['RELATÓRIO DE IMPORTAÇÃO DE ITENS'],
      [''],
      ['Total de itens no Excel:', data.length],
      ['Itens que podem ser inseridos:', validItems.length],
      ['Itens com categoria não identificada:', categoriesNotFound.length],
      ['Itens com escola não encontrada:', schoolsNotFound.length],
      [''],
      ['CATEGORIAS VÁLIDAS:'],
      ['COMPUTADOR'],
      ['MONITOR'],
      ['MOUSE'],
      ['TECLADO'],
      ['ESTABILIZADOR'],
      ['IMPRESSORA'],
      ['NOTEBOOK']
    ];
    
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    XLSX.utils.book_append_sheet(workbookOutput, wsResumo, 'RESUMO');
    
    // Aba 2: Categoria não identificada
    if (categoriesNotFound.length > 0) {
      const wsCategorias = XLSX.utils.json_to_sheet(categoriesNotFound);
      XLSX.utils.book_append_sheet(workbookOutput, wsCategorias, 'CATEGORIA_NAO_IDENTIFICADA');
    }
    
    // Aba 3: Escola não encontrada
    if (schoolsNotFound.length > 0) {
      const wsEscolas = XLSX.utils.json_to_sheet(schoolsNotFound);
      XLSX.utils.book_append_sheet(workbookOutput, wsEscolas, 'ESCOLA_NAO_ENCONTRADA');
    }
    
    // Aba 4: Escolas únicas não encontradas
    if (schoolsNotFound.length > 0) {
      const escolasUnicas = [...new Set(schoolsNotFound.map(item => item.Local))].map(escola => ({
        'Nome no Excel': escola,
        'Status': 'Não encontrada no banco',
        'Ação': 'Corrigir grafia ou cadastrar escola'
      }));
      
      const wsEscolasUnicas = XLSX.utils.json_to_sheet(escolasUnicas);
      XLSX.utils.book_append_sheet(workbookOutput, wsEscolasUnicas, 'ESCOLAS_PARA_CORRIGIR');
    }
    
    // Aba 5: Itens válidos (amostra dos primeiros 100)
    if (validItems.length > 0) {
      const amostraValidos = validItems.slice(0, 100);
      const wsValidos = XLSX.utils.json_to_sheet(amostraValidos);
      XLSX.utils.book_append_sheet(workbookOutput, wsValidos, 'ITENS_VALIDOS_AMOSTRA');
    }
    
    // Salvar arquivo
    const outputPath = path.join(__dirname, '..', 'relatorio-problemas-importacao.xlsx');
    XLSX.writeFile(workbookOutput, outputPath);
    
    console.log('✅ Relatório gerado com sucesso!');
    console.log(`📁 Arquivo salvo em: ${outputPath}`);
    console.log('\n📊 RESUMO:');
    console.log(`- Total de itens: ${data.length}`);
    console.log(`- Itens válidos: ${validItems.length}`);
    console.log(`- Problemas de categoria: ${categoriesNotFound.length}`);
    console.log(`- Problemas de escola: ${schoolsNotFound.length}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();