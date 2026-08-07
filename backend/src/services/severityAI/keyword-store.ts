import { prisma } from '../../prisma';
import {
    SEVERITY_KEYWORDS as FALLBACK_SEVERITY_KEYWORDS,
    type SeverityLevel,
} from './keywords';

export type SeverityKeywordMap = Record<SeverityLevel, string[]>;

let cachedSeverityKeywords: SeverityKeywordMap | null = null;

export function clearSeverityKeywordsCache() {
  cachedSeverityKeywords = null;
}

function mapFromFallbackKeywords(): SeverityKeywordMap {
  return {
    HIGH: [...FALLBACK_SEVERITY_KEYWORDS.HIGH],
    MODERATE: [...FALLBACK_SEVERITY_KEYWORDS.MODERATE],
    LOW: [...FALLBACK_SEVERITY_KEYWORDS.LOW],
  };
}

export async function loadSeverityKeywords(): Promise<SeverityKeywordMap> {
  if (cachedSeverityKeywords) {
    return cachedSeverityKeywords;
  }

  try {
    const rows = await prisma.severityKeyword.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const keywordMap: SeverityKeywordMap = {
      HIGH: [],
      MODERATE: [],
      LOW: [],
    };

    if (!rows || rows.length === 0) {
      cachedSeverityKeywords = mapFromFallbackKeywords();
      return cachedSeverityKeywords;
    }

    for (const row of rows) {
      const severity = row.severity as SeverityLevel;
      if (keywordMap[severity]) {
        keywordMap[severity].push(row.keyword);
      }
    }

    cachedSeverityKeywords = keywordMap;
    return keywordMap;
  } catch (err: any) {
    console.error('Failed to load severity keywords from database:', err?.message || err);
    cachedSeverityKeywords = mapFromFallbackKeywords();
    return cachedSeverityKeywords;
  }
}

export async function getRuleBasedSeverity(
  title: string,
  description: string,
  audioText?: string,
  category?: string
): Promise<SeverityLevel> {
  const text = `${title} ${description} ${audioText || ''} ${category || ''}`.toLowerCase();
  const severityKeywords = await loadSeverityKeywords();

  const highMatch = severityKeywords.HIGH.some((keyword) => text.includes(keyword.toLowerCase()));
  if (highMatch) return 'HIGH';

  const moderateMatch = severityKeywords.MODERATE.some((keyword) => text.includes(keyword.toLowerCase()));
  if (moderateMatch) return 'MODERATE';

  const lowMatch = severityKeywords.LOW.some((keyword) => text.includes(keyword.toLowerCase()));
  if (lowMatch) return 'LOW';

  return 'LOW';
}
