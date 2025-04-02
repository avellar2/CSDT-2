import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedRequest extends NextApiRequest {
  user?: any; // Substitua 'any' pelo tipo correto
}

const authMiddleware = (handler: NextApiHandler) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY) as { userId: number; name: string };
      req.user = decoded; // Adiciona o usuário decodificado ao objeto de solicitação
      return handler(req, res);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expirado' });
        }
        console.error('Authentication error:', error.message);
        return res.status(401).json({ error: 'Token inválido' });
      } else {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Token inválido' });
      }
    }
  };
};

export default authMiddleware;