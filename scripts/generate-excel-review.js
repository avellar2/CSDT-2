const ExcelJS = require('exceljs');
const fs = require('fs');

// Carregar relatório
const report = JSON.parse(fs.readFileSync('./deep-analysis-schools-report.json', 'utf8'));

async function generateExcelReview() {
  const workbook = new ExcelJS.Workbook();
  
  // Aba 1: Matches confirmados (alta confiança)
  const confirmedSheet = workbook.addWorksheet('Matches Confirmados');
  confirmedSheet.columns = [
    { header: 'Nome da Escola (Atual)', key: 'escola_atual', width: 60 },
    { header: 'Nome no Maps 2020', key: 'maps_2020', width: 45 },
    { header: 'Distrito', key: 'distrito', width: 15 },
    { header: 'Confiança (%)', key: 'confianca', width: 12 },
    { header: 'Status', key: 'status', width: 15 }
  ];
  
  // Estilo do cabeçalho
  confirmedSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4CAF50' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
  });
  
  // Adicionar dados dos matches confirmados
  report.high_confidence_matches.forEach((match, index) => {
    const row = confirmedSheet.addRow({
      escola_atual: match.existing_name,
      maps_2020: match.maps_name,
      distrito: match.district,
      confianca: Math.round(match.confidence * 100),
      status: 'CONFIRMADO'
    });
    
    // Colorir linha alternada
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F5F5F5' }
        };
      });
    }
  });
  
  // Aba 2: Escolas para revisão manual
  const reviewSheet = workbook.addWorksheet('Para Revisão Manual');
  reviewSheet.columns = [
    { header: 'Nome da Escola (Atual)', key: 'escola_atual', width: 60 },
    { header: 'Candidato 1 - Nome', key: 'candidato1_nome', width: 45 },
    { header: 'Candidato 1 - Distrito', key: 'candidato1_distrito', width: 15 },
    { header: 'Candidato 1 - Conf %', key: 'candidato1_conf', width: 12 },
    { header: 'Candidato 2 - Nome', key: 'candidato2_nome', width: 45 },
    { header: 'Candidato 2 - Distrito', key: 'candidato2_distrito', width: 15 },
    { header: 'Candidato 2 - Conf %', key: 'candidato2_conf', width: 12 },
    { header: 'Candidato 3 - Nome', key: 'candidato3_nome', width: 45 },
    { header: 'Candidato 3 - Distrito', key: 'candidato3_distrito', width: 15 },
    { header: 'Candidato 3 - Conf %', key: 'candidato3_conf', width: 12 },
    { header: 'Decisão Manual', key: 'decisao', width: 20 },
    { header: 'Distrito Final', key: 'distrito_final', width: 15 },
    { header: 'Observações', key: 'observacoes', width: 30 }
  ];
  
  // Estilo do cabeçalho
  reviewSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9800' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
  });
  
  // Adicionar dados dos matches potenciais
  report.potential_matches.forEach((match, index) => {
    const candidatos = match.candidates;
    const rowData = {
      escola_atual: match.existing_name,
      candidato1_nome: candidatos[0]?.maps_name || '',
      candidato1_distrito: candidatos[0]?.district || '',
      candidato1_conf: candidatos[0] ? Math.round(candidatos[0].confidence * 100) : 0,
      candidato2_nome: candidatos[1]?.maps_name || '',
      candidato2_distrito: candidatos[1]?.district || '',
      candidato2_conf: candidatos[1] ? Math.round(candidatos[1].confidence * 100) : 0,
      candidato3_nome: candidatos[2]?.maps_name || '',
      candidato3_distrito: candidatos[2]?.district || '',
      candidato3_conf: candidatos[2] ? Math.round(candidatos[2].confidence * 100) : 0,
      decisao: '', // Para preenchimento manual
      distrito_final: '', // Para preenchimento manual
      observacoes: '' // Para preenchimento manual
    };
    
    const row = reviewSheet.addRow(rowData);
    
    // Colorir por prioridade
    const bestConfidence = candidatos[0]?.confidence || 0;
    let fillColor = 'FFFFFF'; // Branco padrão
    
    if (bestConfidence > 0.6) {
      fillColor = 'C8E6C9'; // Verde claro - alta prioridade
    } else if (bestConfidence > 0.4) {
      fillColor = 'FFE0B2'; // Laranja claro - média prioridade
    } else {
      fillColor = 'FFCDD2'; // Vermelho claro - baixa prioridade
    }
    
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
    });
    
    // Destacar as células de decisão manual
    row.getCell('decisao').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9C4' }
    };
    row.getCell('distrito_final').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9C4' }
    };
  });
  
  // Aba 3: Escolas sem match (provavelmente pós-2020)
  const noMatchSheet = workbook.addWorksheet('Sem Match (Pós-2020)');
  noMatchSheet.columns = [
    { header: 'Nome da Escola', key: 'nome_escola', width: 70 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Possível Distrito', key: 'distrito_possivel', width: 20 },
    { header: 'Observações', key: 'observacoes', width: 40 }
  ];
  
  // Estilo do cabeçalho
  noMatchSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '607D8B' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
  });
  
  // Carregar escolas sem match
  const existingSchools = JSON.parse(fs.readFileSync('./src/utils/schools.json', 'utf8'));
  const matchedNames = new Set([
    ...report.high_confidence_matches.map(m => m.existing_name),
    ...report.potential_matches.map(m => m.existing_name)
  ]);
  
  const noMatchSchools = existingSchools.filter(school => 
    !matchedNames.has(school.name)
  );
  
  noMatchSchools.forEach((school, index) => {
    let categoria = 'ESCOLA NOVA';
    let observacoes = 'Provavelmente inaugurada após 2020';
    
    // Categorizar por padrões
    const name = school.name.toUpperCase();
    if (name.includes('CENTRO INTEGRADO')) {
      categoria = 'CIEP/BRIZOLÃO';
      observacoes = 'Centro Integrado - verificar se é renovação de escola existente';
    } else if (name.includes('CRECHE')) {
      categoria = 'CRECHE NOVA';
      observacoes = 'Creche nova - pode ter substituído outra unidade';
    } else if (name.includes('BRIZOLAO')) {
      categoria = 'BRIZOLÃO NOVO';
      observacoes = 'Brizolão novo - verificar número/código';
    }
    
    const row = noMatchSheet.addRow({
      nome_escola: school.name,
      categoria: categoria,
      distrito_possivel: '', // Para preenchimento manual
      observacoes: observacoes
    });
    
    // Colorir por categoria
    let fillColor = 'F5F5F5';
    if (categoria === 'CRECHE NOVA') fillColor = 'E1F5FE';
    if (categoria === 'CIEP/BRIZOLÃO') fillColor = 'F3E5F5';
    if (categoria === 'BRIZOLÃO NOVO') fillColor = 'FFF3E0';
    
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      });
    }
  });
  
  // Aba 4: Resumo e instruções
  const summarySheet = workbook.addWorksheet('Resumo e Instruções');
  summarySheet.columns = [
    { header: 'Informação', key: 'info', width: 30 },
    { header: 'Valor', key: 'valor', width: 20 },
    { header: 'Descrição', key: 'descricao', width: 60 }
  ];
  
  // Dados do resumo
  const summaryData = [
    { info: 'Total de Escolas', valor: existingSchools.length, descricao: 'Total de escolas na base atual' },
    { info: 'Matches Confirmados', valor: report.high_confidence_matches.length, descricao: 'Escolas com distrito identificado (confiança >70%)' },
    { info: 'Para Revisão Manual', valor: report.potential_matches.length, descricao: 'Escolas que precisam de análise humana' },
    { info: 'Sem Match', valor: noMatchSchools.length, descricao: 'Escolas provavelmente inauguradas após 2020' },
    { info: '', valor: '', descricao: '' },
    { info: 'INSTRUÇÕES:', valor: '', descricao: '' },
    { info: 'Cores na aba Revisão:', valor: '', descricao: '' },
    { info: '- Verde claro', valor: '>60%', descricao: 'Alta prioridade - muito provável ser a mesma escola' },
    { info: '- Laranja claro', valor: '40-60%', descricao: 'Média prioridade - possível match' },
    { info: '- Vermelho claro', valor: '<40%', descricao: 'Baixa prioridade - improvável' },
    { info: '', valor: '', descricao: '' },
    { info: 'Como preencher:', valor: '', descricao: '' },
    { info: '1. Decisão Manual', valor: 'SIM/NÃO', descricao: 'SIM se for a mesma escola, NÃO se for diferente' },
    { info: '2. Distrito Final', valor: '1º/2º/3º', descricao: 'Distrito da escola (se decidiu SIM)' },
    { info: '3. Observações', valor: 'Texto', descricao: 'Motivo da decisão ou informações adicionais' }
  ];
  
  summaryData.forEach(item => {
    summarySheet.addRow(item);
  });
  
  // Formatação do resumo
  summarySheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2196F3' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
  });
  
  // Salvar arquivo
  const fileName = `escolas-revisao-manual-${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  
  console.log(`✅ Excel gerado com sucesso: ${fileName}`);
  console.log('\n📊 CONTEÚDO DO ARQUIVO:');
  console.log(`📋 Aba 1 - Matches Confirmados: ${report.high_confidence_matches.length} escolas`);
  console.log(`🤔 Aba 2 - Para Revisão Manual: ${report.potential_matches.length} escolas`);
  console.log(`❓ Aba 3 - Sem Match: ${noMatchSchools.length} escolas`);
  console.log(`ℹ️ Aba 4 - Resumo e Instruções`);
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Abrir o arquivo Excel');
  console.log('2. Focar na aba "Para Revisão Manual"');
  console.log('3. Começar pelas linhas VERDES (alta prioridade)');
  console.log('4. Preencher as colunas "Decisão Manual" e "Distrito Final"');
  console.log('5. Salvar e enviar de volta para processamento');
}

// Executar
if (require.main === module) {
  generateExcelReview().catch(console.error);
}

module.exports = { generateExcelReview };