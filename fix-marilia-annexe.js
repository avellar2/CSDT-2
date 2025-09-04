const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMariliaAnnex() {
  console.log('Corrigindo vinculação do anexo Marilia...\n');
  
  // Escola principal (ID: 183)
  const parentSchool = await prisma.school.findUnique({
    where: { id: 183 }
  });
  
  // Anexo (ID: 262)  
  const annexSchool = await prisma.school.findUnique({
    where: { id: 262 }
  });
  
  console.log('Escola Principal:');
  console.log(`ID: ${parentSchool.id}, Nome: "${parentSchool.name}"`);
  console.log('\nAnexo:');
  console.log(`ID: ${annexSchool.id}, Nome: "${annexSchool.name}"`);
  console.log(`Atual ParentSchoolId: ${annexSchool.parentSchoolId}`);
  
  // Corrigir a vinculação
  await prisma.school.update({
    where: { id: 262 },
    data: { parentSchoolId: 183 }
  });
  
  console.log('\n✅ Correção aplicada!');
  
  // Verificar resultado
  const correctedAnnex = await prisma.school.findUnique({
    where: { id: 262 }
  });
  
  console.log(`\nNovo ParentSchoolId do anexo: ${correctedAnnex.parentSchoolId}`);
  
  await prisma.$disconnect();
}

fixMariliaAnnex().catch(console.error);