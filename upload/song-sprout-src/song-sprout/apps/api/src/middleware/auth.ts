import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'song-sprout-dev-secret';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; username: string; isAdmin?: boolean };
}

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
    } catch {
      // invalid token — still allow through as anonymous
    }
  }
  next();
}
