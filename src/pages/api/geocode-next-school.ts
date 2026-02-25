import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INVALID_ADDRESSES = ['não informado', 'sem endereço', 's/endereço', ''];

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Limpeza avançada do endereço
  let cleaned = address
    // Remove quebras de linha e substitui por espaço
    .replace(/[\r\n]+/g, ' ')
    // Remove informações de telefone (Tel:, TP:, etc.)
    .replace(/Tel:?\s*[\d-\s]+/gi, '')
    .replace(/TP:?\s*[\d-\s]+/gi, '')
    .replace(/Telefone:?\s*[\d-\s]+/gi, '')
    .replace(/\(?\d{2}\)?\s*\d{4}-?\d{4}/g, '') // Remove telefones no formato (XX) XXXX-XXXX
    // Remove CEP e variações
    .replace(/CEP:?\s*[\d.-]+/gi, '')
    .replace(/\d{5}-?\d{3}/g, '') // Remove CEP sem label
    // Remove informações extras
    .replace(/\(.*?UNIDADE EM OBRA.*?\)/gi, '')
    .replace(/UNIDADE EM OBRA/gi, '')
    .replace(/ANEXO.*?:/gi, '')
    // Remove "s/nº" e "s/n" (sem número)
    .replace(/,?\s*s\/n[º°]?/gi, '')
    // Remove "nº" isolado ou números de lote/quadra confusos
    .replace(/\bn[º°]\s*\d+\b/gi, (match) => match) // mantém número da rua
    .replace(/Lt\s*\d+\s*Qd\s*\d+/gi, '') // Remove lote e quadra
    // Remove múltiplos espaços, vírgulas e hifens
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/-\s*-/g, '-')
    .trim()
    .replace(/^[-,\s]+|[-,\s]+$/g, ''); // Remove vírgulas/hifens nas pontas

  // Se o endereço estiver vazio após limpeza, retorna null
  if (!cleaned || cleaned.length < 5) return null;

  // Tenta extrair bairro para fallback (geralmente está após o hífen ou segunda vírgula)
  const neighborhoodMatch = cleaned.match(/[-–]\s*([^,]+?)(?:\s*,\s*Duque de Caxias)?$/i);
  const neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim() : null;

  // Estratégia 1: Tenta o endereço completo
  const fullAddress = cleaned.toLowerCase().includes('duque de caxias')
    ? cleaned
    : `${cleaned}, Duque de Caxias, RJ, Brasil`;

  let coords = await tryGeocode(fullAddress);

  // Estratégia 2: Se falhou e tem bairro, tenta apenas o bairro
  if (!coords && neighborhood && neighborhood.length > 3) {
    console.log(`Tentando fallback com bairro: ${neighborhood}`);
    coords = await tryGeocode(`${neighborhood}, Duque de Caxias, RJ, Brasil`);
  }

  return coords;
}

async function tryGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CSDT2-SMEC-Caxias/1.0 (suporte@smeduquedecaxias.rj.gov.br)',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Geocoding fetch error:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Conta total de escolas a geocodificar
    const totalPending = await prisma.school.count({
      where: {
        geocoded: false,
        address: {
          notIn: INVALID_ADDRESSES,
        },
      },
    });

    if (totalPending === 0) {
      return res.status(200).json({ done: true, message: 'Todas as escolas já foram geocodificadas.' });
    }

    // Pega a próxima escola sem geocoding
    const school = await prisma.school.findFirst({
      where: {
        geocoded: false,
        address: {
          notIn: INVALID_ADDRESSES,
          not: null,
        },
      },
      select: { id: true, name: true, address: true },
    });

    if (!school) {
      return res.status(200).json({ done: true, message: 'Nenhuma escola pendente encontrada.' });
    }

    // Geocodifica
    const coords = await geocodeAddress(school.address as string);

    if (coords) {
      await prisma.school.update({
        where: { id: school.id },
        data: {
          latitude: coords.lat,
          longitude: coords.lng,
          geocoded: true,
        },
      });

      return res.status(200).json({
        done: false,
        success: true,
        school: school.name,
        remaining: totalPending - 1,
        coords,
      });
    } else {
      // Marca como geocoded=true mesmo sem coords para não tentar de novo
      await prisma.school.update({
        where: { id: school.id },
        data: { geocoded: true },
      });

      return res.status(200).json({
        done: false,
        success: false,
        school: school.name,
        remaining: totalPending - 1,
        reason: 'Endereço não encontrado no Nominatim',
      });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({ error: 'Erro ao geocodificar escola' });
  }
}
