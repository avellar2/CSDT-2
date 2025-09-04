const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findMarilia() {
  console.log('Procurando escolas com "MARILIA"...\n');
  
  const schools = await prisma.school.findMany({
    where: {
      name: {
        contains: 'SIQUEIRA',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      parentSchoolId: true
    }
  });

  console.log(`Encontradas ${schools.length} escolas:`);
  
  schools.forEach(school => {
    console.log(`ID: ${school.id}`);
    console.log(`Nome: "${school.name}"`);
    console.log(`ParentSchoolId: ${school.parentSchoolId}`);
    console.log(`É anexo: ${school.parentSchoolId ? 'SIM' : 'NÃO'}`);
    console.log('---');
  });
  
  await prisma.$disconnect();
}

findMarilia().catch(console.error);