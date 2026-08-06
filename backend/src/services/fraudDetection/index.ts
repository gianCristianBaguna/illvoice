import { prisma } from '../../prisma';
import { getVisionProvider } from '../severityAI/providers';
import OpenAI from 'openai';
import type { FraudSeverity, FraudFlag, FraudCheckResult, FraudCheckOptions } from './types';

export type { FraudSeverity, FraudFlag, FraudCheckResult, FraudCheckOptions } from './types';

const openai: OpenAI | null = (() => {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch {
    return null;
  }
})();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

function similarityRatio(a: string, b: string): number {
  const cleanA = normalizeText(a);
  const cleanB = normalizeText(b);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(cleanA, cleanB) / maxLen;
}

async function checkRateLimit(userId: string): Promise<import('./types').FraudFlag | null> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const count = await prisma.report.count({
    where: { userId, createdAt: { gte: tenMinutesAgo } },
  });
  if (count > 5) {
    return {
      type: 'RATE_LIMIT',
      reason: `Submitted ${count} reports within 10 minutes (threshold: 5)`,
      severity: 'HIGH',
      details: { reportCount: count, timeWindowMinutes: 10 },
    };
  }
  return null;
}

async function checkDuplicateImage(mediaUrl: string | undefined): Promise<import('./types').FraudFlag | null> {
  if (!mediaUrl) return null;
  const existing = await prisma.multimedia.findFirst({
    where: { url: mediaUrl },
    include: { report: { select: { id: true, userId: true, createdAt: true } } },
  });
  if (existing) {
    return {
      type: 'DUPLICATE_IMAGE',
      reason: 'Same image already uploaded in another report',
      severity: 'HIGH',
      details: { duplicateReportId: existing.report.id, duplicateReportUserId: existing.report.userId },
    };
  }
  return null;
}

async function checkDuplicateText(description: string): Promise<import('./types').FraudFlag | null> {
  const normalizedNew = normalizeText(description);
  const recent = await prisma.report.findMany({
    where: { description: { not: "" } },
    select: { id: true, description: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const newLen = normalizedNew.length;
  for (const report of recent) {
    if (!report.description) continue;
    const otherLen = normalizeText(report.description).length;
    if (Math.abs(newLen - otherLen) > Math.max(newLen, otherLen) * 0.5) continue;

    const jaccard = jaccardSimilarity(normalizedNew, normalizeText(report.description));
    if (jaccard > 0.3) {
      const sim = similarityRatio(description, report.description);
      if (sim >= 0.8) {
        return {
          type: 'DUPLICATE_TEXT',
          reason: `Complaint text is nearly identical to a previous report (${Math.round(sim * 100)}% similarity)`,
          severity: 'HIGH',
          details: { similarity: sim, matchReportId: report.id },
        };
      }
    }
  }
  return null;
}

async function checkGpsBarangayMismatch(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  barangayId: string | null | undefined
): Promise<import('./types').FraudFlag | null> {
  if (latitude == null || longitude == null || !barangayId) return null;
  const barangay = await prisma.barangay.findUnique({
    where: { id: barangayId },
    select: { latitude: true, longitude: true, name: true },
  });
  if (!barangay || barangay.latitude === null || barangay.longitude === null) return null;

  const distance = haversineDistance(latitude, longitude, barangay.latitude, barangay.longitude);
  if (distance > 5) {
    return {
      type: 'GPS_MISMATCH',
      reason: `GPS location is ${distance.toFixed(1)} km from selected barangay center`,
      severity: 'MEDIUM',
      details: { distanceKm: Math.round(distance * 100) / 100, reportedCoords: { latitude, longitude }, barangayCoords: { latitude: barangay.latitude, longitude: barangay.longitude } },
    };
  }
  return null;
}

async function checkContentImageMismatch(
  title: string | undefined,
  description: string,
  imageAnalysis?: { description?: string; hazards?: string[]; severity_indicator?: string }
): Promise<import('./types').FraudFlag | null> {
  if (!imageAnalysis) return null;
  const text = `${title || ''} ${description}`.toLowerCase();
  const claimsFire = /fire|flame|burn|smoke|inferno|sunog|apoy|kalayo/.test(text);
  const claimsFlood = /flood|flooding|baha|tubig- tubig/.test(text);

  if (!claimsFire && !claimsFlood) return null;

  const hazards = (imageAnalysis.hazards || []).map((h: string) => h.toLowerCase()).join(' ');
  const imageDesc = (imageAnalysis.description || '').toLowerCase();
  const combined = `${hazards} ${imageDesc}`;

  if (claimsFire && !/fire|flame|burn|smoke|inferno|sunog|apoy|kalayo/.test(combined)) {
    return {
      type: 'CONTENT_MISMATCH',
      reason: 'Report claims fire/burning but image does not show related content',
      severity: 'HIGH',
      details: { claimedHazards: 'fire/burning', detectedHazards: imageAnalysis.hazards, imageDescription: imageAnalysis.description },
    };
  }
  if (claimsFlood && !/flood|flooding|water|baha|tubig/.test(combined)) {
    return {
      type: 'CONTENT_MISMATCH',
      reason: 'Report claims flood but image does not show related content',
      severity: 'HIGH',
      details: { claimedHazards: 'flood', detectedHazards: imageAnalysis.hazards, imageDescription: imageAnalysis.description },
    };
  }
  return null;
}

async function checkSpamText(description: string): Promise<import('./types').FraudFlag | null> {
  if (!openai) return null;

  const prompt = `Analyze this complaint text for spam, fraud, or suspicious patterns. Check for:
- Spam-like wording (all caps, repeated phrases, promotional content)
- Exaggerated urgency (unrealistic claims, fake emergencies)
- Fraudulent or nonsensical content

Report text: "${description.slice(0, 2000)}"

Return ONLY JSON: {"isSpam": true/false, "reason": "brief explanation", "spamScore": 0.0-1.0}`;

  try {
    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a fraud detection AI. Analyze text for spam and suspicious patterns. Respond only with JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    });

    const content = result.choices[0].message.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.isSpam && parsed.spamScore > 0.5) {
      return {
        type: 'SPAM_TEXT',
        reason: parsed.reason || 'Text analysis detected spam-like patterns',
        severity: parsed.spamScore > 0.8 ? 'HIGH' : 'MEDIUM',
        details: { spamScore: parsed.spamScore },
      };
    }
  } catch (err) {
    console.error('GPT spam detection error:', err);
  }
  return null;
}

async function checkWhisper(transcript: string): Promise<import('./types').FraudFlag | null> {
  if (!transcript || transcript.length < 10) return null;

  const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length < 5) {
    return {
      type: 'UNCLEAR_AUDIO',
      reason: 'Transcription is too short to be meaningful',
      severity: 'MEDIUM',
      details: { wordCount: words.length },
    };
  }

  const wordCounts: Record<string, number> = {};
  words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
  const maxFreq = Math.max(...Object.values(wordCounts));
  const repetitionRatio = maxFreq / words.length;

  if (repetitionRatio > 0.4) {
    return {
      type: 'REPETITIVE_AUDIO',
      reason: 'Transcription appears highly repetitive',
      severity: 'LOW',
      details: { repetitionRatio, wordCount: words.length },
    };
  }

  return null;
}

async function checkUserCredibility(user: { credibility: number; createdAt: Date; emailVerified: boolean; authMethod: string }): Promise<import('./types').FraudFlag | null> {
  const flags: string[] = [];
  const details: Record<string, unknown> = {};

  if (!user.emailVerified) {
    flags.push('Email is not verified');
    details.emailVerified = false;
  }

  if (user.credibility < 50) {
    flags.push(`Credibility score is ${user.credibility}%`);
    details.credibility = user.credibility;
  }

  const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
  if (accountAgeMs < 60 * 60 * 1000) {
    flags.push('Account created less than 1 hour ago');
    details.accountAgeMs = accountAgeMs;
  }

  if (flags.length === 0) return null;

  const hasMedium = flags.length > 1 || (user.credibility < 50);
  return {
    type: 'CREDIBILITY_ISSUES',
    reason: flags.join('; '),
    severity: hasMedium ? 'MEDIUM' : 'LOW',
    details,
  };
}

export async function runFraudChecks(options: FraudCheckOptions): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = [];
  const checksRun: string[] = [];

  const {
    userId,
    description,
    title,
    mediaType,
    mediaUrl,
    imageAnalysis,
    transcript,
    latitude,
    longitude,
    barangayId,
  } = options;

  try {
    const rateLimitFlag = await checkRateLimit(userId);
    if (rateLimitFlag) { flags.push(rateLimitFlag); checksRun.push('RATE_LIMIT'); }

    const duplicateImageFlag = await checkDuplicateImage(mediaUrl);
    if (duplicateImageFlag) { flags.push(duplicateImageFlag); checksRun.push('DUPLICATE_IMAGE'); }

    const duplicateTextFlag = await checkDuplicateText(description);
    if (duplicateTextFlag) { flags.push(duplicateTextFlag); checksRun.push('DUPLICATE_TEXT'); }

    const gpsFlag = await checkGpsBarangayMismatch(latitude, longitude, barangayId);
    if (gpsFlag) { flags.push(gpsFlag); checksRun.push('GPS_MISMATCH'); }

    const contentFlag = await checkContentImageMismatch(title || '', description, imageAnalysis);
    if (contentFlag) { flags.push(contentFlag); checksRun.push('CONTENT_MISMATCH'); }

    const spamFlag = await checkSpamText(description);
    if (spamFlag) { flags.push(spamFlag); checksRun.push('SPAM_TEXT'); }

    if (transcript) {
      const whisperFlag = await checkWhisper(transcript);
      if (whisperFlag) { flags.push(whisperFlag); checksRun.push('WHISPER_VALIDATION'); }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credibility: true, createdAt: true, emailVerified: true, authMethod: true },
    });
    if (user) {
      const credFlag = await checkUserCredibility(user);
      if (credFlag) { flags.push(credFlag); checksRun.push('CREDIBILITY'); }
    }
  } catch (err) {
    console.error('Fraud check error:', err);
  }

  const severityScores: Record<string, number> = { LOW: 10, MEDIUM: 30, HIGH: 60 };
  const riskScore = Math.min(100, flags.reduce((sum, f) => sum + (severityScores[f.severity] || 0), 0));
  const isSuspicious = flags.some(f => f.severity === 'HIGH') || riskScore >= 50;

  return { isSuspicious, flags, riskScore, checksRun };
}
