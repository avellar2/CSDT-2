import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'impressoras.xlsx'; // Substitua pelo caminho do seu arquivo Excel
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Remove the header row
  data.shift();

  let serialCounter = 1;

  for (const row of data) {
    let serial = row[4] || `não informado${serialCounter}`;
    if (!row[4]) {
      serialCounter++;
    }

    const existingPrinter = await prisma.printer.findUnique({
      where: { serial },
    });

    if (!existingPrinter) {
      await prisma.printer.create({
        data: {
          sigla: row[0] || 'não informado',
          setor: row[1] || 'não informado',
          modelo: row[2] || 'não informado',
          fabricante: row[3] || 'não informado',
          serial,
          ip: row[5] || 'não informado',
        },
      });
    } else {
      console.log(`Impressora com serial ${serial} já existe. Ignorando...`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });