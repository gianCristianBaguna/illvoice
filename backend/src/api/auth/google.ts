import { Router, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../prisma';

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'ID token required' });

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: 'Invalid token' });

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name, image: payload.picture },
      create: { email: payload.email, name: payload.name, image: payload.picture },
    });

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
});

export default router;