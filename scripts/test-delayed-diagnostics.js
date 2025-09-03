const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestDelayedDiagnostics() {
  console.log('🧪 Criando diagnósticos de teste com atrasos...\n');
  
  try {
    // Buscar algumas impressoras para usar nos testes
    const printers = await prisma.item.findMany({
      where: {
        name: {
          contains: 'IMPRESSORA',
          mode: 'insensitive'
        }
      },
      take: 5 // Pegar até 5 impressoras
    });

    if (printers.length === 0) {
      console.log('❌ Nenhuma impressora encontrada para criar testes.');
      return;
    }

    // Buscar alguns setores
    const sectors = await prisma.school.findMany({
      where: {
        name: {
          in: ['CSDT', 'NAI', 'CAED', 'DGP', 'CHADA']
        }
      },
      take: 3
    });

    if (sectors.length === 0) {
      console.log('❌ Nenhum setor encontrado para criar testes.');
      return;
    }

    // Dados de teste com diferentes atrasos
    const testDiagnostics = [
      {
        printer: printers[0],
        sector: sectors[0],
        daysAgo: 5, // 5 dias atrás
        technicianChada: 'Carlos Silva',
        diagnostic: 'Impressora apresentando falha no fusor. Necessário substituição da unidade fusora.',
        requestedPart: 'Unidade Fusora compatível com modelo OKI MC780'
      },
      {
        printer: printers[1] || printers[0],
        sector: sectors[1] || sectors[0],
        daysAgo: 8, // 8 dias atrás
        technicianChada: 'Maria Santos',
        diagnostic: 'Problema no cilindro da impressora. Impressão com listras e manchas.',
        requestedPart: 'Cilindro de imagem OKI - Código ABC123'
      },
      {
        printer: printers[2] || printers[0],
        sector: sectors[2] || sectors[0],
        daysAgo: 12, // 12 dias atrás (bem atrasado)
        technicianChada: 'João Pereira',
        diagnostic: 'Placa principal com defeito. Impressora não liga corretamente.',
        requestedPart: 'Placa principal - Mainboard OKI MC780'
      },
      {
        printer: printers[3] || printers[0],
        sector: sectors[0],
        daysAgo: 4, // 4 dias atrás
        technicianChada: 'Ana Costa',
        diagnostic: 'Toner vazando internamente. Necessário kit de reparo.',
        requestedPart: 'Kit de reparo + vedações para cartucho'
      }
    ];

    console.log(`📝 Criando ${testDiagnostics.length} diagnósticos de teste...\n`);

    let createdCount = 0;

    for (const testData of testDiagnostics) {
      try {
        // Calcular data antiga
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - testData.daysAgo);

        const diagnostic = await prisma.chadaDiagnostic.create({
          data: {
            itemId: testData.printer.id,
            sectorId: testData.sector.id,
            sectorName: testData.sector.name,
            technicianChada: testData.technicianChada,
            diagnostic: testData.diagnostic,
            requestedPart: testData.requestedPart,
            status: 'AGUARDANDO_PECA',
            createdAt: createdAt,
            createdBy: 'Sistema de Teste'
          }
        });

        console.log(`✅ Criado diagnóstico ${testData.daysAgo} dias atrás:`);
        console.log(`   Impressora: ${testData.printer.name} - ${testData.printer.brand}`);
        console.log(`   Setor: ${testData.sector.name}`);
        console.log(`   Técnico: ${testData.technicianChada}`);
        console.log(`   Peça: ${testData.requestedPart}`);
        console.log(`   Data: ${createdAt.toLocaleDateString('pt-BR')}\n`);

        createdCount++;
      } catch (error) {
        console.error(`❌ Erro ao criar diagnóstico:`, error.message);
      }
    }

    console.log(`🎉 Criados ${createdCount} diagnósticos de teste com sucesso!`);
    console.log(`\n📊 Resumo dos atrasos:`);
    console.log(`   - ${testDiagnostics.filter(d => d.daysAgo >= 3 && d.daysAgo < 7).length} entre 3-6 dias`);
    console.log(`   - ${testDiagnostics.filter(d => d.daysAgo >= 7 && d.daysAgo < 14).length} entre 7-13 dias`);
    console.log(`   - ${testDiagnostics.filter(d => d.daysAgo >= 14).length} mais de 14 dias`);

    console.log(`\n💡 Agora você pode ver os alertas em:`);
    console.log(`   - Dashboard: Notificação laranja + badge no card CHADA`);
    console.log(`   - Página /chada: Alerta no topo + aba Diagnósticos`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para limpar os dados de teste
async function cleanTestData() {
  console.log('🧹 Limpando dados de teste anteriores...');
  
  try {
    const deleted = await prisma.chadaDiagnostic.deleteMany({
      where: {
        createdBy: 'Sistema de Teste'
      }
    });
    
    console.log(`🗑️ Removidos ${deleted.count} diagnósticos de teste anteriores.`);
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
  }
}

// Executar
async function main() {
  await cleanTestData();
  await createTestDelayedDiagnostics();
}

main().catch(console.error);