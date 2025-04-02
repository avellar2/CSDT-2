import { NextApiRequest, NextApiResponse } from 'next';

type SchoolDetails = {
  [key: string]: {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    director: string;
    studentCount: number;
    hasComputerLab: boolean;
    photos: string[];
  };
};

const schoolDetails: SchoolDetails = {
  'EM Maria Clara Machado': {
    name: 'EM Maria Clara Machado',
    latitude: -23.55052,
    longitude: -46.633308,
    address: 'Rua Exemplo, 123, São Paulo, SP',
    director: 'Maria Silva',
    studentCount: 500,
    hasComputerLab: true,
    photos: [
      'https://via.placeholder.com/600x400?text=Foto+1',
      'https://via.placeholder.com/600x400?text=Foto+2',
      'https://via.placeholder.com/600x400?text=Foto+3',
    ],
  },
  'EM General Tiburcio': {
    name: 'EM General Tiburcio',
    latitude: -23.55152,
    longitude: -46.634308,
    address: 'Avenida Exemplo, 456, São Paulo, SP',
    director: 'João Souza',
    studentCount: 450,
    hasComputerLab: true,
    photos: [
      'https://via.placeholder.com/600x400?text=Foto+1',
      'https://via.placeholder.com/600x400?text=Foto+2',
      'https://via.placeholder.com/600x400?text=Foto+3',
    ],
  },
  // Adicione detalhes para outras escolas aqui
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { school } = req.query;
  const details = schoolDetails[school as string];

  if (details) {
    res.status(200).json(details);
  } else {
    res.status(404).json({ message: 'School not found' });
  }
}