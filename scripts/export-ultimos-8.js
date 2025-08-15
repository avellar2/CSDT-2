const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// Função para extrair name do modelo
function extractNameAndBrand(modelo) {
  const modeloUpper = modelo.toUpperCase();
  
  const equipmentPatterns = {
    'NOTEBOOK': /NOTEBOOK|NOTE BOOK/i,
    'COMPUTADOR': /COMPUTADOR|MINI COMPUTADOR|PC\b|OPTIPLEX/i,
    'MONITOR': /MONITOR/i,
    'ESTABILIZADOR': /ESTABILIZADOR|NOBREAK/i,
    'MOUSE': /MOUSE/i,
    'TECLADO': /TECLADO/i,
    'IMPRESSORA': /IMPRESSORA|LASER|MFP|LASERJET/i,
    'ACESSORIO': /CABO|ACESSORIO/i,
    'SERVIDOR': /SERVIDOR/i,
    'SCANNER': /SCANNER/i
  };
  
  // Identificar o tipo de equipamento
  let name = null;
  for (const [equipmentName, pattern] of Object.entries(equipmentPatterns)) {
    if (pattern.test(modeloUpper)) {
      name = equipmentName;
      break;
    }
  }
  
  // Extrair brand
  let brand = 'GENÉRICO';
  
  if (name === 'IMPRESSORA') {
    const printerBrands = ['HP', 'KYOCERA', 'RICOH', 'XEROX', 'OKI', 'OKIDATA'];
    
    for (const printerBrand of printerBrands) {
      if (modeloUpper.includes(printerBrand)) {
        brand = modelo.replace(/IMPRESSORA\s*/i, '').trim();
        break;
      }
    }
  } else {
    const generalBrands = ['DELL', 'LENOVO', 'HP', 'ASUS', 'ACER', 'SAMSUNG', 'LG', 'AOC', 'EPSON', 'CANON', 'POWEREST', 'SMS'];
    
    for (const generalBrand of generalBrands) {
      if (modeloUpper.includes(generalBrand)) {
        const equipmentWord = name || '';
        brand = modelo.replace(new RegExp(equipmentWord + '\\s*', 'i'), '').trim();
        break;
      }
    }
  }
  
  return { name, brand };
}

async function main() {
  try {
    console.log('📋 Gerando planilha dos últimos 8 itens...');
    
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
    
    const itemsWithProblems = [];
    
    console.log('🔄 Identificando os 8 itens...');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const serie = String(row.Serie || '').trim();
      const modelo = String(row.Modelo || '').trim();
      const local = String(row.Local || '').trim();
      
      if (!serie || !modelo) continue;
      
      // Verificar categoria
      const { name, brand } = extractNameAndBrand(modelo);
      if (!name) continue;
      
      // Verificar escola
      if (local) {
        const localUpper = local.toUpperCase();
        if (!schoolMap[localUpper]) {
          itemsWithProblems.push({
            'Número de Série': serie,
            'Modelo Completo': modelo,
            'Nome de Escola no Excel': local,
            'Categoria Identificada': name,
            'Marca Identificada': brand,
            'Status': 'ESCOLA NÃO ENCONTRADA',
            'Ação Necessária': 'Inserir manualmente ou corrigir nome da escola',
            'userId para usar': 'cacfec45-6d8e-4179-8817-7fc43a19fd11'
          });
        }
      }
    }
    
    // Criar planilha
    const workbookOutput = XLSX.utils.book_new();
    
    // Aba 1: Instruções
    const instrucoes = [
      ['ÚLTIMOS 8 ITENS PARA INSERÇÃO MANUAL'],
      [''],
      ['INSTRUÇÕES:'],
      ['1. Estes são os únicos itens que não entraram no banco'],
      ['2. Total inserido automaticamente: 1.984 de 1.992 (99,6%)'],
      ['3. Para inserir manualmente use:'],
      ['   - serialNumber = Número de Série'],
      ['   - name = Categoria Identificada'],
      ['   - brand = Marca Identificada'],
      ['   - userId = cacfec45-6d8e-4179-8817-7fc43a19fd11'],
      ['   - schoolId = ID da escola correta'],
      ['   - status = DISPONIVEL'],
      [''],
      ['PROBLEMA: Nomes de escola não encontrados no banco'],
      ['ESCOLAS QUE PRECISAM CORREÇÃO:'],
      ['- DE FREITAS LIMA'],
      ['- ALVES DA SILVA'],
      ['- CRECHE MUNICIPAL PROFª JESUÍNA FÁTIMA DE ANDRADE'],
      ['- CRECHE MUN LUCIA DE FATIMA BONFIN DE CASTRO E SILVA']
    ];
    
    const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
    XLSX.utils.book_append_sheet(workbookOutput, wsInstrucoes, 'INSTRUÇÕES');
    
    // Aba 2: Itens para inserir
    if (itemsWithProblems.length > 0) {
      const wsItens = XLSX.utils.json_to_sheet(itemsWithProblems);
      XLSX.utils.book_append_sheet(workbookOutput, wsItens, 'ITENS_PARA_INSERIR');
    }
    
    // Aba 3: Escolas disponíveis no banco (amostra)
    const schoolsSample = schools.slice(0, 50).map(school => ({
      'ID': school.id,
      'Nome da Escola': school.name
    }));
    
    const wsEscolas = XLSX.utils.json_to_sheet(schoolsSample);
    XLSX.utils.book_append_sheet(workbookOutput, wsEscolas, 'ESCOLAS_DISPONÍVEIS');
    
    // Salvar arquivo
    const outputPath = path.join(__dirname, '..', 'ultimos-8-itens-manual.xlsx');
    XLSX.writeFile(workbookOutput, outputPath);
    
    console.log('✅ Planilha gerada com sucesso!');
    console.log(`📁 Arquivo salvo em: ${outputPath}`);
    console.log(`📊 ${itemsWithProblems.length} itens listados para inserção manual`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();