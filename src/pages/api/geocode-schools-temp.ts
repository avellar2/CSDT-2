import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Geocoding alternativo usando OpenStreetMap (gratuito)
async function geocodeWithOSM(address: string, schoolName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Lista de tentativas com diferentes formatações
    const searchQueries = [
      `${address}, Duque de Caxias, RJ, Brasil`,
      `${schoolName}, Duque de Caxias, RJ`,
      `${address}, Duque de Caxias, Rio de Janeiro`,
      `${schoolName}, Duque de Caxias`,
      `Duque de Caxias, RJ` // Fallback para centro da cidade
    ];

    for (const query of searchQueries) {
      console.log(`Tentando geocoding: ${query}`);
      
      const encodedAddress = encodeURIComponent(query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=3&addressdetails=1&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'CSDT-Route-Optimizer/1.0'
          }
        }
      );

      const data = await response.json();
      console.log(`Resultado para "${query}":`, data.length, 'resultados');

      if (data.length > 0) {
        // Filtra resultados no Rio de Janeiro
        const rjResults = data.filter((result: any) => 
          result.display_name.toLowerCase().includes('rio de janeiro') ||
          result.display_name.toLowerCase().includes('duque de caxias')
        );

        if (rjResults.length > 0) {
          console.log(`✅ Encontrado: ${rjResults[0].display_name}`);
          return {
            lat: parseFloat(rjResults[0].lat),
            lng: parseFloat(rjResults[0].lon)
          };
        }
        
        // Se não encontrou no RJ, usa o primeiro resultado
        console.log(`⚠️ Usando resultado genérico: ${data[0].display_name}`);
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }

      // Aguarda entre tentativas
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return null;
  } catch (error) {
    console.error(`Erro no geocoding OSM para ${address}:`, error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { schoolIds } = req.body;

    // Busca escolas - SEM usar as colunas que ainda não existem
    const whereClause = schoolIds ? { id: { in: schoolIds } } : {};
    
    const schools = await prisma.school.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true
      }
    });

    console.log(`Encontradas ${schools.length} escolas para geocodificar`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const school of schools) {
      if (!school.address || school.address.trim() === '') {
        results.push({
          schoolId: school.id,
          name: school.name,
          status: 'error',
          message: 'Endereço não informado'
        });
        errorCount++;
        continue;
      }

      console.log(`Geocodificando: ${school.name} - ${school.address}`);

      // Tenta geocoding
      const coords = await geocodeWithOSM(school.address, school.name);
      
      // Aguarda 1 segundo entre requisições para respeitar rate limit do OSM
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (coords) {
        // Por enquanto, só retorna as coordenadas sem salvar no banco
        // Quando as colunas existirem, descomente as linhas abaixo:
        /*
        await prisma.school.update({
          where: { id: school.id },
          data: {
            latitude: coords.lat,
            longitude: coords.lng,
            geocoded: true
          }
        });
        */

        results.push({
          schoolId: school.id,
          name: school.name,
          status: 'success',
          coordinates: coords,
          address: school.address,
          message: 'Coordenadas obtidas (não salvas no banco ainda)'
        });
        successCount++;
      } else {
        results.push({
          schoolId: school.id,
          name: school.name,
          status: 'error',
          message: 'Não foi possível geocodificar o endereço',
          address: school.address
        });
        errorCount++;
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        total: schools.length,
        success: successCount,
        errors: errorCount
      },
      results,
      usedService: 'OpenStreetMap',
      warning: 'Coordenadas não foram salvas no banco - migração necessária'
    });

  } catch (error) {
    console.error('Erro no geocoding:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}