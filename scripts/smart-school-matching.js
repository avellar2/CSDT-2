const fs = require('fs');
require('dotenv').config();

// Importação do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Definida' : 'Não definida');
  process.exit(1);
}

// Criar cliente Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

// Escolas do Google Maps 2020 com distritos
const googleMapsSchools2020 = [
  // 1º Distrito
  { name: "CRECHE e PRE-ESC ELISA MATHIAS DE ARAÚJO", district: "1º Distrito" },
  { name: "CRECHE e PRÉ-ESC GANDUR ASSED", district: "1º Distrito" },
  { name: "CRECHE GRACIESSE LUIZA DA SILVA", district: "1º Distrito" },
  { name: "CRECHE IRACY MOREIRA THEODORO", district: "1º Distrito" },
  { name: "CRECHE IRMÃ ZILDA ARNS", district: "1º Distrito" },
  { name: "CRECHE JESUS MENINO", district: "1º Distrito" },
  { name: "CRECHE JESUS NAZARENO", district: "1º Distrito" },
  { name: "CRECHE PROF. ARMANDA ÁLVARO ALBERTO", district: "1º Distrito" },
  { name: "CRECHE PROFª MARTA DE VASCONCELLOS", district: "1º Distrito" },
  { name: "E.M. ANA NERY", district: "1º Distrito" },
  { name: "E.M. BARONESA DE MESQUITA", district: "1º Distrito" },
  { name: "E.M. CARLOS DRUMMOND DE ANDRADE", district: "1º Distrito" },
  { name: "E.M. CASTRO ALVES", district: "1º Distrito" },
  { name: "E.M. GASTÃO DOS REIS PONTES", district: "1º Distrito" },
  { name: "E.M. HONÓRIO BICALHO", district: "1º Distrito" },
  { name: "E.M. JOSÉ CARLOS COUTINHO", district: "1º Distrito" },
  { name: "E.M. JOSÉ MEDEIROS", district: "1º Distrito" },
  { name: "E.M. LEOPOLDO FRÓES", district: "1º Distrito" },
  { name: "E.M. MARIO QUINTANA", district: "1º Distrito" },
  { name: "E.M. MONTEIRO LOBATO", district: "1º Distrito" },
  { name: "E.M. NILO PEÇANHA", district: "1º Distrito" },
  { name: "E.M. OSWALDO CRUZ", district: "1º Distrito" },
  { name: "E.M. PEDRO RODRIGUES DO CARMO", district: "1º Distrito" },
  { name: "E.M. PROFESSORA MARÍLIA DA SILVA SIQUEIRA", district: "1º Distrito" },
  { name: "E.M. RIO BRANCO", district: "1º Distrito" },
  { name: "E.M. SETE DE SETEMBRO", district: "1º Distrito" },
  { name: "E.M. VISCONDE DE ITABORAÍ", district: "1º Distrito" },
  
  // 2º Distrito
  { name: "CCAIC - CAMPOS ELÍSEOS", district: "2º Distrito" },
  { name: "CCAIC - PARQUE MUÍSA", district: "2º Distrito" },
  { name: "CRECHE AYRTON SENNA", district: "2º Distrito" },
  { name: "CRECHE e PRE-ESC PROFª MARIA LUCIA ANDRADE RIBEIRO", district: "2º Distrito" },
  { name: "CRECHE PROFª JESUÍNA FATIMA", district: "2º Distrito" },
  { name: "E.M. ALVARO ALBERTO", district: "2º Distrito" },
  { name: "E.M. AMÉLIA CÂMARA", district: "2º Distrito" },
  { name: "E.M. ANTONIO GRANJA", district: "2º Distrito" },
  { name: "E.M. BARÃO DO AMAPÁ", district: "2º Distrito" },
  { name: "E.M. BOM RETIRO", district: "2º Distrito" },
  { name: "E.M. CALIFÓRNIA", district: "2º Distrito" },
  { name: "E.M. CARMEN LUCIA ABRANTES", district: "2º Distrito" },
  { name: "E.M. COSTA E SILVA", district: "2º Distrito" },
  { name: "E.M. DARCY RIBEIRO", district: "2º Distrito" },
  { name: "E.M. DARCY VARGAS", district: "2º Distrito" },
  { name: "E.M. DORNELLAS", district: "2º Distrito" },
  { name: "E.M. ELIZABETH LOPES CABRAL", district: "2º Distrito" },
  { name: "E.M. FAUSTINO JOSÉ DA SILVA", district: "2º Distrito" },
  { name: "E.M. HÉLIO RANGEL", district: "2º Distrito" },
  { name: "E.M. IMACULADA CONCEIÇÃO", district: "2º Distrito" },
  { name: "E.M. ITAMAR FRANCO", district: "2º Distrito" },
  { name: "E.M. JOAQUIM SALGUEIRO", district: "2º Distrito" },
  { name: "E.M. LAURA DE ARAÚJO MENEZES", district: "2º Distrito" },
  { name: "E.M. LAURENTINA DUARTE", district: "2º Distrito" },
  { name: "E.M. MÁRCIO CANELA", district: "2º Distrito" },
  { name: "E.M. MARECHAL FLORIANO", district: "2º Distrito" },
  { name: "E.M. MARIA DE ARAÚJO", district: "2º Distrito" },
  { name: "E.M. MARIA JOSÉ DE OLIVEIRA", district: "2º Distrito" },
  { name: "E.M. NOVA CAMPINAS", district: "2º Distrito" },
  { name: "E.M. OLGA TEIXEIRA", district: "2º Distrito" },
  { name: "E.M. OSWALDO ARANHA", district: "2º Distrito" },
  { name: "E.M. PARTEIRA ODETE", district: "2º Distrito" },
  { name: "E.M. PEQUENO GUERREIRO", district: "2º Distrito" },
  { name: "E.M. PRES. TANCREDO NEVES", district: "2º Distrito" },
  { name: "E.M. RICARDO AUGUSTO DA SILVA CARVALHO", district: "2º Distrito" },
  { name: "E.M. ROMEU DE ARAÚJO MENEZES", district: "2º Distrito" },
  { name: "E.M. SERGIPE", district: "2º Distrito" },
  { name: "E.M. TERESA DE LISIEUX", district: "2º Distrito" },
  { name: "E.M. VILMAR BASTOS", district: "2º Distrito" },
  { name: "E.M. WEGUELIN", district: "2º Distrito" },
  
  // 3º Distrito
  { name: "CCAIC - JARDIM ANHANGÁ", district: "3º Distrito" },
  { name: "CRECHE e PRÉ-ESC PROFª ARMANDA ÁLVARO ALBERTO", district: "3º Distrito" },
  { name: "CRECHE IRMÃ ARNALDA DA SILVA", district: "3º Distrito" },
  { name: "CRECHE MONSENHOR LIBRELLOTO", district: "3º Distrito" },
  { name: "CIEP 227 - PROCÓPIO FERREIRA", district: "3º Distrito" },
  { name: "CIEP 328 - MARIE CURIE", district: "3º Distrito" },
  { name: "E.M. BOMFIM DE CASTRO", district: "3º Distrito" },
  { name: "E.M. CELIA RABELO", district: "3º Distrito" },
  { name: "E.M. HIDEKEL DE FREITAS TORRES", district: "3º Distrito" },
  { name: "E.M. JOSÉ DE SOUZA HERDY", district: "3º Distrito" },
  { name: "E.M. MOACYR PADILHA", district: "3º Distrito" },
  { name: "E.M. PAULO MENDES CAMPOS", district: "3º Distrito" }
];

// Dicionário de abreviações e variações comuns
const nameVariations = {
  // Prefixos
  'PROF.': 'PROFESSOR',
  'PROFª': 'PROFESSORA',
  'PROF': 'PROFESSOR',
  'DR.': 'DOUTOR',
  'DRª': 'DOUTORA',
  'DR': 'DOUTOR',
  'PRES.': 'PRESIDENTE',
  'E.M.': 'ESCOLA MUNICIPAL',
  'EM': 'ESCOLA MUNICIPAL',
  'CIEP': 'CENTRO INTEGRADO DE EDUCACAO PUBLICA',
  'CCAIC': 'CENTRO DE ATENCAO INTEGRAL A CRIANCA',
  
  // Variações comuns
  'ALVARO': 'ÁLVARO',
  'AMELIA': 'AMÉLIA',
  'BARAO': 'BARÃO',
  'CALIFORNIA': 'CALIFÓRNIA',
  'CONCEICAO': 'CONCEIÇÃO',
  'ELISEOS': 'ELÍSEOS',
  'HONORIO': 'HONÓRIO',
  'JOSE': 'JOSÉ',
  'MARIA': 'MARIA',
  'MUISA': 'MUÍSA',
  'TANCREDO': 'TANCREDO',
  'TERESA': 'TEREZA',
  'TEREZA': 'TERESA'
};

// Função para normalizar nomes com variações
function normalizeSchoolName(name) {
  let normalized = name.toUpperCase();
  
  // Aplicar dicionário de variações
  Object.keys(nameVariations).forEach(variation => {
    const regex = new RegExp(`\\b${variation}\\b`, 'g');
    normalized = normalized.replace(regex, nameVariations[variation]);
  });
  
  // Remover acentos
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Remover caracteres especiais e normalizar espaços
  normalized = normalized
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

// Função melhorada para calcular similaridade
function calculateAdvancedSimilarity(str1, str2) {
  const norm1 = normalizeSchoolName(str1);
  const norm2 = normalizeSchoolName(str2);
  
  // Match exato
  if (norm1 === norm2) return 1.0;
  
  // Contém um ao outro
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.95;
  
  // Dividir em palavras
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Contar palavras em comum
  let commonWords = 0;
  for (let word1 of words1) {
    for (let word2 of words2) {
      if (word1 === word2) {
        commonWords++;
        break;
      }
    }
  }
  
  // Calcular similaridade baseada em palavras comuns
  const similarity = (commonWords * 2) / (words1.length + words2.length);
  
  return similarity;
}

// Função para buscar escolas do arquivo JSON local
async function getExistingSchools() {
  try {
    console.log('📥 Carregando escolas do arquivo local...');
    const schoolsData = JSON.parse(fs.readFileSync('./src/utils/schools.json', 'utf8'));
    
    // Adicionar ID fictício para compatibilidade
    const schoolsWithId = schoolsData.map((school, index) => ({
      id: index + 1,
      name: school.name,
      url: school.url
    }));
    
    return schoolsWithId;
  } catch (err) {
    console.error('❌ Erro ao carregar arquivo schools.json:', err);
    return [];
  }
}

// Função principal de matching inteligente
async function smartSchoolMatching() {
  console.log('🔍 MATCHING INTELIGENTE DE ESCOLAS\n');
  
  // Buscar escolas atuais do arquivo JSON
  const existingSchools = await getExistingSchools();
  console.log(`   Encontradas ${existingSchools.length} escolas no arquivo local\n`);
  
  if (existingSchools.length === 0) {
    console.log('❌ Nenhuma escola encontrada no arquivo local');
    return;
  }
  
  // Fazer matching
  const matches = [];
  const existingOnly = [];
  const mapsOnly = [];
  
  // Verificar cada escola existente
  existingSchools.forEach(existingSchool => {
    let bestMatch = null;
    let bestScore = 0;
    
    // Comparar com escolas do Google Maps
    googleMapsSchools2020.forEach(mapSchool => {
      const score = calculateAdvancedSimilarity(existingSchool.name, mapSchool.name);
      
      if (score > bestScore && score >= 0.6) { // Threshold ajustável
        bestScore = score;
        bestMatch = mapSchool;
      }
    });
    
    if (bestMatch) {
      matches.push({
        existing_school: existingSchool,
        maps_school: bestMatch,
        confidence: bestScore,
        district: bestMatch.district
      });
    } else {
      existingOnly.push(existingSchool);
    }
  });
  
  // Encontrar escolas que existem apenas no Maps
  googleMapsSchools2020.forEach(mapSchool => {
    const found = matches.some(match => 
      match.maps_school.name === mapSchool.name
    );
    
    if (!found) {
      mapsOnly.push(mapSchool);
    }
  });
  
  // Gerar relatório
  console.log('📊 RELATÓRIO DE MATCHING:\n');
  
  console.log(`✅ MATCHES ENCONTRADOS: ${matches.length}`);
  matches.forEach((match, i) => {
    const confidence = (match.confidence * 100).toFixed(1);
    console.log(`${i+1}. ${match.existing_school.name}`);
    console.log(`   → ${match.maps_school.name} (${match.district})`);
    console.log(`   Confiança: ${confidence}%\n`);
  });
  
  console.log(`🆕 ESCOLAS APENAS NA BASE ATUAL (pós-2020): ${existingOnly.length}`);
  existingOnly.slice(0, 10).forEach((school, i) => {
    console.log(`${i+1}. ${school.name}`);
  });
  if (existingOnly.length > 10) {
    console.log(`   ... e mais ${existingOnly.length - 10} escolas\n`);
  } else {
    console.log('');
  }
  
  console.log(`📍 ESCOLAS APENAS NO MAPS (podem ter sido fechadas): ${mapsOnly.length}`);
  mapsOnly.slice(0, 10).forEach((school, i) => {
    console.log(`${i+1}. ${school.name} (${school.district})`);
  });
  if (mapsOnly.length > 10) {
    console.log(`   ... e mais ${mapsOnly.length - 10} escolas\n`);
  } else {
    console.log('');
  }
  
  // Salvar relatório detalhado
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_existing: existingSchools.length,
      total_maps: googleMapsSchools2020.length,
      matches: matches.length,
      existing_only: existingOnly.length,
      maps_only: mapsOnly.length
    },
    matches: matches.map(m => ({
      existing_name: m.existing_school.name,
      maps_name: m.maps_school.name,
      district: m.district,
      confidence: m.confidence
    })),
    existing_only: existingOnly.map(s => ({
      id: s.id,
      name: s.name,
      status: 'Nova escola (pós-2020)'
    })),
    maps_only: mapsOnly.map(m => ({
      name: m.name,
      district: m.district,
      status: 'Pode ter sido fechada ou renomeada'
    }))
  };
  
  fs.writeFileSync('smart-school-matching-report.json', JSON.stringify(report, null, 2));
  
  console.log('💾 Relatório salvo em: smart-school-matching-report.json');
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Revisar matches com baixa confiança');
  console.log('2. Verificar escolas que existem apenas na base atual');
  console.log('3. Investigar escolas que existem apenas no Maps de 2020');
  console.log('4. Criar arquivo JSON com distritos para as escolas com match');
  
  return report;
}

// Função para atualizar distritos no Supabase
async function updateDistrictsInSupabase(matches) {
  console.log('\n🔄 Atualizando distritos no Supabase...');
  
  let updated = 0;
  let errors = 0;
  
  for (const match of matches) {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ district: match.district })
        .eq('id', match.supabase_school.id);
      
      if (error) {
        console.error(`Erro ao atualizar ${match.supabase_school.name}:`, error);
        errors++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Erro ao atualizar ${match.supabase_school.name}:`, err);
      errors++;
    }
  }
  
  console.log(`✅ ${updated} escolas atualizadas`);
  console.log(`❌ ${errors} erros`);
}

// Executar
if (require.main === module) {
  smartSchoolMatching();
}

module.exports = {
  smartSchoolMatching,
  updateDistrictsInSupabase,
  calculateAdvancedSimilarity,
  normalizeSchoolName
};