import { Request, Response, Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// List of authorized admin emails
const AUTHORIZED_ADMINS = [
    'usernamenigian@gmail.com',
  'admin@barangay.gov',
  'admin@demo.gov',
  process.env.AUTHORIZED_ADMIN_EMAIL || 'admin@illvoice.local',
];

router.post('/google-signin', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { email, name } = payload;

    // Check if email is authorized as admin
    if (!email || !AUTHORIZED_ADMINS.includes(email)) {
      return res.status(403).json({ error: 'Unauthorized admin email' });
    }

    // Generate JWT token for session
    const adminToken = jwt.sign(
      { email, name, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token: adminToken,
      email,
      name,
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
