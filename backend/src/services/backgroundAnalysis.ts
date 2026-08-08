import { prisma } from '../prisma';
import { runFraudChecks } from './fraudDetection';
import { analyzeSeverity, generateAIInsights, getVisionProvider, getAudioProvider } from './severityAI';

export interface BackgroundAnalysisOptions {
  reportId: string;
  userId: string;
  title: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
  mediaItems?: { type: string; url: string }[];
  latitude?: number | null;
  longitude?: number | null;
  barangayId?: string | null;
  category?: string;
}

export async function scheduleBackgroundAnalysis(options: BackgroundAnalysisOptions) {
  const {
    reportId,
    userId,
    title,
    description,
    mediaType,
    mediaUrl,
    mediaItems = [],
    latitude,
    longitude,
    barangayId,
    category,
  } = options;

  setImmediate(async () => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { multimedia: true },
      });

      if (!report) {
        console.error(`[BackgroundAnalysis] Report ${reportId} not found`);
        return;
      }

      const mediaList: { type: string; url: string }[] = [...mediaItems];
      if (mediaType && mediaType !== "TEXT" && mediaUrl) {
        mediaList.push({ type: mediaType.toUpperCase(), url: mediaUrl });
      }
      const hasMedia = mediaList.length > 0;
      const primaryMedia = hasMedia ? mediaList[0] : null;

      let imageAnalysis: any = undefined;
      let transcript = "";

      if (hasMedia) {
        const visionProvider = getVisionProvider();
        const audioProvider = getAudioProvider();

        for (const item of mediaList) {
          if (item.type === "IMAGE" || item.type === "VIDEO") {
            try {
              imageAnalysis = item.type === "IMAGE"
                ? await visionProvider.analyzeImage(item.url)
                : await visionProvider.analyzeVideoMultiFrame(item.url);
            } catch (e) {
              console.error(`[BackgroundAnalysis] Vision analysis failed for ${item.url}:`, e);
            }
          } else if (item.type === "AUDIO") {
            try {
              const tr = await audioProvider.transcribe(item.url);
              if (tr) transcript += (transcript ? " " : "") + tr;
            } catch (e) {
              console.error(`[BackgroundAnalysis] Audio transcription failed for ${item.url}:`, e);
            }
          }
        }
      }

      const fraudResult = await runFraudChecks({
        userId,
        description,
        title,
        mediaType: primaryMedia?.type || "TEXT",
        mediaUrl: primaryMedia?.url,
        imageAnalysis,
        transcript,
        latitude,
        longitude,
        barangayId,
      });

      if (fraudResult.isSuspicious) {
        console.warn(`[BackgroundAnalysis] Suspicious report ${reportId}:`, fraudResult.flags.map((f: any) => f.type).join(', '));
      }

      await prisma.report.update({
        where: { id: reportId },
        data: {
          isFlagged: fraudResult.isSuspicious,
          flagType: fraudResult.flags.length > 0 ? fraudResult.flags.map((f: any) => f.type).join(',') : undefined,
          flagReason: fraudResult.flags.length > 0 ? fraudResult.flags.map((f: any) => f.reason).join('; ') : undefined,
          fraudCheck: fraudResult.flags.length > 0 ? {
            isSuspicious: fraudResult.isSuspicious,
            flags: fraudResult.flags,
            riskScore: fraudResult.riskScore,
            checksRun: fraudResult.checksRun,
          } as any : undefined,
        },
      });

      const firstMedia = report.multimedia?.[0];
      try {
        const aiSeverity = await analyzeSeverity({
          title: report.title,
          description: report.description,
          mediaType: firstMedia?.type,
          mediaUrl: firstMedia?.url,
          mediaItems: hasMedia ? mediaList : undefined,
          category: report.category || category || undefined,
        });

        const insights = await generateAIInsights({
          title: report.title,
          description: report.description,
          mediaType: firstMedia?.type,
          mediaUrl: firstMedia?.url,
          mediaItems: hasMedia ? mediaList : undefined,
          currentSeverity: report.severity,
          category: report.category || category || undefined,
        });

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
      } catch (e) {
        console.error(`[BackgroundAnalysis] AI analysis failed for report ${reportId}:`, e);
      }

      console.log(`[BackgroundAnalysis] Completed analysis for report ${reportId}`);
    } catch (err) {
      console.error(`[BackgroundAnalysis] Error processing report ${reportId}:`, err);
    }
  });
}
