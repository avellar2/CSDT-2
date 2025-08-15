const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// Categorias pré-definidas
const VALID_CATEGORIES = ['COMPUTADOR', 'MONITOR', 'MOUSE', 'TECLADO', 'ESTABILIZADOR', 'IMPRESSORA', 'NOTEBOOK', 'ACESSORIO', 'SERVIDOR', 'SCANNER'];

// Função para extrair name e brand do modelo
function extractNameAndBrand(modelo) {
  const modeloUpper = modelo.toUpperCase();
  
  // Padrões para identificar equipamentos nas categorias válidas
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
  
  // Identificar o tipo de equipamento primeiro
  let name = null;
  for (const [equipmentName, pattern] of Object.entries(equipmentPatterns)) {
    if (pattern.test(modeloUpper)) {
      name = equipmentName;
      break;
    }
  }
  
  // Extrair brand baseado no name identificado
  let brand = 'GENÉRICO';
  
  if (name === 'IMPRESSORA') {
    // Para impressoras, verificar marcas específicas
    const printerBrands = ['HP', 'KYOCERA', 'RICOH', 'XEROX', 'OKI', 'OKIDATA'];
    
    for (const printerBrand of printerBrands) {
      if (modeloUpper.includes(printerBrand)) {
        // Remover a palavra "IMPRESSORA" e pegar o resto
        brand = modelo.replace(/IMPRESSORA\s*/i, '').trim();
        break;
      }
    }
  } else {
    // Para outros equipamentos, verificar marcas conhecidas
    const generalBrands = ['DELL', 'LENOVO', 'HP', 'ASUS', 'ACER', 'SAMSUNG', 'LG', 'AOC', 'EPSON', 'CANON', 'POWEREST', 'SMS'];
    
    for (const generalBrand of generalBrands) {
      if (modeloUpper.includes(generalBrand)) {
        // Remover o tipo de equipamento e pegar o resto
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
    console.log('🚀 Iniciando processo de importação de itens...\n');
    
    // 1. Buscar todas as escolas
    console.log('📋 Buscando escolas cadastradas...');
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    });
    
    const schoolMap = {};
    schools.forEach(school => {
      schoolMap[school.name.toUpperCase()] = school.id;
    });
    
    console.log(`✅ ${schools.length} escolas encontradas\n`);
    
    // 2. Ler arquivo Excel
    console.log('📖 Lendo arquivo Excel...');
    const excelPath = path.join(__dirname, '..', 'public', 'itens.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ ${data.length} itens encontrados no Excel\n`);
    
    // 3. Processar dados
    const itemsToInsert = [];
    const categoriesNotFound = [];
    const schoolsNotFound = [];
    const duplicateSerials = [];
    const otherErrors = [];
    
    console.log('🔄 Processando itens...');
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const serie = String(row.Serie || '').trim();
      const modelo = String(row.Modelo || '').trim();
      const local = String(row.Local || '').trim();
      
      // Validar dados obrigatórios
      if (!serie || !modelo) {
        otherErrors.push(`O item da linha ${i + 2} não entrou no banco de dados (série ou modelo vazio)`);
        continue;
      }
      
      // Extrair name e brand
      const { name, brand } = extractNameAndBrand(modelo);
      
      // Verificar se conseguiu classificar na categoria
      if (!name) {
        categoriesNotFound.push({
          serie: serie,
          modelo: modelo,
          local: local
        });
        continue;
      }
      
      // Validar escola
      let schoolId = null;
      if (local) {
        const localUpper = local.toUpperCase();
        schoolId = schoolMap[localUpper];
        
        if (!schoolId) {
          schoolsNotFound.push({
            serie: serie,
            modelo: modelo,
            local: local
          });
          continue;
        }
      }
      
      itemsToInsert.push({
        serialNumber: serie,
        name,
        brand,
        schoolId,
        userId: 'cacfec45-6d8e-4179-8817-7fc43a19fd11',
        status: 'DISPONIVEL'
      });
    }
    
    console.log(`✅ ${itemsToInsert.length} itens válidos para inserção\n`);
    
    // 4. Inserir no banco
    console.log('💾 Inserindo itens no banco de dados...');
    let successCount = 0;
    
    for (const item of itemsToInsert) {
      try {
        await prisma.item.create({
          data: item
        });
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`✅ ${successCount} itens inseridos...`);
        }
      } catch (error) {
        if (error.code === 'P2002') {
          duplicateSerials.push(`O item de série ${item.serialNumber} não entrou no banco de dados (série já existe)`);
        } else {
          otherErrors.push(`O item de série ${item.serialNumber} não entrou no banco de dados: ${error.message}`);
        }
      }
    }
    
    // 5. Relatório final
    console.log('\n📊 RELATÓRIO FINAL:');
    console.log(`✅ Itens inseridos com sucesso: ${successCount}`);
    console.log(`❌ Itens que não entraram: ${data.length - successCount}`);
    
    if (categoriesNotFound.length > 0) {
      console.log(`\n🏷️ ITENS QUE NÃO SE ENCAIXAM EM NENHUMA CATEGORIA (${categoriesNotFound.length}):`);
      console.log('Categorias válidas: COMPUTADOR, MONITOR, MOUSE, TECLADO, ESTABILIZADOR, IMPRESSORA, NOTEBOOK, ACESSORIO, SERVIDOR, SCANNER\n');
      categoriesNotFound.forEach(item => {
        console.log(`- Série ${item.serie}: ${item.modelo}`);
      });
    }
    
    if (schoolsNotFound.length > 0) {
      console.log(`\n🏫 ESCOLAS NÃO ENCONTRADAS (${schoolsNotFound.length} itens):`);
      const uniqueSchools = [...new Set(schoolsNotFound.map(item => item.local))];
      console.log('Escolas não encontradas no banco:');
      uniqueSchools.forEach(school => {
        console.log(`- ${school}`);
      });
      
      console.log('\nItens afetados:');
      schoolsNotFound.forEach(item => {
        console.log(`- Série ${item.serie}: ${item.modelo} (Local: ${item.local})`);
      });
    }
    
    if (duplicateSerials.length > 0) {
      console.log(`\n🔄 SÉRIES DUPLICADAS (${duplicateSerials.length}):`);
      duplicateSerials.forEach(msg => console.log(`- ${msg}`));
    }
    
    if (otherErrors.length > 0) {
      console.log(`\n❌ OUTROS ERROS (${otherErrors.length}):`);
      otherErrors.forEach(msg => console.log(`- ${msg}`));
    }
    
    console.log('\n🎉 Processo concluído!');
    console.log('\n📝 RESUMO PARA CORREÇÃO:');
    if (categoriesNotFound.length > 0) {
      console.log(`- ${categoriesNotFound.length} itens precisam ter categoria definida no Excel`);
    }
    if (schoolsNotFound.length > 0) {
      console.log(`- ${schoolsNotFound.length} itens têm nomes de escola incorretos no Excel`);
    }
    if (duplicateSerials.length > 0) {
      console.log(`- ${duplicateSerials.length} itens têm série duplicada`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
main();