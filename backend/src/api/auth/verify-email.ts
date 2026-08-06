import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { generateVerificationCode, sendVerificationEmail } from '../../utils/email';
import { authenticateToken } from '../../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6';

router.post('/send-code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('[VerifyEmail] Send-code request for', user?.email);
    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (dbUser.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        verificationToken: code,
        verificationTokenExpiry: expiry,
      },
    });

    console.log('[VerifyEmail] Generated code for', dbUser.email, 'calling sendVerificationEmail');
    const result = await sendVerificationEmail(dbUser.email, code, dbUser.name || undefined);
    console.log('[VerifyEmail] sendVerificationEmail result:', result.sent ? 'sent' : 'failed', 'messageId:', result.sent ? 'yes' : 'no');

    if (!result.sent) {
      console.warn('[VerifyEmail] Email not sent for', dbUser.email, '- SMTP not configured or failed');
    }

    return res.json({
      success: true,
      message: result.sent ? 'Verification code sent to your email' : 'Verification code generated (email sending failed - check server logs)',
      code: result.sent ? undefined : result.code,
    });
  } catch (err: any) {
    console.error('Send verification code error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send verification code' });
  }
});

router.post('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code } = req.body;

    console.log('[VerifyEmail] Verify request for', user?.email, 'code length:', code?.length);

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit code' });
    }

    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (dbUser.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (!dbUser.verificationToken || !dbUser.verificationTokenExpiry) {
      return res.status(400).json({ error: 'No verification code requested. Please request a code first.' });
    }

    if (new Date() > dbUser.verificationTokenExpiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (dbUser.verificationToken !== code) {
      console.log('[VerifyEmail] Invalid code for', user.email, 'expected:', dbUser.verificationToken, 'got:', code);
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    console.log('[VerifyEmail] Email verified successfully for', user.email);
    return res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (err: any) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to verify email' });
  }
});

router.post('/resend', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('[VerifyEmail] Resend request for', user?.email);
    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      console.log('[VerifyEmail] User not found:', user.email);
      return res.status(404).json({ error: 'User not found' });
    }

    if (dbUser.emailVerified) {
      console.log('[VerifyEmail] Email already verified:', user.email);
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        verificationToken: code,
        verificationTokenExpiry: expiry,
      },
    });

    console.log('[VerifyEmail] Generated code for', dbUser.email, 'calling sendVerificationEmail');
    const result = await sendVerificationEmail(dbUser.email, code, dbUser.name || undefined);
    console.log('[VerifyEmail] sendVerificationEmail result:', result.sent ? 'sent' : 'failed', 'messageId:', result.sent ? 'yes' : 'no');

    if (!result.sent) {
      console.warn('[VerifyEmail] Email not sent for', dbUser.email, '- SMTP not configured or failed');
    }

    return res.json({
      success: true,
      message: result.sent ? 'Verification code sent to your email' : 'Verification code generated (email sending failed - check server logs)',
      code: result.sent ? undefined : result.code,
    });
  } catch (err: any) {
    console.error('Resend verification code error:', err);
    return res.status(500).json({ error: err.message || 'Failed to resend verification code' });
  }
});

router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('[VerifyEmail] Status request for', user?.email);
    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { emailVerified: true, email: true },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[VerifyEmail] Status for', dbUser.email, 'verified:', dbUser.emailVerified);
    return res.json({
      email: dbUser.email,
      emailVerified: dbUser.emailVerified,
    });
  } catch (err: any) {
    console.error('Get verification status error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get verification status' });
  }
});

export default router;
