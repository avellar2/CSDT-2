import { NextApiRequest, NextApiResponse } from 'next';
import authMiddleware from '@/middleware/auth';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ message: 'Você acessou uma rota protegida!' });
};

export default authMiddleware(handler);