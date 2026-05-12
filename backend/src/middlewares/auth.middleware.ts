import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { cache } from '../config/cache';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        studentId?: string;
        role: string;
        iat: number;
        exp: number;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

    const isTokenBlacklisted = await cache.hasFlag(`blacklist_token:${token}`);
    if (isTokenBlacklisted) {
      return res.status(401).json({ status: 'error', message: 'Access denied. Token has been revoked.' });
    }

    const isBlacklisted = await cache.hasFlag(`blacklist:${decoded.userId}`);
    if (isBlacklisted) {
      return res.status(401).json({ status: 'error', message: 'Access denied. Account is blocked.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ status: 'error', message: 'Invalid token.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

