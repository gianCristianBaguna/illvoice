import { Request, Response, Router } from "express";
import { prisma } from "../../prisma";
import { scheduleBackgroundAnalysis } from "../../services/backgroundAnalysis";

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

function getNearestBarangay(latitude: number, longitude: number, barangays: Array<{ id: string; name: string; latitude: number; longitude: number }>) {
  let nearestBarangay: { id: string; name: string; latitude: number; longitude: number } | null = null;
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
      name: true,
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
    const { title, description, mediaType, mediaUrl, mediaItems, category, latitude, longitude, address, email: overrideEmail } = req.body;
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

    // 3️⃣ Normalize media list (freely addable multimedia; backward compatible with single mediaType/mediaUrl)
    const mediaList: { type: string; url: string }[] = [];
    if (Array.isArray(mediaItems) && mediaItems.length) {
      for (const m of mediaItems) {
        if (m && m.type && m.url) {
          const t = String(m.type).toUpperCase();
          if (t !== "TEXT") mediaList.push({ type: t, url: m.url });
        }
      }
    } else if (mediaType && mediaType !== "TEXT" && mediaUrl && mediaUrl !== "N/A") {
      mediaList.push({ type: String(mediaType).toUpperCase(), url: mediaUrl });
    }
    const hasMedia = mediaList.length > 0;
    const primaryMedia = hasMedia ? mediaList[0] : null;

    const finalTitle = title || (primaryMedia ? `${primaryMedia.type.charAt(0) + primaryMedia.type.slice(1).toLowerCase()} Report` : "New Report");
    const finalDescription = description || (primaryMedia && primaryMedia.type !== "TEXT" ? `Report submitted via ${primaryMedia.type.toLowerCase()} - awaiting review` : "");

    const data: any = {
      userId: user.id,
      barangayId: nearestBarangay?.id,
      title: finalTitle,
      description: finalDescription,
      address: address || undefined,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      isFlagged: false,
    };

    if (hasMedia) {
      data.multimedia = {
        create: mediaList.map((m) => ({
          type: m.type as MediaType,
          url: m.url,
          analysis: null,
        })),
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

    scheduleBackgroundAnalysis({
      reportId: report.id,
      userId: user.id,
      title: finalTitle,
      description: finalDescription,
      mediaType: primaryMedia?.type,
      mediaUrl: primaryMedia?.url,
      mediaItems: hasMedia ? mediaList : undefined,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      barangayId: nearestBarangay?.id,
      category,
    });

    res.status(201).json({
      message: 'Report created',
      report,
    });
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