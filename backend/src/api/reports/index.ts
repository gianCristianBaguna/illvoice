import { Router, type Request, type Response } from 'express';
import { prisma } from '../../prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, title, description, severity, mediaType, mediaUrl } = req.body;

    // -------------------------------
    // 1️⃣ Validate fields
    // -------------------------------
    if (!userId || !title || !description || !severity || !mediaType || !mediaUrl) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // -------------------------------
    // 2️⃣ Debug: Check user existence
    // -------------------------------
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    console.log('Incoming userId:', userId);
    console.log('Found user:', existingUser);

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found. Reports can only be created by existing users.'
      });
    }

    // -------------------------------
    // 3️⃣ Create report safely
    // -------------------------------
    const report = await prisma.report.create({
      data: {
        title,
        description,
        severity: severity.toUpperCase() ,
        aiStatus: 'PENDING',
        user: { connect: { id: existingUser.id } },
        multimedia: {
          create: { type: mediaType.toUpperCase() , url: mediaUrl }
        },
      },
    });

    return res.status(201).json({ message: 'Report created', report });

  } catch (err: any) {
    console.error('❌ REPORT CREATE ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({ include: { user: true } });
    return res.json(reports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router;