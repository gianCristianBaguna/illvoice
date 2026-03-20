import { Router } from "express";
import { prisma } from "../../prisma";
import { analyzeSeverity } from "../../services/severityAI/index";
import { Severity, MediaType } from "@prisma/client";


const router = Router();

// ---------------- CREATE REPORT ----------------
router.post("/reports/by-email", async (req, res) => {
  try {
    const { email, title, description, mediaType, mediaUrl, latitude, longitude } = req.body;

    // basic validation up front
    if (!email) {
      return res.status(400).json({ error: "Email is required to locate the user" });
    }

    // ensure the client is connected (optional, idempotent)
    await prisma.$connect();

    // 1️⃣ Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2️⃣ Find nearest barangay
    const barangays = await prisma.barangay.findMany();
    let nearestBarangay = null;
    let minDistance = Infinity;

    for (const b of barangays) {
      const distance = Math.sqrt(
        Math.pow(latitude! - b.latitude, 2) + Math.pow(longitude! - b.longitude, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestBarangay = b;
      }
    }

    // 3️⃣ Analyze severity with AI
    const aiSeverity = await analyzeSeverity({
      title,
      description,
      mediaType,
      mediaUrl,
    });

    const data: any = {
      userId: user.id,
      barangayId: nearestBarangay?.id,
      title,
      description,
      latitude,
      longitude,
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
router.get("/reports/by-email", async (req, res) => {
  try {
    const email = req.headers["x-user-email"] as string;

    if (!email) {
      return res.status(400).json({ error: "Email header (X-User-Email) is required" });
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

    res.json(reports);
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

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;