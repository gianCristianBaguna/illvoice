import { Router, type Request, type Response } from 'express';
import { prisma } from '../../prisma';
import { analyzeSeverity, generateAIInsights } from "../../services/severityAI/index";

const router = Router();

// -------------------------------
// CREATE REPORT
// -------------------------------
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, title, description, severity, mediaType, mediaUrl } = req.body;

    if (!email || !title || !description || !severity) {
      return res
        .status(400)
        .json({ error: 'Email, title, description, and severity are required' });
    }

    // Find user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found. Reports can only be created by registered users.',
      });
    }

    // Create report
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
// UPDATE REPORT
// -------------------------------
router.patch('/:id', async (req: Request, res: Response) => {
  const idParam = req.params.id;

  // Fix TypeScript issue
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const { status, severity } = req.body;

  if (!id) {
    return res.status(400).json({
      error: 'Report ID is required',
    });
  }

  try {
    const updated = await prisma.report.update({
      where: { id },
      data: {
        ...(status && { status: status.toUpperCase() }),
        ...(severity && { severity: severity.toUpperCase() }),
      },
      include: {
        user: true,
        barangay: true,
        multimedia: true,
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
    // Get the report with multimedia
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

    // Analyze with AI
    const media = report.multimedia?.[0];
    const aiSeverity = await analyzeSeverity({
      title: report.title,
      description: report.description,
      mediaType: media?.type,
      mediaUrl: media?.url,
    });

    // Generate AI insights
    const insights = await generateAIInsights({
      title: report.title,
      description: report.description,
      mediaType: media?.type,
      mediaUrl: media?.url,
      currentSeverity: report.severity,
    });

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