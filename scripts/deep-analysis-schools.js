const fs = require('fs');
require('dotenv').config();

// Carregar dados do relatório anterior
let previousReport = {};
try {
  previousReport = JSON.parse(fs.readFileSync('./smart-school-matching-report.json', 'utf8'));
} catch (err) {
  console.log('Executando análise independente...');
}

// Escolas do Google Maps 2020 com distritos (dados expandidos)
const googleMapsSchools2020 = [
  // 1º Distrito
  { name: "SME (Secretaria Municipal de Duque de Caxias)", district: "1º Distrito", aliases: ["SME", "SECRETARIA MUNICIPAL", "SECRETARIA MUNICIPAL DE EDUCACAO"] },
  { name: "CRECHE e PRE-ESC ELISA MATHIAS DE ARAÚJO", district: "1º Distrito", aliases: ["ELISA MATHIAS", "CRECHE ELISA MATHIAS"] },
  { name: "CRECHE e PRÉ-ESC GANDUR ASSED", district: "1º Distrito", aliases: ["GANDUR ASSED", "CRECHE GANDUR"] },
  { name: "CRECHE GRACIESSE LUIZA DA SILVA", district: "1º Distrito", aliases: ["GRACIESSE LUIZA", "GRACIESSE SILVA"] },
  { name: "CRECHE IRACY MOREIRA THEODORO", district: "1º Distrito", aliases: ["IRACY MOREIRA", "IRACY THEODORO"] },
  { name: "CRECHE IRMÃ ZILDA ARNS", district: "1º Distrito", aliases: ["ZILDA ARNS", "IRMA ZILDA"] },
  { name: "CRECHE JESUS MENINO", district: "1º Distrito", aliases: ["JESUS MENINO"] },
  { name: "CRECHE JESUS NAZARENO", district: "1º Distrito", aliases: ["JESUS NAZARENO"] },
  { name: "CRECHE PROF. ARMANDA ÁLVARO ALBERTO", district: "1º Distrito", aliases: ["ARMANDA ALVARO ALBERTO", "PROF ARMANDA", "PROFA ARMANDA"] },
  { name: "CRECHE PROFª MARTA DE VASCONCELLOS", district: "1º Distrito", aliases: ["MARTA VASCONCELLOS", "PROF MARTA", "PROFA MARTA"] },
  { name: "E.M. ANA NERY", district: "1º Distrito", aliases: ["ANA NERY", "ESCOLA ANA NERY"] },
  { name: "E.M. BARONESA DE MESQUITA", district: "1º Distrito", aliases: ["BARONESA MESQUITA", "BARONESA DE MESQUITA"] },
  { name: "E.M. CARLOS DRUMMOND DE ANDRADE", district: "1º Distrito", aliases: ["CARLOS DRUMMOND", "DRUMMOND ANDRADE"] },
  { name: "E.M. CASTRO ALVES", district: "1º Distrito", aliases: ["CASTRO ALVES"] },
  { name: "E.M. GASTÃO DOS REIS PONTES", district: "1º Distrito", aliases: ["GASTAO REIS", "GASTAO DOS REIS", "GASTAO PONTES"] },
  { name: "E.M. HONÓRIO BICALHO", district: "1º Distrito", aliases: ["HONORIO BICALHO"] },
  { name: "E.M. JOSÉ CARLOS COUTINHO", district: "1º Distrito", aliases: ["JOSE CARLOS COUTINHO", "COUTINHO"] },
  { name: "E.M. JOSÉ MEDEIROS", district: "1º Distrito", aliases: ["JOSE MEDEIROS", "MEDEIROS"] },
  { name: "E.M. LEOPOLDO FRÓES", district: "1º Distrito", aliases: ["LEOPOLDO FROES"] },
  { name: "E.M. MARIO QUINTANA", district: "1º Distrito", aliases: ["MARIO QUINTANA"] },
  { name: "E.M. MONTEIRO LOBATO", district: "1º Distrito", aliases: ["MONTEIRO LOBATO"] },
  { name: "E.M. NILO PEÇANHA", district: "1º Distrito", aliases: ["NILO PECANHA"] },
  { name: "E.M. OSWALDO CRUZ", district: "1º Distrito", aliases: ["OSWALDO CRUZ"] },
  { name: "E.M. PEDRO RODRIGUES DO CARMO", district: "1º Distrito", aliases: ["PEDRO RODRIGUES", "PEDRO CARMO"] },
  { name: "E.M. PROFESSORA MARÍLIA DA SILVA SIQUEIRA", district: "1º Distrito", aliases: ["MARILIA SILVA", "PROF MARILIA", "PROFA MARILIA", "MARILIA SIQUEIRA"] },
  { name: "E.M. RIO BRANCO", district: "1º Distrito", aliases: ["RIO BRANCO"] },
  { name: "E.M. SETE DE SETEMBRO", district: "1º Distrito", aliases: ["SETE SETEMBRO", "7 SETEMBRO"] },
  { name: "E.M. VISCONDE DE ITABORAÍ", district: "1º Distrito", aliases: ["VISCONDE ITABORAI", "VISCONDE DE ITABORAI"] },
  
  // 2º Distrito
  { name: "CCAIC - CAMPOS ELÍSEOS", district: "2º Distrito", aliases: ["CCAIC CAMPOS ELISEOS", "CAMPOS ELISEOS"] },
  { name: "CCAIC - PARQUE MUÍSA", district: "2º Distrito", aliases: ["CCAIC PARQUE MUISA", "PARQUE MUISA"] },
  { name: "CCAIC - JARDIM GRAMACHO", district: "2º Distrito", aliases: ["CCAIC JARDIM GRAMACHO", "JARDIM GRAMACHO"] },
  { name: "CRECHE AYRTON SENNA", district: "2º Distrito", aliases: ["AYRTON SENNA"] },
  { name: "CRECHE e PRE-ESC PROFª MARIA LUCIA ANDRADE RIBEIRO", district: "2º Distrito", aliases: ["MARIA LUCIA ANDRADE", "PROF MARIA LUCIA", "MARIA LUCIA RIBEIRO"] },
  { name: "CRECHE PROFª JESUÍNA FATIMA", district: "2º Distrito", aliases: ["JESUINA FATIMA", "PROF JESUINA"] },
  { name: "E.M. ALVARO ALBERTO", district: "2º Distrito", aliases: ["ALVARO ALBERTO", "DR ALVARO ALBERTO"] },
  { name: "E.M. AMÉLIA CÂMARA", district: "2º Distrito", aliases: ["AMELIA CAMARA"] },
  { name: "E.M. ANTONIO GRANJA", district: "2º Distrito", aliases: ["ANTONIO GRANJA", "ANTON GRANJA", "ANTON"] },
  { name: "E.M. BARÃO DO AMAPÁ", district: "2º Distrito", aliases: ["BARAO AMAPA", "BARAO DO AMAPA"] },
  { name: "E.M. BOM RETIRO", district: "2º Distrito", aliases: ["BOM RETIRO"] },
  { name: "E.M. CALIFÓRNIA", district: "2º Distrito", aliases: ["CALIFORNIA", "BAIRRO CALIFORNIA"] },
  { name: "E.M. CARMEN LUCIA ABRANTES", district: "2º Distrito", aliases: ["CARMEN LUCIA", "CARMEM LUCIA"] },
  { name: "E.M. COSTA E SILVA", district: "2º Distrito", aliases: ["COSTA SILVA"] },
  { name: "E.M. DARCY RIBEIRO", district: "2º Distrito", aliases: ["DARCY RIBEIRO"] },
  { name: "E.M. DARCY VARGAS", district: "2º Distrito", aliases: ["DARCY VARGAS"] },
  { name: "E.M. DORNELLAS", district: "2º Distrito", aliases: ["DORNELAS", "DORNELLES"] },
  { name: "E.M. ELIZABETH LOPES CABRAL", district: "2º Distrito", aliases: ["ELIZABETH CABRAL", "ELISABETH CABRAL", "ELISABETH LOPES"] },
  { name: "E.M. FAUSTINO JOSÉ DA SILVA", district: "2º Distrito", aliases: ["FAUSTINO SILVA", "FAUSTINO JOSE", "FAUSTINO"] },
  { name: "E.M. HÉLIO RANGEL", district: "2º Distrito", aliases: ["HELIO RANGEL"] },
  { name: "E.M. IMACULADA CONCEIÇÃO", district: "2º Distrito", aliases: ["IMACULADA CONCEICAO", "IMACULADA"] },
  { name: "E.M. ITAMAR FRANCO", district: "2º Distrito", aliases: ["ITAMAR FRANCO"] },
  { name: "E.M. JOAQUIM SALGUEIRO", district: "2º Distrito", aliases: ["JOAQUIM SALGUEIRO"] },
  { name: "E.M. LAURA DE ARAÚJO MENEZES", district: "2º Distrito", aliases: ["LAURA MENEZES", "LAURA ARAUJO"] },
  { name: "E.M. LAURENTINA DUARTE", district: "2º Distrito", aliases: ["LAURENTINA DUARTE"] },
  { name: "E.M. MÁRCIO CANELA", district: "2º Distrito", aliases: ["MARCIO CANELA", "MARCIO FIAT"] },
  { name: "E.M. MARECHAL FLORIANO", district: "2º Distrito", aliases: ["MARECHAL FLORIANO"] },
  { name: "E.M. MARIA DE ARAÚJO", district: "2º Distrito", aliases: ["MARIA ARAUJO", "MARIA DE ARAUJO"] },
  { name: "E.M. MARIA JOSÉ DE OLIVEIRA", district: "2º Distrito", aliases: ["MARIA JOSE OLIVEIRA"] },
  { name: "E.M. NOVA CAMPINAS", district: "2º Distrito", aliases: ["NOVA CAMPINAS"] },
  { name: "E.M. OLGA TEIXEIRA", district: "2º Distrito", aliases: ["OLGA TEXEIRA", "OLGA TEIXEIRA"] },
  { name: "E.M. OSWALDO ARANHA", district: "2º Distrito", aliases: ["OSWALDO ARANHA"] },
  { name: "E.M. PARTEIRA ODETE", district: "2º Distrito", aliases: ["PARTEIRA ODETE", "ODETE PARTEIRA"] },
  { name: "E.M. PEQUENO GUERREIRO", district: "2º Distrito", aliases: ["PEQUENO GUERREIRO"] },
  { name: "E.M. PRES. TANCREDO NEVES", district: "2º Distrito", aliases: ["TANCREDO NEVES", "PRESIDENTE TANCREDO"] },
  { name: "E.M. RICARDO AUGUSTO DA SILVA CARVALHO", district: "2º Distrito", aliases: ["RICARDO AUGUSTO", "RICARDO SILVA"] },
  { name: "E.M. ROMEU DE ARAÚJO MENEZES", district: "2º Distrito", aliases: ["ROMEU MENEZES", "ROMEU ARAUJO"] },
  { name: "E.M. SERGIPE", district: "2º Distrito", aliases: ["SERGIPE"] },
  { name: "E.M. TERESA DE LISIEUX", district: "2º Distrito", aliases: ["TERESA LISIEUX", "TEREZA LISIEUX"] },
  { name: "E.M. VILMAR BASTOS", district: "2º Distrito", aliases: ["VILMAR BASTOS"] },
  { name: "E.M. WEGUELIN", district: "2º Distrito", aliases: ["WEGUELIN"] },
  
  // 3º Distrito
  { name: "CCAIC - JARDIM ANHANGÁ", district: "3º Distrito", aliases: ["CCAIC JARDIM ANHANGA", "JARDIM ANHANGA"] },
  { name: "CRECHE e PRÉ-ESC PROFª ARMANDA ÁLVARO ALBERTO", district: "3º Distrito", aliases: ["ARMANDA ALVARO ALBERTO", "PROF ARMANDA"] },
  { name: "CRECHE IRMÃ ARNALDA DA SILVA", district: "3º Distrito", aliases: ["IRMA ARNALDA", "ARNALDA SILVA"] },
  { name: "CRECHE MONSENHOR LIBRELLOTO", district: "3º Distrito", aliases: ["MONSENHOR LIBRELLOTO", "MONS LIBRELLOTO"] },
  { name: "CIEP 227 - PROCÓPIO FERREIRA", district: "3º Distrito", aliases: ["PROCOPIO FERREIRA", "CIEP 227", "227 PROCOPIO"] },
  { name: "CIEP 328 - MARIE CURIE", district: "3º Distrito", aliases: ["MARIE CURIE", "CIEP 328", "328 MARIE CURIE"] },
  { name: "E.M. BOMFIM DE CASTRO", district: "3º Distrito", aliases: ["BOMFIM CASTRO"] },
  { name: "E.M. CELIA RABELO", district: "3º Distrito", aliases: ["CELIA RABELO"] },
  { name: "E.M. HIDEKEL DE FREITAS TORRES", district: "3º Distrito", aliases: ["HIDEKEL TORRES", "HIDEKEL FREITAS", "HIDEKEL"] },
  { name: "E.M. JOSÉ DE SOUZA HERDY", district: "3º Distrito", aliases: ["JOSE SOUZA HERDY", "SOUZA HERDY", "HERDY"] },
  { name: "E.M. MOACYR PADILHA", district: "3º Distrito", aliases: ["MOACYR PADILHA"] },
  { name: "E.M. PAULO MENDES CAMPOS", district: "3º Distrito", aliases: ["PAULO MENDES", "MENDES CAMPOS"] }
];

// Função para normalizar nomes com mais variações
function advancedNormalize(name) {
  let normalized = name.toUpperCase();
  
  // Dicionário expandido de variações
  const variations = {
    // Títulos e prefixos
    'PROF.': 'PROFESSOR', 'PROFª': 'PROFESSORA', 'PROF': 'PROFESSOR',
    'DR.': 'DOUTOR', 'DRª': 'DOUTORA', 'DR': 'DOUTOR',
    'PRES.': 'PRESIDENTE', 'MONS.': 'MONSENHOR',
    'E.M.': 'ESCOLA MUNICIPAL', 'EM': 'ESCOLA MUNICIPAL',
    'CIEP': 'CENTRO INTEGRADO EDUCACAO PUBLICA',
    'CCAIC': 'CENTRO ATENCAO INTEGRAL CRIANCA',
    
    // Variações de nomes
    'ALVARO': 'ÁLVARO', 'AMELIA': 'AMÉLIA', 'BARAO': 'BARÃO',
    'CALIFORNIA': 'CALIFÓRNIA', 'CONCEICAO': 'CONCEIÇÃO',
    'ELISEOS': 'ELÍSEOS', 'HONORIO': 'HONÓRIO', 'JOSE': 'JOSÉ',
    'MARIA': 'MARIA', 'MUISA': 'MUÍSA', 'TANCREDO': 'TANCREDO',
    'TERESA': 'TEREZA', 'TEREZA': 'TERESA', 'TEXEIRA': 'TEIXEIRA',
    'JESUINA': 'JESUÍNA', 'CARMEM': 'CARMEN', 'ELISABETH': 'ELIZABETH',
    
    // Palavras conectoras que podem ser omitidas
    'DE': '', 'DA': '', 'DO': '', 'DOS': '', 'DAS': '', 'E': '',
    'MUNICIPAL': '', 'MUNICIPALIZADA': '', 'MUNICIPALIZADO': '',
    'PRE': 'PRÉ', 'ESC': 'ESCOLA'
  };
  
  // Aplicar variações
  Object.keys(variations).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    normalized = normalized.replace(regex, variations[key]);
  });
  
  // Remover acentos
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Limpar caracteres especiais e normalizar espaços
  normalized = normalized
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

// Função para calcular similaridade com pesos diferentes
function calculateWeightedSimilarity(str1, str2, mapSchool = null) {
  const norm1 = advancedNormalize(str1);
  const norm2 = advancedNormalize(str2);
  
  // Match exato
  if (norm1 === norm2) return 1.0;
  
  // Verificar aliases se disponível
  if (mapSchool && mapSchool.aliases) {
    for (let alias of mapSchool.aliases) {
      const normAlias = advancedNormalize(alias);
      if (norm1 === normAlias || norm1.includes(normAlias) || normAlias.includes(norm1)) {
        return 0.95;
      }
    }
  }
  
  // Contém um ao outro
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  
  // Dividir em palavras significativas (mais de 2 caracteres)
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Contar palavras em comum com diferentes pesos
  let weightedScore = 0;
  let totalWeight = 0;
  
  for (let word1 of words1) {
    let bestMatchScore = 0;
    
    for (let word2 of words2) {
      let matchScore = 0;
      
      if (word1 === word2) {
        // Match exato - peso maior para nomes próprios
        if (isProperName(word1)) {
          matchScore = 3; // Peso alto para nomes próprios
        } else {
          matchScore = 2; // Peso médio para outras palavras
        }
      } else if (word1.includes(word2) || word2.includes(word1)) {
        // Match parcial
        matchScore = 1;
      }
      
      bestMatchScore = Math.max(bestMatchScore, matchScore);
    }
    
    weightedScore += bestMatchScore;
    totalWeight += isProperName(word1) ? 3 : 2; // Peso esperado
  }
  
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

// Função para identificar nomes próprios importantes
function isProperName(word) {
  const properNames = [
    'ALVARO', 'ALBERTO', 'ANA', 'ANTONIO', 'ARMANDA', 'AYRTON',
    'CARLOS', 'CASTRO', 'CELIA', 'DARCY', 'ELIZABETH', 'FAUSTINO',
    'GASTAO', 'HIDEKEL', 'HONORIO', 'ITAMAR', 'JOAQUIM', 'JOSE',
    'LAURA', 'MARIO', 'MARIA', 'MONTEIRO', 'NILO', 'OSWALDO',
    'PAULO', 'PEDRO', 'PROCOPIO', 'RICARDO', 'ROMEU', 'TERESA',
    'VILMAR', 'VISCONDE', 'WEGUELIN', 'YOLANDA', 'MARIE', 'CURIE',
    'LOBATO', 'NERY', 'BICALHO', 'DRUMMOND', 'SENNA', 'ARANHA'
  ];
  
  return properNames.includes(word);
}

// Função para análise detalhada
async function deepAnalysisSchools() {
  console.log('🔬 ANÁLISE PROFUNDA DE ESCOLAS\n');
  
  // Carregar escolas existentes
  const existingSchools = JSON.parse(fs.readFileSync('./src/utils/schools.json', 'utf8'))
    .map((school, index) => ({ id: index + 1, ...school }));
  
  console.log(`📚 Carregadas ${existingSchools.length} escolas existentes`);
  console.log(`🗺️ Carregadas ${googleMapsSchools2020.length} escolas do Maps 2020\n`);
  
  // Análise com threshold mais baixo para capturar mais matches
  const matches = [];
  const potentialMatches = [];
  const noMatches = [];
  
  existingSchools.forEach(existingSchool => {
    let bestMatch = null;
    let bestScore = 0;
    let allScores = [];
    
    // Testar contra todas as escolas do Maps
    googleMapsSchools2020.forEach(mapSchool => {
      const score = calculateWeightedSimilarity(existingSchool.name, mapSchool.name, mapSchool);
      
      allScores.push({
        mapSchool: mapSchool,
        score: score
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = mapSchool;
      }
    });
    
    // Classificar por confiança
    if (bestScore >= 0.7) {
      matches.push({
        existing: existingSchool,
        maps: bestMatch,
        confidence: bestScore,
        district: bestMatch.district,
        category: 'high_confidence'
      });
    } else if (bestScore >= 0.4) {
      // Guardar os 3 melhores scores para análise
      const topScores = allScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .filter(s => s.score > 0);
      
      potentialMatches.push({
        existing: existingSchool,
        candidates: topScores,
        bestScore: bestScore,
        category: 'potential_match'
      });
    } else {
      noMatches.push({
        existing: existingSchool,
        category: 'no_match'
      });
    }
  });
  
  // Relatório detalhado
  console.log('📊 RESULTADOS DA ANÁLISE PROFUNDA:\n');
  
  console.log(`🎯 MATCHES DE ALTA CONFIANÇA: ${matches.length}`);
  matches.forEach((match, i) => {
    const confidence = (match.confidence * 100).toFixed(1);
    console.log(`${i+1}. ${match.existing.name}`);
    console.log(`   → ${match.maps.name} (${match.district})`);
    console.log(`   Confiança: ${confidence}%\n`);
  });
  
  console.log(`🤔 MATCHES POTENCIAIS (precisam revisão): ${potentialMatches.length}`);
  potentialMatches.slice(0, 15).forEach((potential, i) => {
    console.log(`${i+1}. ${potential.existing.name}`);
    console.log(`   Candidatos:`);
    potential.candidates.forEach(candidate => {
      const conf = (candidate.score * 100).toFixed(1);
      console.log(`   - ${candidate.mapSchool.name} (${candidate.mapSchool.district}) - ${conf}%`);
    });
    console.log('');
  });
  
  if (potentialMatches.length > 15) {
    console.log(`   ... e mais ${potentialMatches.length - 15} matches potenciais\n`);
  }
  
  console.log(`❓ SEM MATCH ENCONTRADO: ${noMatches.length} escolas\n`);
  
  // Análise especial: procurar padrões nos sem match
  console.log('🔍 ANÁLISE DOS SEM MATCH:\n');
  
  const patterns = {
    'CENTRO INTEGRADO': 0,
    'BRIZOLAO': 0,
    'CIEP': 0,
    'CRECHE': 0,
    'NOVA': 0, // Escolas com "nova" no nome
    'PRE ESCOLA': 0
  };
  
  noMatches.forEach(noMatch => {
    const name = noMatch.existing.name.toUpperCase();
    Object.keys(patterns).forEach(pattern => {
      if (name.includes(pattern)) {
        patterns[pattern]++;
      }
    });
  });
  
  console.log('Padrões nas escolas sem match:');
  Object.keys(patterns).forEach(pattern => {
    if (patterns[pattern] > 0) {
      console.log(`- ${pattern}: ${patterns[pattern]} escolas`);
    }
  });
  
  // Salvar relatório completo
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_existing: existingSchools.length,
      total_maps: googleMapsSchools2020.length,
      high_confidence_matches: matches.length,
      potential_matches: potentialMatches.length,
      no_matches: noMatches.length
    },
    high_confidence_matches: matches.map(m => ({
      existing_name: m.existing.name,
      maps_name: m.maps.name,
      district: m.district,
      confidence: m.confidence
    })),
    potential_matches: potentialMatches.map(p => ({
      existing_name: p.existing.name,
      candidates: p.candidates.map(c => ({
        maps_name: c.mapSchool.name,
        district: c.mapSchool.district,
        confidence: c.score
      }))
    })),
    patterns_analysis: patterns,
    no_matches: noMatches.slice(0, 50).map(n => ({ // Limitar para não ficar muito grande
      name: n.existing.name
    }))
  };
  
  fs.writeFileSync('deep-analysis-schools-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n💾 Relatório completo salvo em: deep-analysis-schools-report.json');
  console.log('\n🎯 RESUMO EXECUTIVO:');
  console.log(`- Matches de alta confiança: ${matches.length} escolas`);
  console.log(`- Matches potenciais (revisão manual): ${potentialMatches.length} escolas`);
  console.log(`- Escolas sem match (provavelmente pós-2020): ${noMatches.length} escolas`);
  
  return report;
}

// Executar análise
if (require.main === module) {
  deepAnalysisSchools();
}

module.exports = {
  deepAnalysisSchools,
  calculateWeightedSimilarity,
  advancedNormalize
};