import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GeocodingResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }>;
  status: string;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Google Maps API Key não configurada');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address + ', Duque de Caxias, RJ, Brasil');
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );

    const data: GeocodingResponse = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng
      };
    }

    console.warn(`Geocoding falhou para: ${address} - Status: ${data.status}`);
    return null;
  } catch (error) {
    console.error(`Erro ao geocodificar ${address}:`, error);
    return null;
  }
}

// Geocoding alternativo usando OpenStreetMap (gratuito)
async function geocodeWithOSM(address: string): Promise<{ lat: number; lng: number } | null> {
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
    console.error(`Erro no geocoding OSM para ${address}:`, error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { schoolIds, useOSM = true } = req.body;

    // Busca escolas que precisam de geocoding
    const schools = await prisma.school.findMany({
      where: schoolIds ? { id: { in: schoolIds } } : { geocoded: false },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        geocoded: true
      }
    });

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

      // Tenta geocoding
      let coords = null;
      
      if (useOSM) {
        coords = await geocodeWithOSM(school.address);
        // Aguarda 1 segundo entre requisições para respeitar rate limit do OSM
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        coords = await geocodeAddress(school.address);
      }

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

        results.push({
          schoolId: school.id,
          name: school.name,
          status: 'success',
          coordinates: coords,
          address: school.address
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
      usedService: useOSM ? 'OpenStreetMap' : 'Google Maps'
    });

  } catch (error) {
    console.error('Erro no geocoding:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}