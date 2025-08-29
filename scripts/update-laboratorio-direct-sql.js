const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function updateLaboratorioFromExcelDirectSQL() {
  try {
    console.log('🔄 Iniciando atualização de laboratórios com SQL direto...\n');
    
    // Primeiro, adicionar a coluna se não existir
    try {
      await prisma.$executeRaw`
        ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "laboratorio" INTEGER DEFAULT 0;
      `;
      console.log('✅ Coluna laboratorio adicionada/verificada na tabela School\n');
    } catch (error) {
      console.log('⚠️  Coluna laboratorio já existe ou erro:', error.message);
    }
    
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
        inep: true
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
    let hasLbData = [];
    
    // Processar cada linha do Excel
    for (const row of data) {
      try {
        // Buscar as colunas INEP e LB
        const inepValue = row['INEP'] || row['inep'] || row['Inep'] || row['CÓDIGO INEP'] || row['codigo_inep'];
        const lbValue = row['LB'] || row['lb'] || row['Lb'] || row['LAB'] || row['lab'];
        
        if (!inepValue || lbValue === undefined || lbValue === null || lbValue === '') {
          continue; // Pular linhas sem dados de LB
        }
        
        const inepStr = inepValue.toString();
        let lbCount = 0;
        
        // Tratar diferentes formatos do campo LB
        if (typeof lbValue === 'number') {
          lbCount = lbValue;
        } else if (typeof lbValue === 'string') {
          // Tentar converter string para número
          const parsed = parseInt(lbValue.replace(/[^0-9]/g, ''));
          lbCount = isNaN(parsed) ? 0 : parsed;
        }
        
        // Só processar se tiver dados de LB
        if (lbCount > 0) {
          hasLbData.push({
            inep: inepStr,
            lb: lbCount,
            nome: row['NOME  DA  UNIDADE ESCOLAR'] || 'N/A'
          });
        }
        
        // Procurar escola por INEP
        const school = schoolsMap.get(inepStr);
        
        if (school && lbCount >= 0) {
          try {
            // Usar SQL direto para atualizar
            await prisma.$executeRaw`
              UPDATE "School" SET "laboratorio" = ${lbCount} WHERE "id" = ${school.id};
            `;
            
            console.log(`✅ Atualizada: ${school.name} (INEP: ${inepStr}) - Laboratório: ${lbCount} itens`);
            updated++;
          } catch (updateError) {
            console.log(`⚠️  Erro ao atualizar ${school.name}: ${updateError.message}`);
            errors.push({
              school: school.name,
              inep: inepStr,
              error: updateError.message
            });
          }
        } else if (lbCount > 0) {
          // INEP não encontrado no banco mas tem dados de LB
          notFound.push({
            inep: inepStr,
            lb: lbCount,
            nome: row['NOME  DA  UNIDADE ESCOLAR'] || 'N/A'
          });
        }
        
      } catch (error) {
        errors.push({
          row: row,
          error: error.message
        });
        console.error(`❌ Erro ao processar linha:`, error.message);
      }
    }
    
    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RELATÓRIO FINAL - LABORATÓRIOS');
    console.log('='.repeat(60));
    console.log(`✅ Escolas atualizadas: ${updated}`);
    console.log(`❌ INEPs não encontrados: ${notFound.length}`);
    console.log(`⚠️  Erros de processamento: ${errors.length}`);
    console.log(`📊 Total de escolas com dados de LB no Excel: ${hasLbData.length}`);
    
    if (hasLbData.length > 0) {
      console.log('\n🏫 TODAS AS ESCOLAS COM LABORATÓRIO NO EXCEL:');
      console.log('-'.repeat(60));
      hasLbData.forEach((item, index) => {
        const found = schoolsMap.has(item.inep) ? '✅' : '❌';
        console.log(`${index + 1}. ${found} ${item.nome} - INEP: ${item.inep} - LB: ${item.lb} itens`);
      });
    }
    
    if (notFound.length > 0) {
      console.log('\n❌ ESCOLAS COM LB QUE NÃO FORAM ENCONTRADAS NO BANCO:');
      console.log('-'.repeat(60));
      notFound.forEach((item, index) => {
        console.log(`${index + 1}. ${item.nome} - INEP: ${item.inep} - LB: ${item.lb} itens`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERROS DE PROCESSAMENTO:');
      console.log('-'.repeat(60));
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.school || 'Linha desconhecida'}`);
        console.log(`   Erro: ${error.error}`);
      });
    }
    
    console.log('\n✅ Processo de laboratórios finalizado!');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
updateLaboratorioFromExcelDirectSQL();