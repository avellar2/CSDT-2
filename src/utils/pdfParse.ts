const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = './public/unidades_escolares_2021.pdf'; // Caminho atualizado

const extractData = async () => {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  // Process the extracted text to create a structured JSON
  const lines = data.text.split('\n');
  const schools = [];

  for (let i = 0; i < lines.length; i += 3) {
    const school = {
      name: lines[i],
      director: lines[i + 1],
      address: lines[i + 2],
    };
    schools.push(school);
  }

  fs.writeFileSync('schools.json', JSON.stringify(schools, null, 2));
};

extractData();