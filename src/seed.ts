import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Caminho para o arquivo Excel
  const filePath = path.join(__dirname, '../public/schools.xlsx');

  // Ler o arquivo Excel
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Extrair os dados das colunas e garantir que todos os valores sejam strings
  const schools = jsonData.slice(1).map((row: any) => ({
    name: String(row[0] || 'Nome não informado'),        // Coluna A
    inep: parseInt(row[1]) || 0,                         // Coluna B
    district: String(row[2] || 'Distrito não informado'),// Coluna C
    address: String(row[3] || 'Endereço não informado'), // Coluna D
    director: String(row[4] || 'Diretor não informado'), // Coluna E
    phone: String(row[5] || 'Telefone não informado'),   // Coluna F
    email: String(row[6] || 'Email não informado'),      // Coluna G
  }));

  // Inserir os dados no banco de dados
  await prisma.school.createMany({
    data: schools,
    skipDuplicates: true, // Ignorar duplicatas
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });