import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAvailableIds() {
  const ps = await prisma.printer.findMany({
    orderBy: { id: 'asc' }
  });

  const ids = ps.map(p => p.id);
  console.log('IDs em uso:', ids.join(', '));

  // Encontrar IDs disponíveis entre 1 e 60
  const available = [];
  for (let i = 1; i <= 60; i++) {
    if (!ids.includes(i)) available.push(i);
  }
  console.log('IDs disponíveis:', available.join(', '));

  await prisma.$disconnect();
}

findAvailableIds();
