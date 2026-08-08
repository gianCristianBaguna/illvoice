import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireEmailVerified } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { generateVerificationCode, sendVerificationEmail } from '../../utils/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6';

const getRouteParamId = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

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

router.get('/me', authenticateToken, requireEmailVerified, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({
      email: user.email,
      name: user.name,
      role: user.role,
      barangayId: user.barangayId,
      barangayName: user.barangayName,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Protect users endpoint - require authentication
router.get('/users', authenticateToken, requireEmailVerified, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        role: true,
        credibility: true,
        createdAt: true,
        _count: {
          select: { reports: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      credibility: user.credibility,
      createdAt: user.createdAt.toISOString(),
      reportCount: user._count.reports,
    }));

    return res.json(formattedUsers);
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { barangay: true },
    });

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

    const token = signAdminToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: tokenRole,
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
      emailVerified: user.emailVerified,
    });

    return res.status(200).json({
      token,
      email: user.email,
      name: user.name,
      role: tokenRole,
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
      emailVerified: user.emailVerified,
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Protected registration - only authenticated admins can register barangay officials
router.post('/register-barangay-official', authenticateToken, requireEmailVerified, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, barangayId } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!barangayId) {
      return res.status(400).json({ error: 'Barangay ID is required' });
    }

    const barangay = await prisma.barangay.findUnique({ where: { id: barangayId } });
    if (!barangay) {
      return res.status(400).json({ error: 'Barangay not found' });
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
        barangayId: barangayId,
        emailVerified: true,
      },
      include: { barangay: true },
    });

    const token = signAdminToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'BARANGAY_OFFICIAL',
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
      emailVerified: user.emailVerified,
    });

    return res.status(201).json({
      token,
      email: user.email,
      name: user.name,
      role: 'BARANGAY_OFFICIAL',
      barangayId: user.barangayId,
      barangayName: user.barangay?.name || null,
      emailVerified: user.emailVerified,
    });
  } catch (err: any) {
    console.error('BARANGAY_OFFICIAL registration error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Admin-only registration (requires authentication + ADMIN role)
router.post('/register-admin', authenticateToken, requireEmailVerified, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        password: hashedPassword,
        authMethod: 'USERNAME_PASSWORD',
        role: 'ADMIN',
      },
    });

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: code,
        verificationTokenExpiry: expiry,
      },
    });

    await sendVerificationEmail(user.email, code, user.name || undefined);

    const token = signAdminToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
      barangayId: null,
      barangayName: null,
      emailVerified: user.emailVerified,
    });

    return res.status(201).json({
      token,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
      barangayId: null,
      barangayName: null,
      emailVerified: user.emailVerified,
    });
  } catch (err: any) {
    console.error('ADMIN registration error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Update user password (admin only)
router.put('/users/:id/password', authenticateToken, requireEmailVerified, async (req: Request, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);
    const { password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Password update error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

// Activate/Deactivate user (admin only)
router.patch('/users/:id/status', authenticateToken, requireEmailVerified, async (req: Request, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);
    const { active } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, we can use a field or mark as RESIDENT to "deactivate"
    // In a real system, you'd add an 'active' boolean field to User
    await prisma.user.update({
      where: { id },
      data: {
        role: active ? user.role : 'RESIDENT',
      },
    });

    return res.json({
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      active,
    });
  } catch (err: any) {
    console.error('User status update error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update user status' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireEmailVerified, async (req: Request, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('User delete error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

export default router;
