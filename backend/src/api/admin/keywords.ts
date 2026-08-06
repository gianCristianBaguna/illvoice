import { Response, Router } from 'express';
import { AuthenticatedRequest, authenticateToken, requireEmailVerified } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { clearSeverityKeywordsCache } from '../../services/severityAI/keyword-store';

const router = Router();

const VALID_SEVERITIES = ['LOW', 'MODERATE', 'HIGH'];

router.get('/', authenticateToken, requireEmailVerified, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const keywords = await prisma.severityKeyword.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        addedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json(keywords);
  } catch (err: any) {
    console.error('Failed to fetch severity keywords:', err);
    return res.status(500).json({ error: 'Failed to fetch severity keywords' });
  }
});

router.post('/', authenticateToken, requireEmailVerified, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { keyword, severity } = req.body;
    const userId = req.user?.userId;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({ error: 'Keyword text is required' });
    }

    if (!severity || typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity.toUpperCase())) {
      return res.status(400).json({ error: 'Severity must be HIGH, MODERATE, or LOW' });
    }

    const normalizedKeyword = keyword.trim().toLowerCase();
    const normalizedSeverity = severity.toUpperCase() as 'HIGH' | 'MODERATE' | 'LOW';

    const keywordRecord = await prisma.severityKeyword.upsert({
      where: { keyword: normalizedKeyword },
      update: {
        severity: normalizedSeverity,
        addedById: userId || undefined,
      },
      create: {
        keyword: normalizedKeyword,
        severity: normalizedSeverity,
        addedById: userId || undefined,
      },
    });

    clearSeverityKeywordsCache();

    return res.status(201).json(keywordRecord);
  } catch (err: any) {
    console.error('Failed to save severity keyword:', err);
    return res.status(500).json({ error: 'Failed to save severity keyword' });
  }
});

export default router;
