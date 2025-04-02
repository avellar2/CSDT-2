// filepath: /home/avellar2/projetos/csdt2/src/pages/api/middleware.ts
import { NextApiRequest, NextApiResponse } from 'next';

export function config() {
  return {
    api: {
      bodyParser: {
        sizeLimit: '10mb', // Aumentar o limite para 10mb
      },
    },
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ message: 'Middleware applied' });
}