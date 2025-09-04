const fs = require('fs');
const path = require('path');

// CONFIGURE AQUI:
const osData = [
  { escola: "Escola Municipal João Silva", pdfUrl: "https://drive.google.com/file/d/1xYzphi1_zLn39QPjgedczdPjna9tKOIN/view?usp=sharing" },
  { escola: "Escola Estadual Maria Santos", pdfUrl: "https://drive.google.com/file/d/SEU_ID_AQUI_2/view?usp=sharing" },
  // ADICIONE TODAS AS 69 ESCOLAS AQUI OU USE A FUNÇÃO ABAIXO
];

// OU use esta função para gerar automaticamente:
function generateFromCSV() {
  // Se você tiver um CSV com: escola,linkPDF
  // const csvData = fs.readFileSync('escolas.csv', 'utf8');
  // const lines = csvData.split('\n').slice(1); // Remove header
  // return lines.map(line => {
  //   const [escola, pdfUrl] = line.split(',');
  //   return { escola: escola.trim(), pdfUrl: pdfUrl.trim() };
  // });
}

// Função para gerar por padrão (se os links seguem um padrão)
function generateByPattern() {
  const escolas = [
    "Escola Municipal João Silva",
    "Escola Estadual Maria Santos", 
    "Colégio São José",
    // ... adicione os 69 nomes aqui
  ];
  
  return escolas.map((escola, index) => ({
    escola,
    pdfUrl: `https://drive.google.com/file/d/SEU_ID_${index + 1}/view?usp=sharing`
  }));
}

// Gera o código TypeScript
function generateTypescriptArray(data) {
  const arrayContent = data.map(item => 
    `      {\n        escola: "${item.escola}",\n        pdfUrl: "${item.pdfUrl}"\n      }`
  ).join(',\n');
  
  return `    const osAntigas: OSAntiga[] = [\n${arrayContent}\n    ];`;
}

// Executa
const finalData = osData; // ou generateFromCSV() ou generateByPattern()
const typescriptCode = generateTypescriptArray(finalData);

console.log('=== CÓDIGO GERADO ===');
console.log(typescriptCode);

// Salva em arquivo
fs.writeFileSync('os-antigas-generated.txt', typescriptCode);
console.log('\n✅ Código salvo em: os-antigas-generated.txt');
console.log('\n📋 Copie e cole no seu código React!');