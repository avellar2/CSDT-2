// Script para geocodificar todas as escolas do sistema
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Geocoding com OpenStreetMap (gratuito)
async function geocodeWithOSM(address) {
  try {
    const encodedAddress = encodeURIComponent(address + ', Duque de Caxias, RJ, Brasil');
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CSDT-Route-Optimizer/1.0'
        }
      }
    );

    const data = await response.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }

    return null;
  } catch (error) {
    console.error(`Erro no geocoding OSM para ${address}:`, error.message);
    return null;
  }
}

async function geocodeAllSchools() {
  console.log('🗺️  Iniciando geocoding de todas as escolas...\n');

  try {
    // Busca escolas que precisam de geocoding
    const schools = await prisma.school.findMany({
      where: { 
        geocoded: false,
        address: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        geocoded: true
      }
    });

    console.log(`📍 Encontradas ${schools.length} escolas para geocodificar\n`);

    if (schools.length === 0) {
      console.log('✅ Todas as escolas já estão geocodificadas!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < schools.length; i++) {
      const school = schools[i];
      
      console.log(`[${i + 1}/${schools.length}] ${school.name}`);
      console.log(`   Endereço: ${school.address}`);

      if (!school.address || school.address.trim() === '') {
        console.log('   ❌ Endereço não informado\n');
        errorCount++;
        continue;
      }

      // Tenta geocoding
      const coords = await geocodeWithOSM(school.address);

      if (coords) {
        // Atualiza no banco
        await prisma.school.update({
          where: { id: school.id },
          data: {
            latitude: coords.lat,
            longitude: coords.lng,
            geocoded: true
          }
        });

        console.log(`   ✅ Geocodificado: ${coords.lat}, ${coords.lng}`);
        successCount++;
      } else {
        console.log('   ❌ Não foi possível geocodificar');
        errorCount++;
      }

      console.log(''); // Linha em branco

      // Aguarda 1 segundo entre requisições para respeitar rate limit do OSM
      if (i < schools.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('📊 RESULTADO FINAL:');
    console.log(`   ✅ Sucessos: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📍 Total processado: ${schools.length}`);
    console.log(`   🎯 Taxa de sucesso: ${((successCount / schools.length) * 100).toFixed(1)}%\n`);

  } catch (error) {
    console.error('❌ Erro no geocoding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  geocodeAllSchools();
}

module.exports = { geocodeAllSchools };