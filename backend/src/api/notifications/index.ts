import { Router, type Response } from 'express';
import { prisma } from '../../prisma';

const router = Router();

const getRouteParamId = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

// GET /api/notifications - Fetch notifications for the current user
router.get('/', async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const account = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = getRouteParamId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const notification = await prisma.notification.findFirst({
      where: { id, user: { email: user.email } },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updated);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user?.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const account = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.notification.updateMany({
      where: { userId: account.id, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

export default router;
