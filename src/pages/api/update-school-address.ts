import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { requireAuth } from "@/utils/api-auth";
import { isRouteManager } from "@/utils/operationalRoutes";

const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

/**
 * POST /api/update-school-address
 *
 * Corrige o endereço ou as coordenadas de uma escola. Restrito a ADMIN e
 * ADMTOTAL — coordenadas afetam diretamente o cálculo das rotas.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({
      error: 'Somente ADMIN ou ADMTOTAL podem alterar a localização das escolas.',
    });
  }

  try {
    const { schoolId, newAddress, latitude, longitude } = req.body || {};

    const parsedSchoolId = Number(schoolId);
    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
      return res.status(400).json({ error: 'schoolId é obrigatório' });
    }

    // Se lat/lng fornecidos diretamente, salva como geocodificada
    if (latitude !== undefined && longitude !== undefined) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: 'Latitude e longitude inválidas' });
      }

      if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) {
        return res.status(400).json({
          error: 'Latitude/longitude fora do intervalo válido',
        });
      }

      if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) {
        return res.status(400).json({ error: 'Coordenada (0,0) não é válida' });
      }

      const updated = await prisma.school.update({
        where: { id: parsedSchoolId },
        data: {
          latitude: lat,
          longitude: lng,
          geocoded: true,
        },
      });
      return res.status(200).json({ success: true, school: updated });
    }

    if (typeof newAddress !== 'string' || !newAddress.trim()) {
      return res.status(400).json({
        error: 'newAddress ou latitude/longitude são obrigatórios',
      });
    }

    // Atualiza o endereço e marca para geocodificar novamente
    const updated = await prisma.school.update({
      where: { id: parsedSchoolId },
      data: {
        address: newAddress.trim(),
        geocoded: false,
        latitude: null,
        longitude: null,
      },
    });

    res.status(200).json({ success: true, school: updated });
  } catch (error) {
    console.error('Error updating school address:', error);
    res.status(500).json({ error: 'Failed to update school address' });
  }
}
