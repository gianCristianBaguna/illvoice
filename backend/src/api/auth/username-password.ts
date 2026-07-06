import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, type Request, type Response } from 'express';
import { prisma } from '../../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6';

function signUserToken(user: { id: string; email: string; name: string | null; role: string; barangayId: string | null; barangayName?: string | null }) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      barangayId: user.barangayId,
      barangayName: user.barangayName || null,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const AUTHORIZED_ADMINS = [
  'usernamenigian@gmail.com',
  'admin@barangay.gov',
  'admin@demo.gov',
  process.env.AUTHORIZED_ADMIN_EMAIL || 'admin@illvoice.local',
];

// Register new user with username/password
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, fullName, phoneNumber } = req.body;

    // Validation
    if (!email || !username || !password || !fullName || !phoneNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        phoneNumber,
        password: hashedPassword,
        authMethod: 'USERNAME_PASSWORD',
      },
    });

    const token = signUserToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      barangayId: user.barangayId,
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
      },
      token,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Failed to register' });
  }
});

// Login with username/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { barangay: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is a username/password account
    if (!AUTHORIZED_ADMINS.includes(user.email) && user.authMethod !== 'USERNAME_PASSWORD') {
      return res.status(401).json({ error: 'This account uses Google Sign-In' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signUserToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        authMethod: user.authMethod,
        barangayId: user.barangayId,
        barangayName: user.barangay?.name || null,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Failed to login' });
  }
});

export default router;
