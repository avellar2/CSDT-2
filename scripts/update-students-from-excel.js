const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function updateStudentsFromExcel() {
  try {
    console.log('🔄 Iniciando atualização de alunos a partir do Excel...\n');
    
    // Caminho para o arquivo Excel na raiz do projeto
    const excelPath = path.join(__dirname, '..', 'alunos.xlsx');
    
    console.log(`📂 Lendo arquivo Excel: ${excelPath}`);
    
    // Ler o arquivo Excel
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0]; // Primeira aba
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Encontradas ${data.length} linhas no Excel\n`);
    
    // Buscar todas as escolas do banco
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        inep: true,
        students: true
      }
    });
    
    console.log(`🏫 Encontradas ${schools.length} escolas no banco de dados\n`);
    
    // Criar mapa de escolas por INEP para busca rápida
    const schoolsMap = new Map();
    schools.forEach(school => {
      if (school.inep && school.inep !== 0) {
        schoolsMap.set(school.inep.toString(), school);
      }
    });
    
    let updated = 0;
    let notFound = [];
    let errors = [];
    
    // Processar cada linha do Excel
    for (const row of data) {
      try {
        // Assumindo que as colunas são 'INEP' e 'ALUNOS' (ajustar conforme necessário)
        const inepValue = row['INEP'] || row['inep'] || row['Inep'] || row['CÓDIGO INEP'] || row['codigo_inep'];
        const studentsValue = row['ALUNOS'] || row['alunos'] || row['Alunos'] || row['TOTAL_ALUNOS'] || row['total_alunos'];
        
        if (!inepValue || studentsValue === undefined || studentsValue === null) {
          console.log(`⚠️  Linha ignorada - INEP ou ALUNOS vazio:`, row);
          continue;
        }
        
        const inepStr = inepValue.toString();
        const studentsCount = parseInt(studentsValue) || 0;
        
        // Procurar escola por INEP
        const school = schoolsMap.get(inepStr);
        
        if (school) {
          // Atualizar número de alunos
          await prisma.school.update({
            where: { id: school.id },
            data: { students: studentsCount }
          });
          
          console.log(`✅ Atualizada: ${school.name} (INEP: ${inepStr}) - Alunos: ${school.students} → ${studentsCount}`);
          updated++;
        } else {
          // INEP não encontrado no banco
          notFound.push({
            inep: inepStr,
            alunos: studentsCount,
            dadosOriginais: row
          });
        }
        
      } catch (error) {
        errors.push({
          row: row,
          error: error.message
        });
        console.error(`❌ Erro ao processar linha:`, row, error.message);
      }
    }
    
    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RELATÓRIO FINAL');
    console.log('='.repeat(60));
    console.log(`✅ Escolas atualizadas: ${updated}`);
    console.log(`❌ INEPs não encontrados: ${notFound.length}`);
    console.log(`⚠️  Erros de processamento: ${errors.length}`);
    
    if (notFound.length > 0) {
      console.log('\n🔍 ESCOLAS DO EXCEL QUE NÃO FORAM ENCONTRADAS NO BANCO:');
      console.log('-'.repeat(60));
      notFound.forEach((item, index) => {
        console.log(`${index + 1}. INEP: ${item.inep} - Alunos: ${item.alunos}`);
        
        // Mostrar dados originais da linha para debug
        const originalKeys = Object.keys(item.dadosOriginais);
        if (originalKeys.length > 0) {
          console.log(`   Dados originais: ${JSON.stringify(item.dadosOriginais)}`);
        }
      });
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERROS DE PROCESSAMENTO:');
      console.log('-'.repeat(60));
      errors.forEach((error, index) => {
        console.log(`${index + 1}. Erro: ${error.error}`);
        console.log(`   Linha: ${JSON.stringify(error.row)}`);
      });
    }
    
    console.log('\n✅ Processo finalizado!');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
updateStudentsFromExcel();