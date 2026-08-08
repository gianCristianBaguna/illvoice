import { Router, type Response } from 'express';
import { applyBarangayScope, authenticateToken, getScopedBarangayId, requireAssignedBarangay, type AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from '../../prisma';
import { analyzeSeverity, generateAIInsights } from "../../services/severityAI/index";
import { clearSeverityKeywordsCache } from "../../services/severityAI/keyword-store";
import { broadcastToUser } from '../../sse';
import { scheduleBackgroundAnalysis } from "../../services/backgroundAnalysis";

const router = Router();
const FALLBACK_BARANGAY_NAME = "Unassigned Barangay";

async function createNotification(userId: string, title: string, message: string, type: string, reportId?: string) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        reportId,
      },
    });
    
    // Broadcast to connected SSE clients
    broadcastToUser(userId, { type: 'new_notification', notification });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

function getNearestBarangay(latitude: number, longitude: number, barangays: { id: string; latitude: number; longitude: number }[]) {
  let nearestBarangay: { id: string; latitude: number; longitude: number } | null = null;
  let minDistance = Infinity;

  for (const barangay of barangays) {
    const distance = Math.sqrt(
      Math.pow(latitude - barangay.latitude, 2) + Math.pow(longitude - barangay.longitude, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestBarangay = barangay;
    }
  }

  return nearestBarangay;
}

async function getOrCreateFallbackBarangay(latitude: number, longitude: number) {
  const existing = await prisma.barangay.findFirst({
    where: { name: FALLBACK_BARANGAY_NAME },
  });

  if (existing) return existing;

  return prisma.barangay.create({
    data: {
      name: FALLBACK_BARANGAY_NAME,
      latitude,
      longitude,
    },
  });
}

async function resolveBarangayForReport(latitude: number | null | undefined, longitude: number | null | undefined) {
  if (latitude === null || longitude === null || latitude === undefined || longitude === undefined) return null;

  const barangays = await prisma.barangay.findMany({
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  if (barangays.length === 0) {
    return getOrCreateFallbackBarangay(latitude, longitude);
  }

  return getNearestBarangay(latitude, longitude, barangays);
}

async function hydrateMissingBarangays<T extends { id: string; latitude: number | null; longitude: number | null; barangayId: string | null }>(reports: T[]): Promise<T[]> {
  const hydratedReports = [...reports];

  for (const report of hydratedReports) {
    if (report.barangayId || report.latitude === null || report.longitude === null) continue;

    const barangay = await resolveBarangayForReport(report.latitude, report.longitude);
    if (!barangay) continue;

    await prisma.report.update({
      where: { id: report.id },
      data: { barangayId: barangay.id },
    });

    report.barangayId = barangay.id;
  }

  return hydratedReports;
}

function ensureReportInAssignedBarangay(report: { barangayId: string | null }, req: AuthenticatedRequest) {
  const scopedBarangayId = getScopedBarangayId(req);
  if (!scopedBarangayId) return true;
  return report.barangayId === scopedBarangayId;
}

router.post('/', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, title, description, severity, mediaType, mediaUrl, address, category } = req.body;

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

    const scopedBarangayId = getScopedBarangayId(req);

    const reportData: any = {
      title,
      description,
      severity: severity.toUpperCase(),
      address: address || undefined,
      category: category || undefined,
      user: { connect: { id: existingUser.id } },
      isFlagged: false,
    };
    if (scopedBarangayId) reportData.barangayId = scopedBarangayId;
    if (mediaType && mediaUrl) {
      reportData.multimedia = {
        create: {
          type: mediaType.toUpperCase(),
          url: mediaUrl,
        },
      };
    }
    const report = await prisma.report.create({
      data: reportData,
      include: {
        user: true,
        multimedia: true,
      },
    });

    if (report.category) {
      const normalizedKeyword = report.category.trim().toLowerCase();
      const normalizedSeverity = (severity || report.severity).toUpperCase() as 'HIGH' | 'MODERATE' | 'LOW';
      await prisma.severityKeyword.upsert({
        where: { keyword: normalizedKeyword },
        update: { severity: normalizedSeverity },
        create: { keyword: normalizedKeyword, severity: normalizedSeverity },
      });
      clearSeverityKeywordsCache();
    }

    scheduleBackgroundAnalysis({
      reportId: report.id,
      userId: existingUser.id,
      title,
      description,
      mediaType,
      mediaUrl,
      latitude: undefined,
      longitude: undefined,
      barangayId: scopedBarangayId || undefined,
      category,
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
router.get('/', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scopedBarangayId = getScopedBarangayId(req);
    const reports = await prisma.report.findMany({
      where: scopedBarangayId ? { barangayId: scopedBarangayId } : undefined,
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

    const hydratedReports = await hydrateMissingBarangays(reports);
    return res.json(applyBarangayScope(hydratedReports, req));
  } catch (err: any) {
    console.error('❌ REPORT FETCH ERROR:', err);
    return res.status(500).json({
      error: 'Failed to fetch reports',
      details: err.message,
    });
  }
});

// -------------------------------
// GET URGENT ALERTS (HIGH severity reports)
// -------------------------------
router.get('/urgent', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scopedBarangayId = getScopedBarangayId(req);
    const urgentReports = await prisma.report.findMany({
      where: {
        severity: 'HIGH',
        status: { not: 'RESOLVED' },
        ...(scopedBarangayId ? { barangayId: scopedBarangayId } : {}),
      },
      include: {
        barangay: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const hydratedReports: any[] = await hydrateMissingBarangays(urgentReports);
    const scopedReports = applyBarangayScope(hydratedReports, req);

    const alerts = scopedReports.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      severity: r.severity,
      barangay: r.barangay?.name || 'Unknown Location',
      address: r.address || null,
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    return res.json(alerts);
  } catch (err: any) {
    console.error('❌ URGENT ALERTS ERROR:', err);
    return res.status(500).json({
      error: 'Failed to fetch urgent alerts',
      details: err.message,
    });
  }
});

// -------------------------------
// GET ACTIVITY FEED
// -------------------------------
router.get('/activity', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scopedBarangayId = getScopedBarangayId(req);

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
        ...(scopedBarangayId ? { barangayId: scopedBarangayId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    const hydratedReports = await hydrateMissingBarangays(reports);
    const scopedReports = applyBarangayScope(hydratedReports, req);
    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: today },
        ...(scopedBarangayId ? { barangayId: scopedBarangayId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const activities: any[] = [];

    scopedReports.forEach((r: any) => {
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
  } catch (err: any) {
    console.error('❌ ACTIVITY FEED ERROR:', err);
    return res.status(500).json({
      error: 'Failed to fetch activity feed',
      details: err.message,
    });
  }
});

// -------------------------------
// RESOLVE REPORT
// -------------------------------
router.post('/:id/resolve', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { resolvedByName } = req.body;

  if (!id) {
    return res.status(400).json({
      error: 'Report ID is required',
    });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      select: { barangayId: true },
    });

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
      });
    }

    if (!ensureReportInAssignedBarangay(report, req)) {
      return res.status(403).json({
        error: 'You can only manage reports from your assigned barangay',
      });
    }

    const adminUser = resolvedByName
      ? await prisma.user.findFirst({ where: { name: resolvedByName } })
      : null;

    const existingReport = await prisma.report.findUnique({
      where: { id },
      select: { userId: true, title: true },
    });

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

    if (existingReport?.userId) {
      await createNotification(
        existingReport.userId,
        'Report Resolved',
        `Your report "${existingReport.title}" has been marked as resolved.`,
        'STATUS_UPDATE',
        updated.id
      );
    }

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
      details: err.message,
    });
  }
});

// -------------------------------
// UPDATE REPORT
// -------------------------------
router.patch('/:id', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { status, severity, category, resolvedByName, assignedTo, deadline, resolutionNotes, remarks, isCredible } = req.body;
  const normalizedStatus = status ? (status === 'OPEN' ? 'PENDING' : status.toUpperCase()) : undefined;

  if (!id) {
    return res.status(400).json({
      error: 'Report ID is required',
    });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      select: { barangayId: true, userId: true },
    });

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
      });
    }

    if (!ensureReportInAssignedBarangay(report, req)) {
      return res.status(403).json({
        error: 'You can only manage reports from your assigned barangay',
      });
    }

    const resolvedById = resolvedByName
      ? await prisma.user.findFirst({ where: { name: resolvedByName } }).then((user: { id: string } | null) => user?.id)
      : undefined;

    const updated = await prisma.report.update({
      where: { id },
      data: {
        ...(normalizedStatus && { status: normalizedStatus }),
        ...(severity && { severity: severity.toUpperCase() }),
        ...(category !== undefined && { category }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(deadline && { deadline: new Date(deadline) }),
        ...(resolutionNotes !== undefined && { resolutionNotes }),
        ...(remarks !== undefined && { remarks }),
        ...(isCredible !== undefined && { isCredible }),
        ...(normalizedStatus === 'RESOLVED' && resolvedById && { resolvedBy: { connect: { id: resolvedById } } }),
        ...(normalizedStatus === 'RESOLVED' && { resolvedAt: new Date() }),
      },
      include: {
        user: true,
        barangay: true,
        multimedia: true,
        resolvedBy: true,
      },
    });

    if (category) {
      const normalizedKeyword = category.trim().toLowerCase();
      const normalizedSeverity = (severity || updated.severity).toUpperCase() as 'HIGH' | 'MODERATE' | 'LOW';
      await prisma.severityKeyword.upsert({
        where: { keyword: normalizedKeyword },
        update: { severity: normalizedSeverity },
        create: { keyword: normalizedKeyword, severity: normalizedSeverity },
      });
      clearSeverityKeywordsCache();
    }

    const datasetExists = await prisma.severityDataset.findUnique({
      where: { reportId: updated.id },
    });

    if (updated.isCredible) {
      await prisma.severityDataset.upsert({
        where: { reportId: updated.id },
        update: {
          severity: updated.severity,
          title: updated.title,
          description: updated.description,
          address: updated.address,
          barangayId: updated.barangayId,
          analysis: updated.multimedia?.[0]?.analysis ?? undefined,
        },
        create: {
          reportId: updated.id,
          severity: updated.severity,
          title: updated.title,
          description: updated.description,
          address: updated.address,
          barangayId: updated.barangayId,
          analysis: updated.multimedia?.[0]?.analysis ?? undefined,
        },
      });
    } else if (datasetExists) {
      await prisma.severityDataset.delete({ where: { reportId: updated.id } });
    }

    // Recalculate user credibility if isCredible was updated
    if (isCredible !== undefined && report.userId) {
      const userReports: { status: string; isCredible: boolean }[] = await prisma.report.findMany({
        where: { userId: report.userId },
        select: { status: true, isCredible: true },
      });
      const userResolved = userReports.filter((r) => r.status === "RESOLVED");
      const userCredible = userResolved.filter((r) => r.isCredible);
      const newCredibility = userReports.length > 0 && userResolved.length > 0
        ? Math.round((userCredible.length / userResolved.length) * 100)
        : 0;

      await prisma.user.update({
        where: { id: report.userId },
        data: { credibility: newCredibility },
      });

      await createNotification(
        report.userId,
        'Credibility Updated',
        `Your credibility score is now ${newCredibility}% based on ${userCredible.length} credible report${userCredible.length !== 1 ? 's' : ''} out of ${userResolved.length} resolved.`,
        'CREDIBILITY_UPDATE',
        updated.id
      );
    }

    if (normalizedStatus && report.userId) {
      const statusLabel = normalizedStatus === 'IN_PROGRESS' ? 'In Progress' : normalizedStatus === 'RESOLVED' ? 'Resolved' : 'Pending';
      await createNotification(
        report.userId,
        'Report Status Updated',
        `Your report "${updated.title}" has been updated to ${statusLabel}.`,
        'STATUS_UPDATE',
        updated.id
      );
    }

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
      details: err.message,
    });
  }
});

// -------------------------------
// AI ANALYSIS
// -------------------------------
router.post('/:id/analyze', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
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
        barangay: true,
      },
    });

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
      });
    }

    if (!ensureReportInAssignedBarangay(report, req)) {
      return res.status(403).json({
        error: 'You can only analyze reports from your assigned barangay',
      });
    }

    const mediaItems = (report.multimedia || []).map((m: any) => ({ type: m.type, url: m.url }));
    const firstMedia = report.multimedia?.[0];

    const aiSeverity = await analyzeSeverity({
      title: report.title,
      description: report.description,
      mediaType: firstMedia?.type,
      mediaUrl: firstMedia?.url,
      mediaItems: mediaItems.length ? mediaItems : undefined,
      category: report.category || undefined,
    });

    const insights = await generateAIInsights({
      title: report.title,
      description: report.description,
      mediaType: firstMedia?.type,
      mediaUrl: firstMedia?.url,
      mediaItems: mediaItems.length ? mediaItems : undefined,
      currentSeverity: report.severity,
      category: report.category || undefined,
    });

    // Attach the analysis to every attached multimedia item so multi-media reports are fully reviewed
    for (const m of report.multimedia || []) {
      await prisma.multimedia.update({
        where: { id: m.id },
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

import { detectBurstClusters } from "../../services/burstDetection";

router.get('/burst-clusters', authenticateToken, requireAssignedBarangay(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 10;
    const minClusterSize = parseInt(req.query.minClusterSize as string) || 2;
    const clusters = await detectBurstClusters(timeWindow, minClusterSize);
    res.json(clusters);
  } catch (err: any) {
    console.error('❌ BURST CLUSTERS ERROR:', err);
    res.status(500).json({ error: 'Failed to detect burst clusters' });
  }
});

export default router;