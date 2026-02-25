import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { schoolId, newAddress, latitude, longitude } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId is required' });
    }

    // Se lat/lng fornecidos diretamente, salva como geocodificada
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Latitude e longitude inválidas' });
      }
      const updated = await prisma.school.update({
        where: { id: parseInt(schoolId) },
        data: {
          latitude: lat,
          longitude: lng,
          geocoded: true,
        },
      });
      return res.status(200).json({ success: true, school: updated });
    }

    if (!newAddress) {
      return res.status(400).json({ error: 'newAddress or latitude/longitude are required' });
    }

    // Atualiza o endereço e marca para geocodificar novamente
    const updated = await prisma.school.update({
      where: { id: parseInt(schoolId) },
      data: {
        address: newAddress,
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
