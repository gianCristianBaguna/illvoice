import { Router, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../prisma';

const router = Router();
const primaryClientId = process.env.GOOGLE_CLIENT_ID;
const fallbackClientId = process.env.GOOGLE_IOS_CLIENT_ID;
const client = new OAuth2Client(primaryClientId);

console.log("=== Google Auth Module Loaded ===");
console.log("Primary GOOGLE_CLIENT_ID:", primaryClientId);
console.log("Fallback GOOGLE_IOS_CLIENT_ID:", fallbackClientId);

router.post('/', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'ID token required' });

  console.log("Google auth attempt - primary client:", primaryClientId ? "set" : "missing");
  console.log("Google auth attempt - fallback client:", fallbackClientId ? "set" : "missing");

  try {
    const tryVerify = async (clientId: string) => {
      console.log("Attempting verification with client:", clientId);
      const verificationClient = new OAuth2Client(clientId);
      return await verificationClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
    };

    let ticket;
    try {
      ticket = await tryVerify(primaryClientId || '');
      console.log("Primary verification succeeded");
    } catch (primaryError) {
      console.log("Primary verification failed:", primaryError);
      if (fallbackClientId) {
        console.log("Trying fallback verification");
        ticket = await tryVerify(fallbackClientId);
        console.log("Fallback verification succeeded");
      } else {
        throw primaryError;
      }
    }

    const payload = ticket.getPayload();
    console.log("Token payload email:", payload?.email, "name:", payload?.name);
    if (!payload?.email) return res.status(400).json({ error: 'Invalid token' });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      // User already exists, check if it's a Google account
      if (existingUser.authMethod !== 'GOOGLE') {
        return res.status(400).json({ 
          error: 'This email is already registered with username/password. Please use that method to login.' 
        });
      }

      // Update user info
      const user = await prisma.user.update({
        where: { email: payload.email },
        data: {
          name: payload.name,
          image: payload.picture,
          googleEmail: payload.email, // Lock to this Gmail
        },
      });

      return res.json({ user });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        image: payload.picture,
        authMethod: 'GOOGLE',
        googleEmail: payload.email, // Lock first Gmail
      },
    });

    return res.json({ user });
  } catch (err: any) {
    console.error("Google auth error:", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    const errorMessage = err.message || 'Failed to authenticate';
    return res.status(500).json({ error: errorMessage });
  }
});

export default router;