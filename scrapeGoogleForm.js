const puppeteer = require('puppeteer');
const axios = require('axios');
const qs = require('qs');

const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc08gbw8MxvJnozXaxfm7hJAppAZSHb7PzQ7DFFEFn0DrdyNg/formResponse';

const scrapeGoogleForm = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(googleFormUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  const inputs = await page.evaluate(() => {
    const inputElements = document.querySelectorAll('input, textarea, select');
    const inputs = [];
    inputElements.forEach(input => {
      const name = input.name;
      const type = input.type;
      inputs.push({ name, type });
    });
    return inputs;
  });

  await browser.close();
  return inputs;
};

const submitToGoogleForm = async (formData) => {
  try {
    const response = await axios.post(googleFormUrl, qs.stringify(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('Dados enviados com sucesso!', response.status);
  } catch (error) {
    console.error('Erro ao enviar dados:', error);
  }
};

const main = async () => {
  const inputs = await scrapeGoogleForm();
  console.log('Inputs do Google Form:', inputs);

  // Exemplo de dados extraídos da OS
  const osData = {
    numeroOS: '12345',
    dataVisita: '2025-03-03',
    horarioVisita: '10:00',
    tecnicoResponsavel: 'Hélio',
    escolaVisitada: 'Escola XYZ',
    localVisita: 'UNIDADE PRINCIPAL',
    escolaAberta: 'Sim',
    motivoFechada: '',
    responsavelAcompanhamento: 'João Silva',
    cargo: 'Diretor',
    objetivoVisita: 'Manutenção de equipamentos na U.E',
    descricaoVisita: 'Troca de cabos e manutenção de computadores.',
    problemaSolucionado: 'Sim',
    motivoNaoSolucionado: '',
    orientacoesProximoTecnico: 'Verificar rede elétrica.',
    dataFinalizacao: '2025-03-03',
    horarioFinalizacao: '12:00',
    responsavelConclusao: 'Hélio',
  };

  // Mapeamento dos dados da OS para os inputs do Google Form
  const formData = {
    'entry.1234567890': osData.numeroOS,
    'entry.0987654321': osData.dataVisita,
    'entry.1122334455': osData.horarioVisita,
    'entry.5566778899': osData.tecnicoResponsavel,
    'entry.6677889900': osData.escolaVisitada,
    'entry.7788990011': osData.localVisita,
    'entry.8899001122': osData.escolaAberta,
    'entry.9900112233': osData.motivoFechada,
    'entry.0011223344': osData.responsavelAcompanhamento,
    'entry.1122334455': osData.cargo,
    'entry.2233445566': osData.objetivoVisita,
    'entry.3344556677': osData.descricaoVisita,
    'entry.4455667788': osData.problemaSolucionado,
    'entry.5566778899': osData.motivoNaoSolucionado,
    'entry.6677889900': osData.orientacoesProximoTecnico,
    'entry.7788990011': osData.dataFinalizacao,
    'entry.8899001122': osData.horarioFinalizacao,
    'entry.9900112233': osData.responsavelConclusao,
  };

  await submitToGoogleForm(formData);
};

main();