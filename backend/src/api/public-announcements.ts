import { Request, Response, Router } from 'express';
import { prisma } from '../../prisma';

const router = Router();

// Public: Get all active announcements
router.get('/announcements', async (req: Request, res: Response) => {
  try {
    const { targetAudience } = req.query;
    const where: any = { isActive: true };
    if (targetAudience && typeof targetAudience === 'string') {
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience },
      ];
    }
    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

export default router;
