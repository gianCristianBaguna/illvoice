import { Request, Response, Router } from 'express';
import { prisma } from '../../prisma';

const router = Router();

// Public: Get all active emergency numbers
router.get('/emergency-numbers', async (req: Request, res: Response) => {
  try {
    const numbers = await prisma.emergencyNumber.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
    res.json(numbers);
  } catch (err) {
    console.error('Error fetching emergency numbers:', err);
    res.status(500).json({ error: 'Failed to fetch emergency numbers' });
  }
});

export default router;
