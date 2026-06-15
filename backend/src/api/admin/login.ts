import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = Router();

const AUTHORIZED_ADMINS = [
  'usernamenigian@gmail.com',
  'admin@barangay.gov',
  'admin@demo.gov',
  process.env.AUTHORIZED_ADMIN_EMAIL || 'admin@illvoice.local',
];

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!AUTHORIZED_ADMINS.includes(email)) {
      return res.status(403).json({ error: 'Unauthorized admin email' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokenRole = user.role || 'ADMIN';

    const token = jwt.sign(
      { email: user.email, name: user.name, role: tokenRole },
      process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      email: user.email,
      name: user.name,
      role: tokenRole,
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

router.post('/register-barangay-official', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      if (existingUser.role !== 'BARANGAY_OFFICIAL') {
        return res.status(400).json({ error: 'This email is already registered with a different role' });
      }
      return res.status(400).json({ error: 'BARANGAY_OFFICIAL account already exists for this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        password: hashedPassword,
        authMethod: 'USERNAME_PASSWORD',
        role: 'BARANGAY_OFFICIAL',
      },
    });

    const token = jwt.sign(
      { email: user.email, name: user.name, role: 'BARANGAY_OFFICIAL' },
      process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      email: user.email,
      name: user.name,
      role: 'BARANGAY_OFFICIAL',
    });
  } catch (err: any) {
    console.error('BARANGAY_OFFICIAL registration error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

export default router;
