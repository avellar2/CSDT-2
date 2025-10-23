const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Cliente para PRODUÇÃO (Supabase)
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PROD || process.env.DATABASE_URL
    }
  }
});

// Cliente para LOCAL
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:36595145v@localhost:5432/csdt_dev'
    }
  }
});

// Tabelas para copiar (em ordem de dependência)
const TABLES_TO_COPY = [
  'school',
  'profile',
  'baseTechnician',
  'visitTechnician',
  'offTechnician',
  // Adicione mais tabelas conforme necessário
];

async function copyData() {
  console.log('🔄 Copiando dados de PRODUÇÃO para LOCAL...\n');

  try {
    // Copiar Schools (TODAS) - Primeira passada sem parentSchoolId
    console.log('📋 Copiando Schools (passo 1/2)...');
    const schools = await prodPrisma.school.findMany();

    for (const school of schools) {
      const { parentSchoolId, ...schoolData } = school;
      await localPrisma.school.upsert({
        where: { id: school.id },
        update: schoolData,
        create: schoolData
      });
    }
    console.log(`✅ ${schools.length} escolas copiadas (sem anexos)\n`);

    // Segunda passada - adicionar parentSchoolId
    console.log('📋 Atualizando anexos (passo 2/2)...');
    for (const school of schools) {
      if (school.parentSchoolId) {
        await localPrisma.school.update({
          where: { id: school.id },
          data: { parentSchoolId: school.parentSchoolId }
        }).catch(() => {}); // Ignorar se não existir
      }
    }
    console.log(`✅ Anexos atualizados\n`);

    // Copiar Profiles (usuários/técnicos)
    console.log('👤 Copiando Profiles...');
    const profiles = await prodPrisma.profile.findMany();

    for (const profile of profiles) {
      await localPrisma.profile.upsert({
        where: { userId: profile.userId },
        update: profile,
        create: profile
      });
    }
    console.log(`✅ ${profiles.length} profiles copiados\n`);

    // Copiar técnicos de base (últimos 30 dias)
    console.log('🔧 Copiando BaseTechnicians (últimos 30 dias)...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const baseTechs = await prodPrisma.baseTechnician.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    for (const tech of baseTechs) {
      await localPrisma.baseTechnician.create({
        data: tech
      }).catch(() => {}); // Ignorar duplicados
    }
    console.log(`✅ ${baseTechs.length} base technicians copiados\n`);

    // Copiar técnicos de visita (últimos 30 dias)
    console.log('🚗 Copiando VisitTechnicians (últimos 30 dias)...');
    const visitTechs = await prodPrisma.visitTechnician.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    for (const tech of visitTechs) {
      await localPrisma.visitTechnician.create({
        data: tech
      }).catch(() => {});
    }
    console.log(`✅ ${visitTechs.length} visit technicians copiados\n`);

    // Copiar técnicos de folga (últimos 30 dias)
    console.log('😴 Copiando OffTechnicians (últimos 30 dias)...');
    const offTechs = await prodPrisma.offTechnician.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    for (const tech of offTechs) {
      await localPrisma.offTechnician.create({
        data: tech
      }).catch(() => {});
    }
    console.log(`✅ ${offTechs.length} off technicians copiados\n`);

    console.log('✅ Cópia concluída com sucesso!\n');
    console.log('📊 Resumo:');
    console.log(`  - ${schools.length} escolas`);
    console.log(`  - ${profiles.length} usuários/técnicos`);
    console.log(`  - ${baseTechs.length} base technicians`);
    console.log(`  - ${visitTechs.length} visit technicians`);
    console.log(`  - ${offTechs.length} off technicians`);
    console.log('\n⚠️  ATENÇÃO: Apenas dados essenciais foram copiados.');
    console.log('Se precisar de mais dados (OS, Items, etc), adicione no script.\n');

  } catch (error) {
    console.error('❌ Erro ao copiar dados:', error.message);
    throw error;
  } finally {
    await prodPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

// Executar
copyData()
  .then(() => {
    console.log('✨ Processo finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
