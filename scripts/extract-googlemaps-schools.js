const puppeteer = require('puppeteer');
const fs = require('fs');
const { supabase } = require('../src/lib/supabaseClient');

// URL do Google My Maps
const GOOGLE_MAPS_URL = 'https://www.google.com/maps/d/u/0/edit?mid=1ncRmFib5PqiPTUNz9okgRzoYVdBWYOrB&usp=sharing';

// Função para normalizar nomes de escolas
function normalizeSchoolName(name) {
  return name
    .replace(/^(CRECHE|E\.M\.|EM|ESCOLA|CIEP|CCAIC|SME)\s+/i, '')
    .replace(/\s+(MUNICIPAL|DE|DA|DO|DOS|DAS|E|PRE-ESC|PRÉ-ESC)\s+/gi, ' ')
    .trim()
    .toLowerCase();
}

// Função para extrair dados do Google My Maps
async function extractGoogleMapsData() {
  const browser = await puppeteer.launch({ 
    headless: false, // Para debug, mude para true em produção
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  try {
    const page = await browser.newPage();
    
    // Navegar para a página
    console.log('Navegando para o Google My Maps...');
    await page.goto(GOOGLE_MAPS_URL, { waitUntil: 'networkidle2' });
    
    // Aguardar o mapa carregar
    await page.waitForTimeout(5000);
    
    // Extrair dados dos marcadores
    console.log('Extraindo dados dos marcadores...');
    const schools = await page.evaluate(() => {
      const markers = [];
      
      // Procurar por elementos que contenham informações das escolas
      // Isso pode precisar ser ajustado dependendo da estrutura HTML atual
      const elements = document.querySelectorAll('[data-value]');
      
      elements.forEach(element => {
        const text = element.textContent || element.innerText;
        if (text && text.includes('ESCOLA') || text.includes('CRECHE') || text.includes('CIEP') || text.includes('CCAIC')) {
          // Tentar extrair coordenadas se disponíveis
          const coords = element.getAttribute('data-coords') || '';
          const [lat, lng] = coords ? coords.split(',').map(Number) : [null, null];
          
          markers.push({
            name: text.trim(),
            address: '', // Será preenchido se encontrado
            latitude: lat,
            longitude: lng,
            raw_text: text
          });
        }
      });
      
      return markers;
    });
    
    console.log(`Encontradas ${schools.length} escolas`);
    return schools;
    
  } catch (error) {
    console.error('Erro ao extrair dados:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Função alternativa usando a API do Google Maps (se a chave estiver disponível)
async function extractViaKML() {
  const kmlUrl = `https://www.google.com/maps/d/kml?mid=1ncRmFib5PqiPTUNz9okgRzoYVdBWYOrB`;
  
  try {
    console.log('Tentando extrair via KML...');
    const response = await fetch(kmlUrl);
    const kmlText = await response.text();
    
    // Parse básico do KML para extrair placemark
    const placemarks = [];
    const regex = /<Placemark>[\s\S]*?<\/Placemark>/g;
    const matches = kmlText.match(regex) || [];
    
    matches.forEach(placemark => {
      const nameMatch = placemark.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/);
      const descMatch = placemark.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      const coordsMatch = placemark.match(/<coordinates>(.*?)<\/coordinates>/);
      
      if (nameMatch) {
        const name = nameMatch[1];
        const description = descMatch ? descMatch[1] : '';
        const coords = coordsMatch ? coordsMatch[1].trim().split(',') : [];
        
        placemarks.push({
          name: name,
          description: description,
          longitude: coords[0] ? parseFloat(coords[0]) : null,
          latitude: coords[1] ? parseFloat(coords[1]) : null,
          address: description // Usar descrição como endereço temporariamente
        });
      }
    });
    
    return placemarks;
  } catch (error) {
    console.error('Erro ao extrair via KML:', error);
    return [];
  }
}

// Função para fazer matching com escolas existentes
async function matchWithExistingSchools(googleSchools) {
  console.log('Carregando escolas existentes...');
  
  // Carregar escolas do arquivo JSON
  const existingSchools = JSON.parse(fs.readFileSync('./src/utils/schools.json', 'utf8'));
  
  const matches = [];
  const unmatched = [];
  
  googleSchools.forEach(googleSchool => {
    const normalizedGoogleName = normalizeSchoolName(googleSchool.name);
    
    // Procurar match nas escolas existentes
    const match = existingSchools.find(school => {
      const normalizedExistingName = normalizeSchoolName(school.name);
      
      // Verificar similaridade
      return normalizedGoogleName.includes(normalizedExistingName) || 
             normalizedExistingName.includes(normalizedGoogleName) ||
             calculateSimilarity(normalizedGoogleName, normalizedExistingName) > 0.7;
    });
    
    if (match) {
      matches.push({
        existingSchool: match,
        googleSchool: googleSchool,
        confidence: calculateSimilarity(normalizeSchoolName(match.name), normalizedGoogleName)
      });
    } else {
      unmatched.push(googleSchool);
    }
  });
  
  return { matches, unmatched };
}

// Função para calcular similaridade
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Função para atualizar no Supabase
async function updateSupabase(matches) {
  console.log('Atualizando Supabase...');
  
  const updates = [];
  const errors = [];
  
  for (const match of matches) {
    try {
      // Assuming there's a schools table in Supabase
      const { data, error } = await supabase
        .from('schools')
        .upsert({
          name: match.existingSchool.name,
          address: match.googleSchool.address,
          latitude: match.googleSchool.latitude,
          longitude: match.googleSchool.longitude,
          google_maps_name: match.googleSchool.name,
          url: match.existingSchool.url
        }, { 
          onConflict: 'name' 
        });
      
      if (error) {
        errors.push({ school: match.existingSchool.name, error: error.message });
      } else {
        updates.push(match.existingSchool.name);
      }
    } catch (err) {
      errors.push({ school: match.existingSchool.name, error: err.message });
    }
  }
  
  return { updates, errors };
}

// Função principal
async function main() {
  try {
    console.log('Iniciando extração de dados do Google My Maps...');
    
    // Tentar extrair via KML primeiro
    let googleSchools = await extractViaKML();
    
    // Se KML não funcionou, tentar via Puppeteer
    if (googleSchools.length === 0) {
      console.log('KML não funcionou, tentando via Puppeteer...');
      googleSchools = await extractGoogleMapsData();
    }
    
    if (googleSchools.length === 0) {
      console.log('Não foi possível extrair dados do Google Maps');
      return;
    }
    
    console.log(`Extraídas ${googleSchools.length} escolas do Google Maps`);
    
    // Fazer matching com escolas existentes
    const { matches, unmatched } = await matchWithExistingSchools(googleSchools);
    
    console.log(`\n=== RELATÓRIO ===`);
    console.log(`Matches encontrados: ${matches.length}`);
    console.log(`Escolas não encontradas: ${unmatched.length}`);
    
    // Salvar relatório
    const report = {
      timestamp: new Date().toISOString(),
      total_google_schools: googleSchools.length,
      matches: matches.length,
      unmatched: unmatched.length,
      matches_data: matches,
      unmatched_data: unmatched
    };
    
    fs.writeFileSync('google-maps-extraction-report.json', JSON.stringify(report, null, 2));
    console.log('\nRelatório salvo em: google-maps-extraction-report.json');
    
    // Perguntar se deve atualizar o Supabase
    console.log('\nDeseja atualizar o Supabase com os matches encontrados? (y/n)');
    // Para script automático, descomente a linha abaixo
    // const { updates, errors } = await updateSupabase(matches);
    
  } catch (error) {
    console.error('Erro na execução:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  extractGoogleMapsData,
  extractViaKML,
  matchWithExistingSchools,
  updateSupabase
};