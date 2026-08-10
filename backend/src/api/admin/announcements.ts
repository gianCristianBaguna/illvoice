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

// Admin: Get all announcements (including inactive)
router.get('/announcements', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: Request, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
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

// Admin: Create announcement
router.post('/announcements', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: any, res: Response) => {
  try {
    const { title, content, priority, targetAudience, isActive } = req.body;
    const userId = req.user?.userId;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'NORMAL',
        targetAudience: targetAudience || 'ALL',
        isActive: isActive ?? true,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Admin: Update announcement
router.put('/announcements/:id', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: any, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Announcement ID is required' });
    }

    const { title, content, priority, targetAudience, isActive } = req.body;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(priority !== undefined && { priority }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(announcement);
  } catch (err: any) {
    console.error('Error updating announcement:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Admin: Delete announcement
router.delete('/announcements/:id', authenticateToken, authorizeRoles(['ADMIN', 'BARANGAY_OFFICIAL']), async (req: Request, res: Response) => {
  try {
    const id = getRouteParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Announcement ID is required' });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting announcement:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
