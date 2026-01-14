import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listSchools() {
  try {
    // Buscar todas as escolas principais (não anexos)
    const mainSchools = await prisma.school.findMany({
      where: {
        parentSchoolId: null
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        district: true,
        director: true,
        students: true,
        other_School: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Buscar todas as escolas incluindo anexos
    const allSchools = await prisma.school.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    console.log('\n=== RESUMO DAS ESCOLAS ===\n');
    console.log(`Total de escolas principais: ${mainSchools.length}`);
    console.log(`Total de anexos: ${allSchools.length - mainSchools.length}`);
    console.log(`Total geral: ${allSchools.length}\n`);

    console.log('=== ESCOLAS PRINCIPAIS (com email) ===\n');

    // Filtrar escolas principais que têm email
    const schoolsWithEmail = mainSchools.filter(school => school.email);
    console.log(`Escolas com email cadastrado: ${schoolsWithEmail.length}\n`);

    // Listar todas as escolas principais com suas informações
    mainSchools.forEach((school, index) => {
      console.log(`${index + 1}. ${school.name}`);
      if (school.email) {
        console.log(`   Email: ${school.email}`);
      }
      if (school.district) {
        console.log(`   Distrito: ${school.district}`);
      }
      if (school.director) {
        console.log(`   Diretor: ${school.director}`);
      }
      if (school.students) {
        console.log(`   Alunos: ${school.students}`);
      }
      if (school.other_School && school.other_School.length > 0) {
        console.log(`   Anexos (${school.other_School.length}):`);
        school.other_School.forEach(annex => {
          console.log(`     - ${annex.name}`);
        });
      }
      console.log('');
    });

    // Gerar lista de emails
    console.log('\n=== LISTA DE EMAILS PARA ENVIO ===\n');
    const emails = mainSchools
      .filter(school => school.email)
      .map(school => school.email);

    console.log('Lista separada por vírgula:');
    console.log(emails.join(', '));

    console.log('\n\nLista separada por ponto e vírgula (para email):');
    console.log(emails.join('; '));

  } catch (error) {
    console.error('Erro ao buscar escolas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listSchools();
