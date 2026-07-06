import { Request, Response, Router } from "express";
import { prisma } from "../../prisma";
import { analyzeSeverity, generateAIInsights, getVisionProvider } from "../../services/severityAI/index";

type Severity = "LOW" | "MODERATE" | "HIGH";
type MediaType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";


const router = Router();
const FALLBACK_BARANGAY_NAME = "Unassigned Barangay";

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getNearestBarangay(latitude: number, longitude: number, barangays: Array<{ id: string; latitude: number; longitude: number }>) {
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

async function resolveBarangayForReport(latitude: number | undefined, longitude: number | undefined) {
  if (latitude === undefined || longitude === undefined) return null;

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

// ---------------- CREATE REPORT ----------------
router.post("/reports/by-email", async (req: Request, res: Response) => {
  try {
    const { title, description, mediaType, mediaUrl, latitude, longitude, email: overrideEmail } = req.body;
    const resolvedLatitude = toFiniteNumber(latitude);
    const resolvedLongitude = toFiniteNumber(longitude);

    // Get email from authenticated user or override
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    let email = overrideEmail;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6');
        email = decoded.email;
      } catch (e) {
        // Token invalid, continue with email from body
      }
    }

    if (!email) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // ensure the client is connected (optional, idempotent)
    await prisma.$connect();

    // 1️⃣ Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2️⃣ Find nearest barangay
    const nearestBarangay = await resolveBarangayForReport(resolvedLatitude, resolvedLongitude);

    // 3️⃣ Analyze severity with AI
    const aiSeverity = await analyzeSeverity({
      title,
      description,
      mediaType,
      mediaUrl,
    });

    let finalTitle = title;
    let finalDescription = description;

    // For media reports, get AI-generated title/description if not provided
    if (mediaType && mediaType !== "TEXT" && mediaUrl && mediaUrl !== "N/A") {
      try {
        const visionProvider = getVisionProvider();
        const analysis = await visionProvider.analyzeImage(mediaUrl);
        
        // Use AI description if available and meaningful
        if (analysis.description && analysis.description.trim() && !finalDescription) {
          finalDescription = analysis.description;
        }
        
        // Use AI hazards for insights
        const insights = await generateAIInsights({
          title: finalTitle,
          description: analysis.description,
          mediaType,
          mediaUrl,
          currentSeverity: aiSeverity,
        });

        // Extract title from insights if empty
        if (!finalTitle || finalTitle === "") {
          const lines = insights.split('\n').filter((l: string) => l.trim());
          const firstLine = lines[0] || "";
          finalTitle = firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine;
        }
        if (!finalTitle || finalTitle === "Media Report") {
          finalTitle = `${mediaType.charAt(0) + mediaType.slice(1).toLowerCase()} Report`;
        }
        if (!finalDescription || finalDescription === "AI analyzed report") {
          const lines = insights.split('\n').filter((l: string) => l.trim());
          finalDescription = lines.slice(0, 2).join('. ').substring(0, 250) || `Report submitted via ${mediaType.toLowerCase()}`;
        }
      } catch (e) {
        console.error("Failed to get AI insights for title/description:", e);
        finalTitle = finalTitle || `${mediaType.charAt(0) + mediaType.slice(1).toLowerCase()} Report`;
        finalDescription = finalDescription || `Report submitted via ${mediaType.toLowerCase()} - awaiting review`;
      }
    }

    const data: any = {
      userId: user.id,
      barangayId: nearestBarangay?.id,
      title: finalTitle,
      description: finalDescription,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      severity: aiSeverity as Severity,
    };

    // Add multimedia only if it exists
    if (mediaType && mediaType !== "TEXT" && mediaUrl && mediaUrl !== "N/A") {
      data.multimedia = {
        create: [
          {
            type: mediaType as MediaType,
            url: mediaUrl,
            analysis: null,
          },
        ],
      };
    }

    const report = await prisma.report.create({
      data,
      include: {
        user: true,
        barangay: true,
        multimedia: true,
      },
    });

    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

// ---------------- GET REPORTS BY EMAIL ----------------
router.get("/reports/by-email", async (req: Request, res: Response) => {
  try {
    // Try to get email from authenticated user or query param
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    let email = req.query.email as string | undefined;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6');
        email = decoded.email;
      } catch (e) {
        // Token invalid, continue with email from query
      }
    }

    if (!email) {
      return res.status(401).json({ error: "Authentication required. Please log in again." });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch reports for this user
    const reports = await prisma.report.findMany({
      where: { userId: user.id },
      include: {
        user: true,
        barangay: true,
        multimedia: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const hydratedReports = await hydrateMissingBarangays(reports);
    res.json(hydratedReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});


// ---------------- GET ALL REPORTS ----------------
router.get("/reports", async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: true,
        barangay: true,
        multimedia: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const hydratedReports = await hydrateMissingBarangays(reports);
    res.json(hydratedReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;