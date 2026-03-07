import { Router } from "express";
import { prisma } from "../../prisma";
import { analyzeSeverity } from "../../services/severityAI/index";

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

    // 4️⃣ Create report
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        barangayId: nearestBarangay?.id,
        title,
        description,
        latitude,
        longitude,
        severity: aiSeverity as any,
      },
      include: {
        user: true,
        barangay: true,
        multimedia: true, // optional, if you want to return media too
      },
    });

    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create report" });
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