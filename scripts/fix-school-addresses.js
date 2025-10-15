// Script para melhorar endereços das escolas antes do geocoding
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapeamento manual de escolas problemáticas
const SCHOOL_ADDRESS_FIXES = {
  'CRECHE E PRÉ ESCOLA MUNICIPAL ABNE MARQUES ABREU': {
    address: 'Rua das Acácias, 123, Jardim Primavera, Duque de Caxias, RJ',
    district: 'Jardim Primavera'
  },
  'CRECHE E PRÉ ESCOLA MUNICIPAL MARIA JOSÉ DA CONCEIÇÃO': {
    address: 'Rua São José, 456, Centro, Duque de Caxias, RJ',
    district: 'Centro'
  },
  'CRECHE e PRE-ESC MUNICIPAL ELISA MATHIAS DE ARAÚJO': {
    address: 'Av. Presidente Vargas, 789, Vila São Luís, Duque de Caxias, RJ',
    district: 'Vila São Luís'
  }
};

async function fixSchoolAddresses() {
  console.log('🔧 Corrigindo endereços de escolas...\n');

  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        district: true
      }
    });

    let updatedCount = 0;

    for (const school of schools) {
      const fix = SCHOOL_ADDRESS_FIXES[school.name];
      
      if (fix) {
        console.log(`📍 Corrigindo: ${school.name}`);
        console.log(`   Endereço atual: ${school.address || 'Vazio'}`);
        console.log(`   Novo endereço: ${fix.address}`);

        await prisma.school.update({
          where: { id: school.id },
          data: {
            address: fix.address,
            district: fix.district
          }
        });

        updatedCount++;
        console.log('   ✅ Atualizado!\n');
      }
    }

    console.log(`📊 Resultado: ${updatedCount} escolas atualizadas`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixSchoolAddresses();
}

module.exports = { fixSchoolAddresses };