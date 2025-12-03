/**
 * Script para verificar quantas imagens existem no banco de dados
 * antes de executar a migração
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkImagesCount() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Verificando Imagens no Banco de Dados                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let totalImages = 0;
  let supabaseImages = 0;
  let cloudinaryImages = 0;

  try {
    // 1. Verificar OS Externas
    console.log('📦 OS Externas:');
    const osExternas = await prisma.oSExterna.findMany({
      select: {
        id: true,
        numeroOs: true,
        fotosAntes: true,
        fotosDepois: true,
      },
    });

    let osExternasTotal = 0;
    let osExternasSupabase = 0;
    let osExternasCloudinary = 0;

    for (const os of osExternas) {
      if (os.fotosAntes && os.fotosAntes.length > 0) {
        os.fotosAntes.forEach(url => {
          osExternasTotal++;
          if (url.includes('supabase.co')) {
            osExternasSupabase++;
          } else if (url.includes('cloudinary.com')) {
            osExternasCloudinary++;
          }
        });
      }
      if (os.fotosDepois && os.fotosDepois.length > 0) {
        os.fotosDepois.forEach(url => {
          osExternasTotal++;
          if (url.includes('supabase.co')) {
            osExternasSupabase++;
          } else if (url.includes('cloudinary.com')) {
            osExternasCloudinary++;
          }
        });
      }
    }

    console.log(`   Total de OS: ${osExternas.length}`);
    console.log(`   Total de imagens: ${osExternasTotal}`);
    console.log(`   - No Supabase: ${osExternasSupabase}`);
    console.log(`   - No Cloudinary: ${osExternasCloudinary}\n`);

    totalImages += osExternasTotal;
    supabaseImages += osExternasSupabase;
    cloudinaryImages += osExternasCloudinary;

    // 2. Verificar Items CHADA
    console.log('📦 Items CHADA:');
    const itemsChada = await prisma.itemsChada.findMany({
      select: {
        id: true,
        osImages: true,
      },
    });

    let chadaTotal = 0;
    let chadaSupabase = 0;
    let chadaCloudinary = 0;

    for (const item of itemsChada) {
      if (item.osImages && item.osImages.length > 0) {
        item.osImages.forEach(imageObj => {
          const url = typeof imageObj === 'string' ? imageObj : imageObj.url || imageObj;
          if (typeof url === 'string') {
            chadaTotal++;
            if (url.includes('supabase.co')) {
              chadaSupabase++;
            } else if (url.includes('cloudinary.com')) {
              chadaCloudinary++;
            }
          }
        });
      }
    }

    console.log(`   Total de items: ${itemsChada.length}`);
    console.log(`   Total de imagens: ${chadaTotal}`);
    console.log(`   - No Supabase: ${chadaSupabase}`);
    console.log(`   - No Cloudinary: ${chadaCloudinary}\n`);

    totalImages += chadaTotal;
    supabaseImages += chadaSupabase;
    cloudinaryImages += chadaCloudinary;

    // 3. Verificar Histórico CHADA
    console.log('📦 Histórico CHADA:');
    const historyChada = await prisma.itemsHistoryChada.findMany({
      select: {
        id: true,
        images: true,
      },
    });

    let historyTotal = 0;
    let historySupabase = 0;
    let historyCloudinary = 0;

    for (const record of historyChada) {
      if (record.images && record.images.length > 0) {
        record.images.forEach(url => {
          historyTotal++;
          if (url.includes('supabase.co')) {
            historySupabase++;
          } else if (url.includes('cloudinary.com')) {
            historyCloudinary++;
          }
        });
      }
    }

    console.log(`   Total de registros: ${historyChada.length}`);
    console.log(`   Total de imagens: ${historyTotal}`);
    console.log(`   - No Supabase: ${historySupabase}`);
    console.log(`   - No Cloudinary: ${historyCloudinary}\n`);

    totalImages += historyTotal;
    supabaseImages += historySupabase;
    cloudinaryImages += historyCloudinary;

    // Resumo Final
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  RESUMO GERAL                                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Total de imagens: ${totalImages}`);
    console.log(`🔴 No Supabase (precisam migrar): ${supabaseImages}`);
    console.log(`🟢 No Cloudinary (já migradas): ${cloudinaryImages}\n`);

    if (supabaseImages > 0) {
      console.log('⚠️  AÇÃO NECESSÁRIA:');
      console.log(`   Execute: node scripts/migrate-images-to-cloudinary.js`);
      console.log(`   Isso vai migrar ${supabaseImages} imagens para o Cloudinary\n`);
    } else {
      console.log('✅ Todas as imagens já estão no Cloudinary!\n');
    }

  } catch (error) {
    console.error('\n❌ Erro ao verificar imagens:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
checkImagesCount();
