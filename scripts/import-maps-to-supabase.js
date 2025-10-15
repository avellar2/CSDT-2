const fs = require('fs');
const fetch = require('node-fetch');

// Importação do cliente Supabase (ajuste o caminho conforme necessário)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas!');
  console.log('Certifique-se de ter definido:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Cliente Supabase simples
const supabaseClient = {
  async query(sql, params = []) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql, params })
    });
    return response.json();
  },
  
  async from(table) {
    return {
      async select(columns = '*') {
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        const data = await response.json();
        return { data, error: response.ok ? null : data };
      },
      
      async upsert(data, options = {}) {
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': options.onConflict ? 'resolution=merge-duplicates' : 'return=minimal'
          },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        return { data: result, error: response.ok ? null : result };
      }
    };
  }
};

// Dados das escolas extraídos do Google My Maps
const googleMapsSchools = [
  // 1º Distrito
  { name: "SME (Secretaria Municipal de Duque de Caxias)", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE e PRE-ESC ELISA MATHIAS DE ARAÚJO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE e PRÉ-ESC GANDUR ASSED", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE GRACIESSE LUIZA DA SILVA", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE IRACY MOREIRA THEODORO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE IRMÃ ZILDA ARNS", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE JESUS MENINO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE JESUS NAZARENO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE PROF. ARMANDA ÁLVARO ALBERTO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE PROFª MARTA DE VASCONCELLOS", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. ANA NERY", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. BARONESA DE MESQUITA", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. CARLOS DRUMMOND DE ANDRADE", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. CASTRO ALVES", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. GASTÃO DOS REIS PONTES", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. HONÓRIO BICALHO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. JOSÉ CARLOS COUTINHO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. JOSÉ MEDEIROS", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. LEOPOLDO FRÓES", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MARIO QUINTANA", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MONTEIRO LOBATO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. NILO PEÇANHA", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. OSWALDO CRUZ", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. PEDRO RODRIGUES DO CARMO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. PROFESSORA MARÍLIA DA SILVA SIQUEIRA", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. RIO BRANCO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. SETE DE SETEMBRO", district: "1º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. VISCONDE DE ITABORAÍ", district: "1º Distrito", address: "", lat: null, lng: null },
  
  // 2º Distrito
  { name: "CCAIC - CAMPOS ELÍSEOS", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "CCAIC - PARQUE MUÍSA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE AYRTON SENNA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE e PRE-ESC PROFª MARIA LUCIA ANDRADE RIBEIRO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE PROFª JESUÍNA FATIMA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. ALVARO ALBERTO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. AMÉLIA CÂMARA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. ANTONIO GRANJA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. BARÃO DO AMAPÁ", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. BOM RETIRO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. CALIFÓRNIA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. CARMEN LUCIA ABRANTES", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. COSTA E SILVA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. DARCY RIBEIRO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. DARCY VARGAS", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. DORNELLAS", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. ELIZABETH LOPES CABRAL", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. FAUSTINO JOSÉ DA SILVA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. HÉLIO RANGEL", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. IMACULADA CONCEIÇÃO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. ITAMAR FRANCO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. JOAQUIM SALGUEIRO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. LAURA DE ARAÚJO MENEZES", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. LAURENTINA DUARTE", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MÁRCIO CANELA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MARECHAL FLORIANO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MARIA DE ARAÚJO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MARIA JOSÉ DE OLIVEIRA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. NOVA CAMPINAS", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. OLGA TEIXEIRA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. OSWALDO ARANHA", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. PARTEIRA ODETE", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. PEQUENO GUERREIRO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. PRES. TANCREDO NEVES", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. RICARDO AUGUSTO DA SILVA CARVALHO", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. ROMEU DE ARAÚJO MENEZES", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. SERGIPE", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. TERESA DE LISIEUX", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. VILMAR BASTOS", district: "2º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. WEGUELIN", district: "2º Distrito", address: "", lat: null, lng: null },
  
  // 3º Distrito  
  { name: "CCAIC - JARDIM ANHANGÁ", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE e PRÉ-ESC PROFª ARMANDA ÁLVARO ALBERTO", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE IRMÃ ARNALDA DA SILVA", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "CRECHE MONSENHOR LIBRELLOTO", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "CIEP 227 - PROCÓPIO FERREIRA", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "CIEP 328 - MARIE CURIE", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. BOMFIM DE CASTRO", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. CELIA RABELO", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. HIDEKEL DE FREITAS TORRES", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. JOSÉ DE SOUZA HERDY", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. MOACYR PADILHA", district: "3º Distrito", address: "", lat: null, lng: null },
  { name: "E.M. PAULO MENDES CAMPOS", district: "3º Distrito", address: "", lat: null, lng: null }
];

// Função para normalizar nomes
function normalizeString(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

// Função para calcular similaridade
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

// Função para fazer matching com escolas existentes
async function matchSchools() {
  console.log('Carregando escolas existentes...');
  
  // Carregar escolas do arquivo JSON
  const existingSchools = JSON.parse(fs.readFileSync('./src/utils/schools.json', 'utf8'));
  
  const matches = [];
  const unmatched = [];
  
  googleMapsSchools.forEach(googleSchool => {
    const normalizedGoogleName = normalizeString(googleSchool.name);
    
    // Procurar match nas escolas existentes
    const match = existingSchools.find(school => {
      const normalizedExistingName = normalizeString(school.name);
      
      // Verificar similaridade
      return normalizedGoogleName.includes(normalizedExistingName) || 
             normalizedExistingName.includes(normalizedGoogleName) ||
             calculateSimilarity(normalizedGoogleName, normalizedExistingName) > 0.6;
    });
    
    if (match) {
      matches.push({
        existing_school: match,
        google_school: googleSchool,
        confidence: calculateSimilarity(normalizeString(match.name), normalizedGoogleName)
      });
    } else {
      unmatched.push(googleSchool);
    }
  });
  
  return { matches, unmatched };
}

// Função para criar tabela se não existir
async function createSchoolsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schools_with_location (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      original_name TEXT,
      district TEXT,
      address TEXT,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      google_maps_name TEXT,
      url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await supabaseClient.query(createTableSQL);
    console.log('Tabela schools_with_location criada/verificada com sucesso');
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
  }
}

// Função para inserir dados no Supabase
async function insertIntoSupabase(matches, unmatched) {
  console.log('Inserindo dados no Supabase...');
  
  const schoolsToInsert = [];
  
  // Adicionar matches
  matches.forEach(match => {
    schoolsToInsert.push({
      name: match.existing_school.name,
      original_name: match.existing_school.name,
      district: match.google_school.district,
      address: match.google_school.address || '',
      latitude: match.google_school.lat,
      longitude: match.google_school.lng,
      google_maps_name: match.google_school.name,
      url: match.existing_school.url
    });
  });
  
  // Adicionar unmatched (escolas encontradas no Google Maps mas não na base)
  unmatched.forEach(school => {
    schoolsToInsert.push({
      name: school.name,
      original_name: school.name,
      district: school.district,
      address: school.address || '',
      latitude: school.lat,
      longitude: school.lng,
      google_maps_name: school.name,
      url: null
    });
  });
  
  // Inserir em lotes
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < schoolsToInsert.length; i += batchSize) {
    const batch = schoolsToInsert.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabaseClient.from('schools_with_location').upsert(batch, {
        onConflict: 'name'
      });
      
      if (error) {
        console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
        results.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
      } else {
        console.log(`Lote ${Math.floor(i / batchSize) + 1} inserido com sucesso`);
        results.push({ batch: Math.floor(i / batchSize) + 1, success: true });
      }
    } catch (err) {
      console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, err);
      results.push({ batch: Math.floor(i / batchSize) + 1, error: err.message });
    }
  }
  
  return { results, totalInserted: schoolsToInsert.length };
}

// Função principal
async function main() {
  try {
    console.log('=== IMPORTAÇÃO GOOGLE MY MAPS → SUPABASE ===\n');
    
    // Criar tabela se necessário
    await createSchoolsTable();
    
    // Fazer matching
    const { matches, unmatched } = await matchSchools();
    
    console.log(`📊 Relatório do Matching:`);
    console.log(`   • Total Google Maps: ${googleMapsSchools.length}`);
    console.log(`   • Matches encontrados: ${matches.length}`);
    console.log(`   • Não encontrados: ${unmatched.length}\n`);
    
    // Mostrar alguns matches para verificação
    console.log(`✅ Primeiros 5 matches:`);
    matches.slice(0, 5).forEach((match, i) => {
      console.log(`   ${i+1}. ${match.google_school.name}`);
      console.log(`      → ${match.existing_school.name}`);
      console.log(`      (Confiança: ${(match.confidence * 100).toFixed(1)}%)\n`);
    });
    
    // Mostrar unmatched
    if (unmatched.length > 0) {
      console.log(`❌ Escolas não encontradas na base (primeiras 5):`);
      unmatched.slice(0, 5).forEach((school, i) => {
        console.log(`   ${i+1}. ${school.name} (${school.district})`);
      });
      console.log('');
    }
    
    // Salvar relatório
    const report = {
      timestamp: new Date().toISOString(),
      total_google_schools: googleMapsSchools.length,
      matches_count: matches.length,
      unmatched_count: unmatched.length,
      matches: matches.map(m => ({
        google_name: m.google_school.name,
        existing_name: m.existing_school.name,
        district: m.google_school.district,
        confidence: m.confidence
      })),
      unmatched: unmatched.map(u => ({
        name: u.name,
        district: u.district
      }))
    };
    
    fs.writeFileSync('google-maps-import-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Relatório salvo em: google-maps-import-report.json\n');
    
    // Inserir no Supabase
    console.log('🚀 Iniciando inserção no Supabase...');
    const { results, totalInserted } = await insertIntoSupabase(matches, unmatched);
    
    console.log(`\n✨ Importação concluída!`);
    console.log(`   • Total processado: ${totalInserted} escolas`);
    console.log(`   • Lotes processados: ${results.length}`);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.log(`   • Sucessos: ${successCount}`);
    console.log(`   • Erros: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n❌ Lotes com erro:');
      results.filter(r => r.error).forEach(r => {
        console.log(`   Lote ${r.batch}: ${r.error}`);
      });
    }
    
  } catch (error) {
    console.error('Erro na execução:', error);
  }
}

// Executar
if (require.main === module) {
  main();
}

module.exports = {
  matchSchools,
  insertIntoSupabase,
  googleMapsSchools
};