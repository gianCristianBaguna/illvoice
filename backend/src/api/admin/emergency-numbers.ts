import { Request, Response, Router } from 'express';
import { prisma } from '../../prisma';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';

const router = Router();

const getRouteParamId = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

// Admin: Get all emergency numbers (including inactive)
router.get('/emergency-numbers', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: Request, res: Response) => {
  try {
    const numbers = await prisma.emergencyNumber.findMany({
      orderBy: { category: 'asc' },
    });
    res.json(numbers);
  } catch (err) {
    console.error('Error fetching emergency numbers:', err);
    res.status(500).json({ error: 'Failed to fetch emergency numbers' });
  }
});

// Admin: Create emergency number
router.post('/emergency-numbers', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: Request, res: Response) => {
  try {
    const { category, number, label, isActive } = req.body;

    if (!category || !number) {
      return res.status(400).json({ error: 'Category and number are required' });
    }

    const emergencyNumber = await prisma.emergencyNumber.create({
      data: {
        category,
        number,
        label: label || null,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json(emergencyNumber);
  } catch (err) {
    console.error('Error creating emergency number:', err);
    res.status(500).json({ error: 'Failed to create emergency number' });
  }
});

// Admin: Update emergency number
router.put('/emergency-numbers/:id', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: Request, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Emergency number ID is required' });
    }

    const { category, number, label, isActive } = req.body;

    const emergencyNumber = await prisma.emergencyNumber.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(number !== undefined && { number }),
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(emergencyNumber);
  } catch (err: any) {
    console.error('Error updating emergency number:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Emergency number not found' });
    }
    res.status(500).json({ error: 'Failed to update emergency number' });
  }
});

// Admin: Delete emergency number
router.delete('/emergency-numbers/:id', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: Request, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Emergency number ID is required' });
    }

    await prisma.emergencyNumber.delete({ where: { id } });
    res.json({ message: 'Emergency number deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting emergency number:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Emergency number not found' });
    }
    res.status(500).json({ error: 'Failed to delete emergency number' });
  }
});

export default router;
