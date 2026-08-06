import { Request, Response, Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signAdminToken(user: { id: string; email: string; name: string | null; role: string; barangayId: string | null; barangayName?: string | null; emailVerified: boolean }) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      barangayId: user.barangayId,
      barangayName: user.barangayName || null,
      emailVerified: user.emailVerified,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/google-signin', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const email = payload.email;
    const name = payload.name;

    if (!email) {
      return res.status(400).json({ error: 'Google account email is required' });
    }

    let user = await prisma.user.findUnique({ where: { email }, include: { barangay: true } });
    let userRole: string = 'ADMIN';

    if (user) {
      userRole = user.role || 'ADMIN';
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email,
          authMethod: 'GOOGLE',
          googleEmail: email,
          role: 'ADMIN',
        },
        include: { barangay: true },
      });
      userRole = 'ADMIN';
    }

    const adminToken = signAdminToken({
      id: user.id,
      email,
      name: user.name,
      role: userRole,
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
      emailVerified: user.emailVerified,
    });

    return res.status(200).json({
      token: adminToken,
      email,
      name: name || email,
      role: userRole,
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
      emailVerified: user.emailVerified,
      message: 'Google sign-in successful',
    });
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return res.status(401).json({
      error: error.message || 'Google sign-in failed',
    });
  }
 });

export default router;
