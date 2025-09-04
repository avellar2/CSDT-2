const fs = require('fs');

// Carrega a lista de escolas
const schools = JSON.parse(fs.readFileSync('./src/utils/schools.json', 'utf8'));

// Lista dos PDFs
const pdfFiles = [
  "ALVARO ALBERTO 2.pdf", "ALVARO ALBERTO.pdf", "AMELIA CAMARA.pdf", "ANA NERY.pdf", "ANTON.pdf", 
  "BAIRRO CALIFORNIA.pdf", "BARRO BRANCO.pdf", "BARÃO DO AMAPÁ.pdf", "BOM RETIRO.pdf", 
  "BOMFIM DE CASTRO.pdf", "CARMEM LUCIA.pdf", "CCAIC AMAPÁ.pdf", "CCAIC JARDIM GRAMACHO.pdf", 
  "CELIA RABELO.pdf", "COSTA E SILVA 2.pdf", "COSTA E SILVA.pdf", "DARCY RIBEIRO.pdf", 
  "DARCY VARGAS.pdf", "DORNELLES.pdf", "ELISABETH LOPES CABRAL 2.pdf", "ELISABETH LOPES CABRAL.pdf", 
  "FAUSTINO.pdf", "GASTÃO REIS.pdf", "GRACIESSE.pdf", "HIDEKEL.pdf", "IMACULADA.pdf", 
  "ITAMAR FRANCO.pdf", "JARDIM GRAMACHO 2.pdf", "JARDIM GRAMACHO.pdf", "JOAQUIM SALGUEIRO.pdf", 
  "JOSÉ CARLOS COUTINHO 2.pdf", "JOSÉ CARLOS COUTINHO.pdf", "JOSÉ DE SOUZA HERDY.pdf", 
  "JOSÉ MEDEIROS.pdf", "LAURA MENEZES.pdf", "LAURENTINA DUARTE.pdf", "MARCIO FIAT.pdf", 
  "MARECHAL FLORIANO.pdf", "MARIA DE ARAUJO.pdf", "MARIA JOSÉ DE OLIVEIRA.pdf", "MARIE CURRIE.pdf", 
  "MARILIA DA SILVA SIQUEIRA.pdf", "MOACYR PADILHA.pdf", "MONTEIRO LOBATO.pdf", "NOVA CAMPINAS.pdf", 
  "ODUVALDO VIANA.pdf", "OLGA TEXEIRA 2.pdf", "OLGA TEXEIRA.pdf", "OSWALDO ARANHA.pdf", 
  "OSWALDO CRUZ.pdf", "PARTEIRA ODETE.pdf", "PAULO MENDES.pdf", "PEDRO RODRIGUES.pdf", 
  "PEQUENO GUERREIRO.pdf", "PROCOPIO.pdf", "RICARDO AUGUSTO.pdf", "RIO BRANCO.pdf", 
  "ROMEU MENEZES.pdf", "SERGIPE 2.pdf", "SERGIPE.pdf", "SETE DE SETEMBRO.pdf", 
  "TANCREDO NEVES.pdf", "TEREZA LISIEUX 2.pdf", "TEREZA LISIEUX.pdf", "VILMAR BASTOS.pdf", 
  "VISCONDE DE ITABORAÍ.pdf", "WEGUELIN 2.pdf", "WEGUELIN.pdf", "YOLANDA BORGES.pdf"
];

// Função para normalizar nomes (remove acentos, converte para minúsculo, remove caracteres especiais)
function normalizeString(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

// Função para extrair palavras-chave do nome do PDF
function extractKeywords(pdfName) {
  const cleanName = pdfName.replace('.pdf', '').replace(/\s+\d+$/, ''); // Remove .pdf e números no final
  return cleanName.split(/\s+/).filter(word => word.length > 2); // Palavras com mais de 2 caracteres
}

// Função para calcular similaridade entre dois textos
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  let matchCount = 0;
  for (let word1 of words1) {
    for (let word2 of words2) {
      if (word1 === word2 && word1.length > 2) {
        matchCount++;
      }
    }
  }
  
  return matchCount / Math.max(words1.length, words2.length);
}

// Mapeamento manual para casos específicos
const manualMapping = {
  "ALVARO ALBERTO": "Creche-escola Municipal Dr Alvaro Alberto",
  "ANA NERY": "Escola Municipal Ana Nery",
  "MONTEIRO LOBATO": "Escola Municipal Monteiro Lobato",
  "YOLANDA BORGES": "Centro Integrado de Educação Pública Brizolao Municipalizado 220 Yolanda Borges",
  "PROCOPIO": "Centro Integrado de Educação Pública Brizolao Municipalizado 227 Procopio Ferreira",
  "CELIA RABELO": "Centro Integrado de Educação Pública 338-escola Municipalizada Celia Rabelo",
  "ODUVALDO VIANA": "Centro Integrado de Educação Pública Brizolao 319 Oduvaldo Viana Filho",
  "CCAIC JARDIM GRAMACHO": "CCAIC - JARDIM GRAMACHO"
};

// Faz o mapeamento
const mappingResults = [];
const notFound = [];

for (let pdfFile of pdfFiles) {
  const pdfName = pdfFile.replace('.pdf', '').replace(/\s+\d+$/, ''); // Remove .pdf e números
  
  // Verifica mapeamento manual primeiro
  if (manualMapping[pdfName]) {
    mappingResults.push({
      pdfFile,
      pdfName,
      schoolName: manualMapping[pdfName],
      method: 'manual',
      confidence: 1.0
    });
    continue;
  }
  
  // Busca automática
  let bestMatch = null;
  let bestScore = 0;
  
  for (let school of schools) {
    if (!school.name) continue;
    
    const score = calculateSimilarity(pdfName, school.name);
    
    if (score > bestScore && score > 0.3) { // Threshold de 30%
      bestScore = score;
      bestMatch = school;
    }
  }
  
  if (bestMatch) {
    mappingResults.push({
      pdfFile,
      pdfName,
      schoolName: bestMatch.name,
      method: 'auto',
      confidence: bestScore
    });
  } else {
    notFound.push({
      pdfFile,
      pdfName,
      reason: 'Não encontrado na base de escolas'
    });
  }
}

// Gera relatório
console.log('=== MAPEAMENTO DE ESCOLAS ===\n');

console.log('✅ ENCONTRADAS:', mappingResults.length);
mappingResults.forEach((result, i) => {
  console.log(`${i+1}. ${result.pdfFile}`);
  console.log(`   → ${result.schoolName}`);
  console.log(`   (${result.method}, ${(result.confidence * 100).toFixed(0)}%)\n`);
});

console.log('❌ NÃO ENCONTRADAS:', notFound.length);
notFound.forEach((item, i) => {
  console.log(`${i+1}. ${item.pdfFile} (${item.pdfName})`);
});

// Gera o JSON final com os nomes corretos
const finalJSON = mappingResults.map(result => ({
  escola: result.schoolName,
  pdfUrl: `https://avellar2.github.io/csdt-pdfs/${result.pdfFile}`
}));

// Adiciona os não encontrados com nome do PDF mesmo
notFound.forEach(item => {
  finalJSON.push({
    escola: `${item.pdfName} (verificar nome)`,
    pdfUrl: `https://avellar2.github.io/csdt-pdfs/${item.pdfFile}`
  });
});

// Salva arquivos
fs.writeFileSync('mapping-report.txt', JSON.stringify({mappingResults, notFound}, null, 2));
fs.writeFileSync('os-antigas-final.json', JSON.stringify(finalJSON, null, 2));

console.log('\n📁 Arquivos gerados:');
console.log('- mapping-report.txt (relatório completo)');
console.log('- os-antigas-final.json (JSON final para usar)');
console.log(`\n🎯 Total: ${finalJSON.length} escolas mapeadas`);