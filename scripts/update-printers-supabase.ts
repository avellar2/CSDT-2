import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dados da planilha "impressoras 15-04-26.xlsx"
const printersFromExcel = [
  { sigla: "NSGE", modelo: "C8035", marca: "XEROX", serial: "2TX053914", ip: "10.0.2.36" },
  { sigla: "RPP", modelo: "4103fdw", marca: "HP", serial: "BRBSR520Y8", ip: "10.0.2.20" },
  { sigla: "PROTOCOLO", modelo: "C7020", marca: "XEROX", serial: "3UA283864", ip: "10.0.2.27" },
  { sigla: "CPFPF", modelo: "C8035", marca: "XEROX", serial: "2TX053074", ip: "10.0.2.26" },
  { sigla: "DEJUR", modelo: "C8035", marca: "XEROX", serial: "3TX393012", ip: "10.0.2.54" },
  { sigla: "CIE", modelo: "C7020", marca: "XEROX", serial: "9TX216149", ip: "10.0.2.25" },
  { sigla: "CAE", modelo: "C8035", marca: "XEROX", serial: "3TX396057", ip: "10.0.2.24" },
  { sigla: "CME", modelo: "C8035", marca: "XEROX", serial: "3TX388782", ip: "10.0.2.23" },
  { sigla: "CACS FUNDEB", modelo: "C7020", marca: "XEROX", serial: "9TX217425", ip: "10.0.2.64" },
  { sigla: "CAED", modelo: "C7020", marca: "XEROX", serial: "7TX136736", ip: "10.0.2.62" },
  { sigla: "OUV", modelo: "M479fdw", marca: "HP", serial: "CNCRQDM235", ip: "10.0.2.22" },
  { sigla: "NAI", modelo: "C7020", marca: "XEROX", serial: "9TX219522", ip: "10.0.2.60" },
  { sigla: "CSDT", modelo: "WF-C878R", marca: "EPSON", serial: "X6G9004187", ip: "10.0.10.178" },
  { sigla: "SUPED", modelo: "C8035", marca: "XEROX", serial: "3TX387078", ip: "10.0.2.30" },
  { sigla: "CEI", modelo: "C7020", marca: "XEROX", serial: "9TX215585", ip: "10.0.2.31" },
  { sigla: "DEB", modelo: "C8035", marca: "XEROX", serial: "2TX063708", ip: "10.0.2.32" },
  { sigla: "DAISE", modelo: "ES8473", marca: "OKI", serial: "AL77042454", ip: "10.0.2.33" },
  { sigla: "DAIE", modelo: "C8035", marca: "XEROX", serial: "2TX054434", ip: "10.0.2.34" },
  { sigla: "DPPE", modelo: "MC780", marca: "OKI", serial: "AK42014643", ip: "10.0.2.35" },
  { sigla: "CEJA", modelo: "C8035", marca: "XEROX", serial: "3TX391129", ip: "10.0.2.37" },
  { sigla: "CLL", modelo: "C7020", marca: "XEROX", serial: "9TX215660", ip: "10.0.2.38" },
  { sigla: "NUMP", modelo: "MC573", marca: "OKI", serial: "BW03000778", ip: "10.0.2.63" },
  { sigla: "CEF I", modelo: "ES8473", marca: "OKI", serial: "AL9A016426", ip: "10.0.2.76" },
  { sigla: "COTRAN", modelo: "C7020", marca: "XEROX", serial: "9TX216558", ip: "10.0.2.39" },
  { sigla: "SAGP", modelo: "C8035", marca: "XEROX", serial: "2TX061569", ip: "10.0.2.28" },
  { sigla: "ASS/SAGP", modelo: "C8035", marca: "XEROX", serial: "3TX388298", ip: "10.0.2.29" },
  { sigla: "CAT", modelo: "MC780", marca: "OKI", serial: "AK92028012B0", ip: "10.0.2.40" },
  { sigla: "DGP", modelo: "E42540F", marca: "HP", serial: "BRBST7107M", ip: "10.0.8.75" },
  { sigla: "DGP", modelo: "ES4172LP MFP", marca: "OKI", serial: "AK71016949B0", ip: "10.0.2.18" },
  { sigla: "DGP", modelo: "MC573", marca: "OKI", serial: "AK95025228", ip: "10.0.2.42" },
  { sigla: "DIE", modelo: "C8045", marca: "XEROX", serial: "8TB610616", ip: "10.0.8.91" },
  { sigla: "NF", modelo: "C8035", marca: "XEROX", serial: "2TX051488", ip: "10.0.2.44" },
  { sigla: "CAESC", modelo: "MC573", marca: "OKI", serial: "BW03000762B0", ip: "10.0.2.45", useId: 28 },
  { sigla: "NL", modelo: "C8035", marca: "XEROX", serial: "3TX387920", ip: "10.0.2.46" },
  { sigla: "CAPC", modelo: "MC573", marca: "OKI", serial: "BW01031027", ip: "10.0.2.47", useId: 29 },
  { sigla: "AC", modelo: "ES8473", marca: "OKI", serial: "AL57000629", ip: "10.0.2.48" },
  { sigla: "NAA", modelo: "M479FDW", marca: "HP", serial: "CNCRQDM1SX", ip: "10.0.2.56" },
  { sigla: "CGP", modelo: "MC573", marca: "OKI", serial: "BW04003441", ip: "10.0.2.41" },
  { sigla: "SUPLAN", modelo: "C8035", marca: "XEROX", serial: "2TX052685", ip: "10.0.2.50" },
  { sigla: "DCC", modelo: "C7020", marca: "XEROX", serial: "9TX215816", ip: "10.0.2.51" },
  { sigla: "DCF", modelo: "ES8473", marca: "OKI", serial: "AL7B009942D0", ip: "10.0.2.52" },
  { sigla: "AG", modelo: "E77830", marca: "HP", serial: "CNC1M5W0B3", ip: "10.0.2.53" },
  { sigla: "PATRIMONIO", modelo: "C7020", marca: "XEROX", serial: "9TX216404", ip: "10.0.2.78" },
  { sigla: "RG", modelo: "ES8473", marca: "OKI", serial: "BX0A010891", ip: "10.0.2.55" }
];

async function updatePrinters() {
  console.log('🖨️  Atualizando impressoras da planilha no Supabase...\n');

  // Buscar impressoras existentes
  const existingPrinters = await prisma.printer.findMany();
  console.log(`📊 Impressoras existentes no banco: ${existingPrinters.length}\n`);

  let created = 0;
  let updated = 0;
  let updatedBySigla = 0;
  let errors = 0;

  for (const printer of printersFromExcel) {
    try {
      // Primeiro, tentar encontrar pelo serial
      let existing = await prisma.printer.findUnique({
        where: { serial: printer.serial }
      });

      if (existing) {
        // Atualizar impressora existente (pelo serial)
        await prisma.printer.update({
          where: { serial: printer.serial },
          data: {
            sigla: printer.sigla,
            setor: printer.sigla,
            modelo: printer.modelo,
            fabricante: printer.marca,
            ip: printer.ip
          }
        });
        updated++;
        console.log(`✅ Atualizado (serial): ${printer.sigla} - ${printer.modelo} (${printer.marca}) - IP: ${printer.ip}`);
      } else {
        // Se não encontrou por serial, verificar se existe pela sigla
        const existingBySigla = await prisma.printer.findFirst({
          where: { sigla: printer.sigla }
        });

        if (existingBySigla) {
          // Atualizar impressora existente (pela sigla)
          await prisma.printer.update({
            where: { id: existingBySigla.id },
            data: {
              sigla: printer.sigla,
              setor: printer.sigla,
              modelo: printer.modelo,
              fabricante: printer.marca,
              serial: printer.serial, // Atualizar serial também
              ip: printer.ip
            }
          });
          updatedBySigla++;
          console.log(`🔄 Atualizado (sigla): ${printer.sigla} - ${printer.modelo} (${printer.marca}) - IP: ${printer.ip} [Serial antigo: ${existingBySigla.serial}]`);
        } else {
          // Criar nova impressora (usar ID específico se disponível)
          const createData: any = {
            sigla: printer.sigla,
            setor: printer.sigla,
            modelo: printer.modelo,
            fabricante: printer.marca,
            serial: printer.serial,
            ip: printer.ip
          };

          // Se tiver um ID específico para usar (para填补 gaps de IDs)
          if ('useId' in printer && typeof printer.useId === 'number') {
            createData.id = printer.useId;
          }

          await prisma.printer.create({
            data: createData
          });
          created++;
          console.log(`➕ Criado: ${printer.sigla} - ${printer.modelo} (${printer.marca}) - IP: ${printer.ip}${createData.id ? ` [ID: ${createData.id}]` : ''}`);
        }
      }
    } catch (error) {
      errors++;
      console.error(`❌ Erro ao processar ${printer.sigla}:`, error);
    }
  }

  console.log('\n📊 RESUMO:');
  console.log(`   ➕ Criados: ${created}`);
  console.log(`   ✅ Atualizados (por serial): ${updated}`);
  console.log(`   🔄 Atualizados (por sigla): ${updatedBySigla}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log(`   📦 Total processados: ${printersFromExcel.length}`);

  // Mostrar total final
  const finalCount = await prisma.printer.count();
  console.log(`   🖨️  Total de impressoras no banco: ${finalCount}`);
}

updatePrinters()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    return prisma.$disconnect();
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    prisma.$disconnect();
    process.exit(1);
  });
