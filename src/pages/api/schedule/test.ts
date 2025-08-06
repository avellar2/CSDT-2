import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Retorna dados de teste primeiro
    const mockEvents = [
      {
        id: 1,
        title: 'Reunião de equipe',
        description: 'Reunião semanal da equipe técnica',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        allDay: false,
        type: 'MEETING',
        priority: 'HIGH',
        status: 'PENDING',
        createdBy: 'admin',
        location: 'Sala de reuniões',
        tags: ['equipe', 'semanal']
      },
      {
        id: 2,
        title: 'Visita técnica - Escola ABC',
        description: 'Manutenção preventiva dos equipamentos',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        allDay: false,
        type: 'APPOINTMENT',
        priority: 'MEDIUM',
        status: 'PENDING',
        createdBy: 'admin',
        location: 'Escola Municipal ABC',
        tags: ['visita', 'manutenção']
      }
    ];

    res.status(200).json(mockEvents);
  } else if (req.method === 'POST') {
    // Simula criação de evento
    const newEvent = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json(newEvent);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}