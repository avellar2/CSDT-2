const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function updateLaboratorioFromExcel() {
  try {
    console.log('🔄 Iniciando atualização de laboratórios a partir do Excel...\n');
    
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
    
    // Processar cada linha do Excel
    for (const row of data) {
      try {
        // Buscar as colunas INEP e LB
        const inepValue = row['INEP'] || row['inep'] || row['Inep'] || row['CÓDIGO INEP'] || row['codigo_inep'];
        const lbValue = row['LB'] || row['lb'] || row['Lb'] || row['LAB'] || row['lab'];
        
        if (!inepValue || lbValue === undefined || lbValue === null || lbValue === '') {
          console.log(`⚠️  Linha ignorada - INEP ou LB vazio:`, {
            nome: row['NOME  DA  UNIDADE ESCOLAR'] || row['nome'] || 'N/A',
            inep: inepValue,
            lb: lbValue
          });
          continue;
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
        
        // Procurar escola por INEP
        const school = schoolsMap.get(inepStr);
        
        if (school) {
          // Tentar atualizar o campo laboratorio
          // Como o campo pode não existir ainda, vamos usar raw SQL
          try {
            // Primeiro tentar verificar se a coluna existe
            await prisma.$executeRaw`
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'School' AND column_name = 'laboratorio') THEN
                  ALTER TABLE "School" ADD COLUMN "laboratorio" INTEGER DEFAULT 0;
                END IF;
              END $$;
            `;
            
            // Agora atualizar o valor
            await prisma.school.update({
              where: { id: school.id },
              data: { laboratorio: lbCount }
            });
            
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
        } else {
          // INEP não encontrado no banco
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
    
    if (notFound.length > 0) {
      console.log('\n🔍 ESCOLAS COM LB QUE NÃO FORAM ENCONTRADAS NO BANCO:');
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
updateLaboratorioFromExcel();