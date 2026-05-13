import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dados da planilha com setor
const printersWithSetor = [
  { sigla: "NSGE", modelo: "C8035", marca: "XEROX", serial: "2TX053914", ip: "10.0.2.36", setor: "NÚCLEO DO SISTEMA DE GESTÃO EDUCACIONAL" },
  { sigla: "RPP", modelo: "4103fdw", marca: "HP", serial: "BRBSR520Y8", ip: "10.0.2.20", setor: "Recepção da Portaria Principal" },
  { sigla: "PROTOCOLO", modelo: "C7020", marca: "XEROX", serial: "3UA283864", ip: "10.0.2.27", setor: "Núcleo de Processos" },
  { sigla: "CPFPF", modelo: "C8035", marca: "XEROX", serial: "2TX053074", ip: "10.0.2.26", setor: "Sala Paulo Freire" },
  { sigla: "DEJUR", modelo: "C8035", marca: "XEROX", serial: "3TX393012", ip: "10.0.2.54", setor: "Departamento Jurídico" },
  { sigla: "CIE", modelo: "C7020", marca: "XEROX", serial: "9TX216149", ip: "10.0.2.25", setor: "Conselho de Inspeção Escolar" },
  { sigla: "CAE", modelo: "C8035", marca: "XEROX", serial: "3TX396057", ip: "10.0.2.24", setor: "Conselho de Alimentação Escolar" },
  { sigla: "CME", modelo: "C8035", marca: "XEROX", serial: "3TX388782", ip: "10.0.2.23", setor: "Conselho Municipal de Educação" },
  { sigla: "CACS FUNDEB", modelo: "C7020", marca: "XEROX", serial: "9TX217425", ip: "10.0.2.64", setor: "Conselho de Acompanhamento e Controle Social do Fundeb" },
  { sigla: "CAED", modelo: "C7020", marca: "XEROX", serial: "7TX136736", ip: "10.0.2.62", setor: "Coordenadoria de Assistência ao Educando" },
  { sigla: "OUV", modelo: "M479fdw", marca: "HP", serial: "CNCRQDM235", ip: "10.0.2.22", setor: "OUVIDORIA" },
  { sigla: "NAI", modelo: "C7020", marca: "XEROX", serial: "9TX219522", ip: "10.0.2.60", setor: "NÚCLEO DE AÇÕES INSTITUCIONAIS" },
  { sigla: "CSDT", modelo: "WF-C878R", marca: "EPSON", serial: "X6G9004187", ip: "10.0.10.178", setor: "Coordenadoria de Suporte e Desenvolvimento tecnológico" },
  { sigla: "SUPED", modelo: "C8035", marca: "XEROX", serial: "3TX387078", ip: "10.0.2.30", setor: "Subsecretaria Pedagógica" },
  { sigla: "CEI", modelo: "C7020", marca: "XEROX", serial: "9TX215585", ip: "10.0.2.31", setor: "Coordenadoria de Educação Infantil" },
  { sigla: "DEB", modelo: "C8035", marca: "XEROX", serial: "2TX063708", ip: "10.0.2.32", setor: "Departamento de Educação Básica" },
  { sigla: "DAISE", modelo: "ES8473", marca: "OKI", serial: "AL77042454", ip: "10.0.2.33", setor: "DEP. DE ACOMP. AS INTITUIÇÕES DE ENSINO" },
  { sigla: "DAIE", modelo: "C8035", marca: "XEROX", serial: "2TX054434", ip: "10.0.2.34", setor: "Coordenadoria de Educação Especial" },
  { sigla: "DPPE", modelo: "MC780", marca: "OKI", serial: "AK42014643", ip: "10.0.2.35", setor: "Dep. De Programas e Projetos Educacionais" },
  { sigla: "CEJA", modelo: "C8035", marca: "XEROX", serial: "3TX391129", ip: "10.0.2.37", setor: "Coordenadoria de Programas Jovens e Adultos" },
  { sigla: "CLL", modelo: "C7020", marca: "XEROX", serial: "9TX215660", ip: "10.0.2.38", setor: "Coordenadoria de Leitura Literária" },
  { sigla: "NUMP", modelo: "MC573", marca: "OKI", serial: "BW03000778", ip: "10.0.2.63", setor: "NÚCLEO MULTIPROFISSIONAL" },
  { sigla: "CEF I", modelo: "ES8473", marca: "OKI", serial: "AL9A016426", ip: "10.0.2.76", setor: "COORDENADORIA DE ENSINO FUNDAMENTAL I" },
  { sigla: "COTRAN", modelo: "C7020", marca: "XEROX", serial: "9TX216558", ip: "10.0.2.39", setor: "Coordenadoria de Transporte Educacional" },
  { sigla: "SAGP", modelo: "C8035", marca: "XEROX", serial: "2TX061569", ip: "10.0.2.28", setor: "Subsecretaria de Administração e Gestão de Pessoal" },
  { sigla: "ASS/SAGP", modelo: "C8035", marca: "XEROX", serial: "3TX388298", ip: "10.0.2.29", setor: "Assessoria/SAGP" },
  { sigla: "CAT", modelo: "MC780", marca: "OKI", serial: "AK92028012B0", ip: "10.0.2.40", setor: "Coordenadoria Administrativa (Terceirizados)" },
  { sigla: "DGP", modelo: "E42540F", marca: "HP", serial: "BRBST7107M", ip: "10.0.8.75", setor: "Departamento de Gestão Pessoal" },
  { sigla: "DGP", modelo: "ES4172LP MFP", marca: "OKI", serial: "AK71016949B0", ip: "10.0.2.18", setor: "Departamento de Gestão Pessoal" },
  { sigla: "DGP", modelo: "MC573", marca: "OKI", serial: "AK95025228", ip: "10.0.2.42", setor: "Departamento de Gestão Pessoal" },
  { sigla: "DIE", modelo: "C8045", marca: "XEROX", serial: "8TB610616", ip: "10.0.8.91", setor: "Departamento de Infraestrutura" },
  { sigla: "NF", modelo: "C8035", marca: "XEROX", serial: "2TX051488", ip: "10.0.2.44", setor: "Núcleo de Frequência" },
  { sigla: "CAESC", modelo: "MC573", marca: "OKI", serial: "BW03000762B0", ip: "10.0.2.45", setor: "Coordenadoria de Alimentação Escolar" },
  { sigla: "NL", modelo: "C8035", marca: "XEROX", serial: "3TX387920", ip: "10.0.2.46", setor: "Núcleo de Lotação" },
  { sigla: "CAPC", modelo: "MC573", marca: "OKI", serial: "BW01031027", ip: "10.0.2.47", setor: "Núcleo de Acompanhamento dos Conselhos Escolares" },
  { sigla: "AC", modelo: "ES8473", marca: "OKI", serial: "AL57000629", ip: "10.0.2.48", setor: "Assessoria de Comunicação" },
  { sigla: "NAA", modelo: "M479FDW", marca: "HP", serial: "CNCRQDM1SX", ip: "10.0.2.56", setor: "NUCLEO DE ACOMPANHAMENTO E AVALIAÇÃO" },
  { sigla: "CGP", modelo: "MC573", marca: "OKI", serial: "BW04003441", ip: "10.0.2.41", setor: "AULA EXTRA" },
  { sigla: "SUPLAN", modelo: "C8035", marca: "XEROX", serial: "2TX052685", ip: "10.0.2.50", setor: "SUBSECRETARIA DE PLANEJAMENTO" },
  { sigla: "DCC", modelo: "C7020", marca: "XEROX", serial: "9TX215816", ip: "10.0.2.51", setor: "Departamento de Controle e Contrato" },
  { sigla: "DCF", modelo: "ES8473", marca: "OKI", serial: "AL7B009942D0", ip: "10.0.2.52", setor: "Departamento de Controle e Finanças" },
  { sigla: "AG", modelo: "E77830", marca: "HP", serial: "CNC1M5W0B3", ip: "10.0.2.53", setor: "Assessoria do Gabinete" },
  { sigla: "PATRIMONIO", modelo: "C7020", marca: "XEROX", serial: "9TX216404", ip: "10.0.2.78", setor: "PATRIMONIO" },
  { sigla: "RG", modelo: "ES8473", marca: "OKI", serial: "BX0A010891", ip: "10.0.2.55", setor: "RECEPÇÃO DO GABINETE" }
];

async function updateSetores() {
  console.log('🔄 Atualizando setores das impressoras...\n');

  let updated = 0;
  let notFound = 0;
  let unchanged = 0;

  for (const printer of printersWithSetor) {
    try {
      // Buscar impressora pelo serial
      const existing = await prisma.printer.findUnique({
        where: { serial: printer.serial }
      });

      if (existing) {
        // Verificar se o setor é diferente
        if (existing.setor !== printer.setor) {
          await prisma.printer.update({
            where: { id: existing.id },
            data: {
              setor: printer.setor
            }
          });
          updated++;
          console.log(`✅ ${printer.sigla.padEnd(15)} | Setor atualizado: "${existing.setor}" → "${printer.setor}"`);
        } else {
          unchanged++;
        }
      } else {
        notFound++;
        console.log(`⚠️  ${printer.sigla} não encontrado (serial: ${printer.serial})`);
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${printer.sigla}:`, error);
    }
  }

  console.log('\n📊 RESUMO:');
  console.log(`   ✅ Atualizados: ${updated}`);
  console.log(`   ✅ Já corretos: ${unchanged}`);
  console.log(`   ⚠️  Não encontrados: ${notFound}`);
  console.log(`   📦 Total processados: ${printersWithSetor.length}`);

  // Mostrar algumas impressoras atualizadas para verificação
  console.log('\n📋 Amostra de impressoras atualizadas:');
  const sample = await prisma.printer.findMany({
    take: 10,
    orderBy: { sigla: 'asc' }
  });
  sample.forEach(p => {
    console.log(`   ${p.sigla.padEnd(15)} | ${p.setor}`);
  });
}

updateSetores()
  .then(() => {
    console.log('\n✅ Atualização de setores concluída!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    prisma.$disconnect();
    process.exit(1);
  });
