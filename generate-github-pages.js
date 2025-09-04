// Script para gerar os-antigas.json automaticamente
const fs = require('fs');

// CONFIGURE AQUI:
const GITHUB_USER = "avellar2";
const REPO_NAME = "csdt-pdfs";

// Lista dos seus 69 PDFs
const pdfFiles = [
  "ALVARO ALBERTO 2.pdf",
  "ALVARO ALBERTO.pdf",
  "AMELIA CAMARA.pdf",
  "ANA NERY.pdf",
  "ANTON.pdf",
  "BAIRRO CALIFORNIA.pdf",
  "BARRO BRANCO.pdf",
  "BARÃO DO AMAPÁ.pdf",
  "BOM RETIRO.pdf",
  "BOMFIM DE CASTRO.pdf",
  "CARMEM LUCIA.pdf",
  "CCAIC AMAPÁ.pdf",
  "CCAIC JARDIM GRAMACHO.pdf",
  "CELIA RABELO.pdf",
  "COSTA E SILVA 2.pdf",
  "COSTA E SILVA.pdf",
  "DARCY RIBEIRO.pdf",
  "DARCY VARGAS.pdf",
  "DORNELLES.pdf",
  "ELISABETH LOPES CABRAL 2.pdf",
  "ELISABETH LOPES CABRAL.pdf",
  "FAUSTINO.pdf",
  "GASTÃO REIS.pdf",
  "GRACIESSE.pdf",
  "HIDEKEL.pdf",
  "IMACULADA.pdf",
  "ITAMAR FRANCO.pdf",
  "JARDIM GRAMACHO 2.pdf",
  "JARDIM GRAMACHO.pdf",
  "JOAQUIM SALGUEIRO.pdf",
  "JOSÉ CARLOS COUTINHO 2.pdf",
  "JOSÉ CARLOS COUTINHO.pdf",
  "JOSÉ DE SOUZA HERDY.pdf",
  "JOSÉ MEDEIROS.pdf",
  "LAURA MENEZES.pdf",
  "LAURENTINA DUARTE.pdf",
  "MARCIO FIAT.pdf",
  "MARECHAL FLORIANO.pdf",
  "MARIA DE ARAUJO.pdf",
  "MARIA JOSÉ DE OLIVEIRA.pdf",
  "MARIE CURRIE.pdf",
  "MARILIA DA SILVA SIQUEIRA.pdf",
  "MOACYR PADILHA.pdf",
  "MONTEIRO LOBATO.pdf",
  "NOVA CAMPINAS.pdf",
  "ODUVALDO VIANA.pdf",
  "OLGA TEXEIRA 2.pdf",
  "OLGA TEXEIRA.pdf",
  "OSWALDO ARANHA.pdf",
  "OSWALDO CRUZ.pdf",
  "PARTEIRA ODETE.pdf",
  "PAULO MENDES.pdf",
  "PEDRO RODRIGUES.pdf",
  "PEQUENO GUERREIRO.pdf",
  "PROCOPIO.pdf",
  "RICARDO AUGUSTO.pdf",
  "RIO BRANCO.pdf",
  "ROMEU MENEZES.pdf",
  "SERGIPE 2.pdf",
  "SERGIPE.pdf",
  "SETE DE SETEMBRO.pdf",
  "TANCREDO NEVES.pdf",
  "TEREZA LISIEUX 2.pdf",
  "TEREZA LISIEUX.pdf",
  "VILMAR BASTOS.pdf",
  "VISCONDE DE ITABORAÍ.pdf",
  "WEGUELIN 2.pdf",
  "WEGUELIN.pdf",
  "YOLANDA BORGES.pdf"
];

// Função para converter nome do arquivo em nome da escola
function formatSchoolName(filename) {
  return filename
    .replace('.pdf', '')
    .replace(/-/g, ' ')
    .replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// Gera o array
const osAntigas = pdfFiles.map(filename => ({
  escola: formatSchoolName(filename),
  pdfUrl: `https://${GITHUB_USER}.github.io/${REPO_NAME}/${filename}`
}));

// Salva o JSON
const jsonContent = JSON.stringify(osAntigas, null, 2);
fs.writeFileSync('os-antigas-github.json', jsonContent);

// Salva o TypeScript também
const tsContent = `const osAntigas: OSAntiga[] = ${JSON.stringify(osAntigas, null, 2)};`;
fs.writeFileSync('os-antigas-typescript.txt', tsContent);

console.log('✅ Arquivos gerados:');
console.log('📄 os-antigas-github.json (para subir no GitHub)');
console.log('📄 os-antigas-typescript.txt (para colar no código)');
console.log(`🎯 Total: ${osAntigas.length} escolas`);
console.log('\n🔗 URLs geradas para:', `https://${GITHUB_USER}.github.io/${REPO_NAME}/`);