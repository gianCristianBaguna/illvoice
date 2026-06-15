import { Router, type Request, type Response } from 'express';
import { prisma } from '../../prisma';
import { analyzeSeverity, generateAIInsights } from "../../services/severityAI/index";

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, title, description, severity, mediaType, mediaUrl } = req.body;

    let userEmail = email;

    if (!userEmail || !title || !description || !severity) {
      return res
        .status(400)
        .json({ error: 'Email, title, description, and severity are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found. Reports can only be created by registered users.',
      });
    }

    const report = await prisma.report.create({
      data: {
        title,
        description,
        severity: severity.toUpperCase(),
        user: { connect: { id: existingUser.id } },
        ...(mediaType && mediaUrl
          ? {
              multimedia: {
                create: {
                  type: mediaType.toUpperCase(),
                  url: mediaUrl,
                },
              },
            }
          : {}),
      },
      include: {
        user: true,
        multimedia: true,
      },
    });

    return res.status(201).json({
      message: 'Report created',
      report,
    });
  } catch (err: any) {
    console.error('❌ REPORT CREATE ERROR:', err);
    return res.status(500).json({
      error: 'Failed to create report',
      details: err.message,
    });
  }
});

// -------------------------------
// GET ALL REPORTS
// -------------------------------
router.get('/', async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: true,
        multimedia: true,
        barangay: true,
        resolvedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(reports);
  } catch (err) {
    console.error('❌ REPORT FETCH ERROR:', err);
    return res.status(500).json({
      error: 'Failed to fetch reports',
    });
  }
});

// -------------------------------
// GET URGENT ALERTS (HIGH severity reports)
// -------------------------------
router.get('/urgent', async (_req: Request, res: Response) => {
  try {
    const urgentReports = await prisma.report.findMany({
      where: {
        severity: 'HIGH',
        status: { not: 'RESOLVED' },
      },
      include: {
        barangay: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const alerts = urgentReports.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      severity: r.severity,
      barangay: r.barangay?.name || 'Unknown Location',
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    return res.json(alerts);
  } catch (err) {
    console.error('❌ URGENT ALERTS ERROR:', err);
    return res.status(500).json({
      error: 'Failed to fetch urgent alerts',
    });
  }
});

// -------------------------------
// GET ACTIVITY FEED
// -------------------------------
router.get('/activity', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reports = await prisma.report.findMany({
      include: {
        user: true,
        barangay: true,
        resolvedBy: true,
      },
      where: {
        OR: [
          { createdAt: { gte: today } },
          { resolvedAt: { gte: today } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: today },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const activities: any[] = [];

    reports.forEach((r: any) => {
      const timestamp = r.createdAt;
      const time = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const date = new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const initials = (r.user?.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const barangayName = r.barangay?.name || 'Unknown';

      // New report activity
      activities.push({
        id: `new-${r.id}`,
        initials,
        senderName: r.user?.name || 'Unknown',
        color: r.severity === 'HIGH' ? 'bg-red-600' : r.severity === 'MODERATE' ? 'bg-yellow-600' : 'bg-blue-600',
        title: `New ${r.severity} severity report - ${r.title}, ${barangayName}`,
        time,
        date,
        timestamp,
        type: 'new_report',
      });

      // If resolved, add resolved activity
      if (r.status === 'RESOLVED' && r.resolvedBy) {
        const resolvedTimestamp = r.resolvedAt || r.createdAt;
        const resolvedTime = new Date(resolvedTimestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const resolvedDate = new Date(resolvedTimestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        activities.push({
          id: `resolved-${r.id}`,
          initials: (r.resolvedBy.name || 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          senderName: r.resolvedBy.name || 'Admin',
          color: 'bg-green-600',
          title: `ILL #${r.id} marked as Resolved by ${r.resolvedBy.name}`,
          time: resolvedTime,
          date: resolvedDate,
          timestamp: resolvedTimestamp,
          type: 'resolved',
        });
      }
    });

    // Add user registration activities
    recentUsers.forEach((u: any) => {
      if (u.role === 'RESIDENT') {
        const initials = (u.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        const regTime = new Date(u.createdAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const regDate = new Date(u.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        activities.push({
          id: `user-${u.id}`,
          initials,
          senderName: u.name || 'Unknown',
          color: 'bg-slate-600',
          title: `New user registered - ${u.name}, Barangay Resident`,
          time: regTime,
          date: regDate,
          timestamp: u.createdAt,
          type: 'user_registered',
        });
      }
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json(activities.slice(0, 15));
  } catch (err) {
    console.error('❌ ACTIVITY FEED ERROR:', err);
    return res.status(500).json({
      error: 'Failed to fetch activity feed',
    });
  }
});

// -------------------------------
// RESOLVE REPORT
// -------------------------------
router.post('/:id/resolve', async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { resolvedByName } = req.body;

  if (!id) {
    return res.status(400).json({
      error: 'Report ID is required',
    });
  }

  try {
    const adminUser = resolvedByName
      ? await prisma.user.findFirst({ where: { name: resolvedByName } })
      : null;

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedBy: adminUser ? { connect: { id: adminUser.id } } : undefined,
        resolvedAt: new Date(),
      },
      include: {
        user: true,
        barangay: true,
        multimedia: true,
        resolvedBy: true,
      },
    });

    return res.json({
      message: 'Report resolved',
      report: updated,
    });
  } catch (err: any) {
    console.error('❌ REPORT RESOLVE ERROR:', err);

    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Report not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to resolve report',
    });
  }
});

// -------------------------------
// UPDATE REPORT
// -------------------------------
router.patch('/:id', async (req: Request, res: Response) => {
  const idParam = req.params.id;

  // Fix TypeScript issue
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const { status, severity, resolvedByName } = req.body;

  if (!id) {
    return res.status(400).json({
      error: 'Report ID is required',
    });
  }

  try {
    const resolvedById = resolvedByName
      ? await prisma.user.findFirst({ where: { name: resolvedByName } }).then(u => u?.id)
      : undefined;

    const updated = await prisma.report.update({
      where: { id },
      data: {
        ...(status && { status: status.toUpperCase() }),
        ...(severity && { severity: severity.toUpperCase() }),
        ...(status === 'RESOLVED' && resolvedById && { resolvedBy: { connect: { id: resolvedById } } }),
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
      include: {
        user: true,
        barangay: true,
        multimedia: true,
        resolvedBy: true,
      },
    });

    return res.json({
      message: 'Report updated',
      report: updated,
    });
  } catch (err: any) {
    console.error('❌ REPORT UPDATE ERROR:', err);

    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Report not found',
      });
    }

    return res.status(500).json({
      error: 'Failed to update report',
    });
  }
});

// -------------------------------
// AI ANALYSIS
// -------------------------------
router.post('/:id/analyze', async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!id) {
    return res.status(400).json({
      error: 'Report ID is required',
    });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        multimedia: true,
      },
    });

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
      });
    }

    const media = report.multimedia?.[0];
    const aiSeverity = await analyzeSeverity({
      title: report.title,
      description: report.description,
      mediaType: media?.type,
      mediaUrl: media?.url,
    });

    const insights = await generateAIInsights({
      title: report.title,
      description: report.description,
      mediaType: media?.type,
      mediaUrl: media?.url,
      currentSeverity: report.severity,
    });

    if (media && (media.type === "VIDEO" || media.type === "AUDIO")) {
      await prisma.multimedia.update({
        where: { id: media.id },
        data: {
          analysis: {
            aiSeverity,
            insights,
            analyzedAt: new Date().toISOString(),
          },
        },
      });
    }

    return res.json({
      aiSeverity,
      insights,
      currentSeverity: report.severity,
    });
  } catch (err: any) {
    console.error('❌ AI ANALYSIS ERROR:', err);
    return res.status(500).json({
      error: 'Failed to analyze report with AI',
      details: err.message,
    });
  }
});

export default router;