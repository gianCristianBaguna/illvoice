import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    email: string;
    name: string | null;
    role: string;
    barangayId?: string | null;
    barangayName?: string | null;
    emailVerified?: boolean;
  };
}

export function isBarangayOfficial(user: AuthenticatedRequest['user']) {
  return user?.role === 'BARANGAY_OFFICIAL';
}

export function getScopedBarangayId(req: AuthenticatedRequest): string | null {
  const user = req.user;
  if (!user) return null;
  if (user.role !== 'BARANGAY_OFFICIAL') return null;
  return user.barangayId || null;
}

export function applyBarangayScope<T extends { barangayId: string | null }>(items: T[], req: AuthenticatedRequest): T[] {
  const barangayId = getScopedBarangayId(req);
  if (!barangayId) return items;
  return items.filter((item) => item.barangayId === barangayId);
}

export function requireAssignedBarangay() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (user?.role === 'BARANGAY_OFFICIAL' && !user.barangayId) {
      return res.status(403).json({ error: 'Barangay assignment is required for this account' });
    }
    next();
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] No token provided for', req.method, req.path);
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      console.log('[Auth] Invalid token for', req.method, req.path, err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('[Auth] Token valid for', req.method, req.path, 'user:', decoded.email);
    req.user = decoded;
    next(); 
  });
}

export function authorizeRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
}

export function requireEmailVerified(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if ((user.role === 'ADMIN' || user.role === 'BARANGAY_OFFICIAL') || user.emailVerified) {
    next();
  } else {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address to continue' });
  }
}
