/**
 * Script de Migração de Imagens do Supabase para Cloudinary
 *
 * Como usar:
 * 1. Preencha as credenciais do Cloudinary no .env
 * 2. Execute: node scripts/migrate-images-to-cloudinary.js
 * 3. O script vai buscar todas as imagens do Supabase e migrar para o Cloudinary
 * 4. O banco de dados será atualizado com as novas URLs
 *
 * IMPORTANTE: Faça backup do banco antes de executar!
 */

const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const fetch = require('node-fetch');
require('dotenv').config();

const prisma = new PrismaClient();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Estatísticas da migração
const stats = {
  totalImages: 0,
  migrated: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Faz upload de uma URL do Supabase para o Cloudinary
 */
async function migrateImageUrl(supabaseUrl, folder) {
  try {
    console.log(`  Migrando: ${supabaseUrl.substring(0, 80)}...`);

    // Fazer upload direto da URL do Supabase para Cloudinary
    const result = await cloudinary.uploader.upload(supabaseUrl, {
      folder: folder,
      resource_type: 'auto',
    });

    console.log(`  ✓ Sucesso: ${result.secure_url}`);
    stats.migrated++;
    return result.secure_url;
  } catch (error) {
    console.error(`  ✗ Erro ao migrar imagem:`, error.message);
    stats.failed++;
    return null;
  }
}

/**
 * Migra imagens de OS Externas
 */
async function migrateOsExternas() {
  console.log('\n=== Migrando OS Externas ===\n');

  const osExternas = await prisma.oSExterna.findMany({
    select: {
      id: true,
      numeroOs: true,
      fotosAntes: true,
      fotosDepois: true,
    },
  });

  console.log(`Encontradas ${osExternas.length} OS Externas\n`);

  for (const os of osExternas) {
    console.log(`\nOS #${os.numeroOs || os.id}:`);

    let newFotosAntes = [];
    let newFotosDepois = [];

    // Migrar fotos ANTES
    if (os.fotosAntes && os.fotosAntes.length > 0) {
      console.log(`  Migrando ${os.fotosAntes.length} fotos ANTES...`);
      for (const url of os.fotosAntes) {
        stats.totalImages++;
        if (url.includes('supabase.co')) {
          const newUrl = await migrateImageUrl(
            url,
            `os-externa-img/fotos-antes/${os.numeroOs || os.id}`
          );
          if (newUrl) newFotosAntes.push(newUrl);
        } else {
          console.log(`  → Já migrada (pulando): ${url.substring(0, 50)}...`);
          newFotosAntes.push(url);
          stats.skipped++;
        }
      }
    }

    // Migrar fotos DEPOIS
    if (os.fotosDepois && os.fotosDepois.length > 0) {
      console.log(`  Migrando ${os.fotosDepois.length} fotos DEPOIS...`);
      for (const url of os.fotosDepois) {
        stats.totalImages++;
        if (url.includes('supabase.co')) {
          const newUrl = await migrateImageUrl(
            url,
            `os-externa-img/fotos-depois/${os.numeroOs || os.id}`
          );
          if (newUrl) newFotosDepois.push(newUrl);
        } else {
          console.log(`  → Já migrada (pulando): ${url.substring(0, 50)}...`);
          newFotosDepois.push(url);
          stats.skipped++;
        }
      }
    }

    // Atualizar banco de dados
    if (newFotosAntes.length > 0 || newFotosDepois.length > 0) {
      await prisma.oSExterna.update({
        where: { id: os.id },
        data: {
          fotosAntes: newFotosAntes.length > 0 ? newFotosAntes : os.fotosAntes,
          fotosDepois: newFotosDepois.length > 0 ? newFotosDepois : os.fotosDepois,
        },
      });
      console.log(`  ✓ Banco atualizado para OS #${os.numeroOs || os.id}`);
    }
  }
}

/**
 * Migra imagens de CHADA
 */
async function migrateChada() {
  console.log('\n=== Migrando CHADA ===\n');

  const items = await prisma.itemsChada.findMany({
    select: {
      id: true,
      osImages: true,
    },
  });

  console.log(`Encontrados ${items.length} itens CHADA\n`);

  for (const item of items) {
    if (!item.osImages || item.osImages.length === 0) continue;

    console.log(`\nItem CHADA #${item.id.substring(0, 8)}...:`);
    console.log(`  Migrando ${item.osImages.length} imagens...`);

    const newOsImages = [];

    for (const imageObj of item.osImages) {
      // osImages é um array de objetos JSON
      const url = typeof imageObj === 'string' ? imageObj : imageObj.url || imageObj;
      stats.totalImages++;

      if (typeof url === 'string' && url.includes('supabase.co')) {
        const newUrl = await migrateImageUrl(url, 'os-images');
        if (newUrl) {
          newOsImages.push(typeof imageObj === 'string' ? newUrl : { ...imageObj, url: newUrl });
        }
      } else {
        console.log(`  → Já migrada ou formato inválido (pulando)`);
        newOsImages.push(imageObj);
        stats.skipped++;
      }
    }

    // Atualizar banco de dados
    if (newOsImages.length > 0) {
      await prisma.itemsChada.update({
        where: { id: item.id },
        data: {
          osImages: newOsImages,
        },
      });
      console.log(`  ✓ Banco atualizado para item CHADA`);
    }
  }
}

/**
 * Migra imagens de histórico CHADA
 */
async function migrateHistoryChada() {
  console.log('\n=== Migrando Histórico CHADA ===\n');

  const history = await prisma.itemsHistoryChada.findMany({
    select: {
      id: true,
      images: true,
    },
  });

  console.log(`Encontrados ${history.length} registros de histórico\n`);

  for (const record of history) {
    if (!record.images || record.images.length === 0) continue;

    console.log(`\nHistórico #${record.id}:`);
    console.log(`  Migrando ${record.images.length} imagens...`);

    const newImages = [];

    for (const url of record.images) {
      stats.totalImages++;
      if (url.includes('supabase.co')) {
        const newUrl = await migrateImageUrl(url, 'os-images/history');
        if (newUrl) newImages.push(newUrl);
      } else {
        console.log(`  → Já migrada (pulando): ${url.substring(0, 50)}...`);
        newImages.push(url);
        stats.skipped++;
      }
    }

    // Atualizar banco de dados
    if (newImages.length > 0) {
      await prisma.itemsHistoryChada.update({
        where: { id: record.id },
        data: {
          images: newImages,
        },
      });
      console.log(`  ✓ Banco atualizado para histórico`);
    }
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Script de Migração: Supabase → Cloudinary            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Verificar credenciais do Cloudinary
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error('\n❌ ERRO: Credenciais do Cloudinary não configuradas no .env!\n');
    process.exit(1);
  }

  console.log(`\nCloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log('Credenciais OK ✓\n');

  try {
    // Migrar todas as tabelas
    await migrateOsExternas();
    await migrateChada();
    await migrateHistoryChada();

    // Exibir estatísticas
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Migração Concluída!                                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\nTotal de imagens processadas: ${stats.totalImages}`);
    console.log(`✓ Migradas com sucesso: ${stats.migrated}`);
    console.log(`→ Já migradas (puladas): ${stats.skipped}`);
    console.log(`✗ Falhas: ${stats.failed}`);
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script
main();
