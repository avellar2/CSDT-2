const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapeamento dos anexos para suas escolas principais baseado na lista fornecida
const annexMappings = [
  {
    annexName: "ANEXO (Creche) : IGREJA METODISTA  CENTRAL DE",
    parentName: "CRECHE E PRÉ- ESC MUNICIPAL PROFº JOÃO DE OLIVEIRA"
  },
  {
    annexName: "ANEXO E.M MAURO DE CASTRO",
    parentName: "EM MAURO DE CASTRO"
  },
  {
    annexName: "CIEP 404 CLARICE LISPECTOR",
    parentName: "EE MUNICIPALIZADA BAIRRO CALIFÓRNIA"
  },
  {
    annexName: "IGREJA METODISTA EM PILAR",
    parentName: "CRECHE MUNICIPAL PROFª JESUÍNA FÁTIMA DE ANDRADE"
  },
  {
    annexName: "IGREJA CRISTÃ EVANGÉLICA RENOVADA MINISTÉRIO BOAS NOVAS",
    parentName: "E. M. PROFESSORA MARIA HELENA TENÓRIO CAVALCANTE"
  },
  {
    annexName: "CIEP 201 AARÃO STEINBRUCH",
    parentName: "EM NÍSIA VILELA FERNANDES"
  },
  {
    annexName: "CIEP 350 TULIO ROBERTO QUINTILIANO CARDOSO",
    parentName: "CRECHE E PRÉ-ESC MUNICIPAL GANDUR ASSED"
  },
  {
    annexName: "ANEXO EM CIDADE DOS MENINOS",
    parentName: "EM CIDADE DOS MENINOS"
  },
  {
    annexName: "ANEXO CRECHE e PRÉ-ESCOLA MUNICIPAL PROFª MARÍLIA DA SILVA SIQUEIRA",
    parentName: "CRECHE E PRE ESCOLA MUNICIPAL PROFESSORA MARILIA DA SILVA SIQUEIRA"
  },
  {
    annexName: "CIEP 031 LIRIO DO LAGUNA",
    parentName: "EM ANA DE SOUZA HERDY"
  }
];

async function linkAnnexesToParents() {
  console.log('Iniciando processo de vinculação de anexos...');
  
  try {
    let processedCount = 0;
    let errorCount = 0;

    for (const mapping of annexMappings) {
      try {
        // Buscar o anexo pelo nome (usando ILIKE para busca case-insensitive)
        const annexSchool = await prisma.school.findFirst({
          where: {
            name: {
              contains: mapping.annexName,
              mode: 'insensitive'
            }
          }
        });

        if (!annexSchool) {
          console.log(`⚠️  Anexo não encontrado: ${mapping.annexName}`);
          errorCount++;
          continue;
        }

        // Se é um caso especial onde anexo e escola principal são iguais, pular
        if (mapping.annexName === mapping.parentName) {
          console.log(`ℹ️  Pulando caso especial: ${mapping.annexName}`);
          continue;
        }

        // Buscar a escola principal pelo nome
        const parentSchool = await prisma.school.findFirst({
          where: {
            name: {
              contains: mapping.parentName,
              mode: 'insensitive'
            }
          }
        });

        if (!parentSchool) {
          console.log(`⚠️  Escola principal não encontrada: ${mapping.parentName}`);
          errorCount++;
          continue;
        }

        // Vincular o anexo à escola principal
        await prisma.school.update({
          where: { id: annexSchool.id },
          data: { parentSchoolId: parentSchool.id }
        });

        console.log(`✅ Anexo "${annexSchool.name}" vinculado à escola "${parentSchool.name}"`);
        processedCount++;

      } catch (error) {
        console.error(`❌ Erro ao processar ${mapping.annexName}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`- Anexos processados com sucesso: ${processedCount}`);
    console.log(`- Erros encontrados: ${errorCount}`);
    
    // Mostrar resultado das vinculações
    console.log('\n🔗 Verificando vinculações criadas:');
    const linkedSchools = await prisma.school.findMany({
      where: {
        parentSchoolId: { not: null }
      },
      include: {
        parentSchool: true
      }
    });

    linkedSchools.forEach(school => {
      console.log(`   ${school.name} -> ${school.parentSchool?.name}`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para buscar e mostrar anexos sem vinculação
async function findUnlinkedAnnexes() {
  console.log('\n🔍 Buscando anexos não vinculados...');
  
  const potentialAnnexes = await prisma.school.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: 'ANEXO', mode: 'insensitive' } },
            { name: { contains: 'anexo', mode: 'insensitive' } }
          ]
        },
        { parentSchoolId: null }
      ]
    }
  });

  if (potentialAnnexes.length > 0) {
    console.log(`⚠️  Encontrados ${potentialAnnexes.length} possíveis anexos sem vinculação:`);
    potentialAnnexes.forEach(school => {
      console.log(`   - ${school.name}`);
    });
  } else {
    console.log('✅ Todos os anexos parecem estar vinculados!');
  }
}

// Executar o script
linkAnnexesToParents()
  .then(() => findUnlinkedAnnexes())
  .then(() => {
    console.log('\n🎉 Script concluído!');
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
  });