const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSME() {
  try {
    console.log('📝 Adicionando registro da SME com 253 computadores...');

    // Verificar se já existe
    const existente = await prisma.locados.findFirst({
      where: {
        name: {
          contains: 'SME',
          mode: 'insensitive'
        }
      }
    });

    if (existente) {
      console.log('⚠️ Já existe um registro da SME. Atualizando...');

      await prisma.locados.update({
        where: { id: existente.id },
        data: {
          name: 'SME - Secretaria Municipal de Educação',
          pcs: 253,
          notebooks: 0,
          tablets: 0,
          monitors: 0,
          estabilizadores: 0,
          impressoras: 0,
          updatedAt: new Date()
        }
      });

      console.log('✅ Registro da SME atualizado com sucesso!');
    } else {
      await prisma.locados.create({
        data: {
          name: 'SME - Secretaria Municipal de Educação',
          pcs: 253,
          notebooks: 0,
          tablets: 0,
          monitors: 0,
          estabilizadores: 0,
          impressoras: 0
        }
      });

      console.log('✅ Registro da SME adicionado com sucesso!');
    }

    // Mostrar resumo atualizado
    const todos = await prisma.locados.findMany();
    const totais = todos.reduce((acc, item) => ({
      pcs: acc.pcs + (item.pcs || 0),
      notebooks: acc.notebooks + (item.notebooks || 0),
      tablets: acc.tablets + (item.tablets || 0),
      monitors: acc.monitors + (item.monitors || 0),
      estabilizadores: acc.estabilizadores + (item.estabilizadores || 0),
      impressoras: acc.impressoras + (item.impressoras || 0),
    }), { pcs: 0, notebooks: 0, tablets: 0, monitors: 0, estabilizadores: 0, impressoras: 0 });

    console.log('\n📊 Resumo atualizado de equipamentos locados:');
    console.log(`   Escolas/Setores: ${todos.length}`);
    console.log(`   PCs: ${totais.pcs}`);
    console.log(`   Notebooks: ${totais.notebooks}`);
    console.log(`   Tablets: ${totais.tablets}`);
    console.log(`   Monitores: ${totais.monitors}`);
    console.log(`   Estabilizadores: ${totais.estabilizadores}`);
    console.log(`   Impressoras: ${totais.impressoras}`);
    console.log(`   TOTAL: ${Object.values(totais).reduce((a, b) => a + b, 0)}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSME();
