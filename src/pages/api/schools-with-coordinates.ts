import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const schools = await prisma.school.findMany({
      where: {
        geocoded: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        address: true,
        district: true,
        director: true,
        students: true,
        laboratorio: true,
        latitude: true,
        longitude: true,
      },
    });

    res.status(200).json(schools);
  } catch (error) {
    console.error('Error fetching schools with coordinates:', error);
    res.status(500).json({ error: 'Failed to fetch schools with coordinates' });
  }
}
