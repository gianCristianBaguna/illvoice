import { Router } from "express";
import { prisma } from "../../prisma";

const router = Router();

// Get user profile with credibility and statistics
router.get("/profile", async (req, res) => {
  try {
    const requester = (req as any).user;
    const email = requester?.email || (req.headers["x-user-email"] as string);

    if (!email) {
      return res.status(400).json({ error: "Authentication required" });
    }

    const account = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        credibility: true,
        image: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user report statistics
    const allReports = await prisma.report.findMany({
      where: { userId: account.id },
      select: {
        status: true,
        severity: true,
        isCredible: true,
      },
    });

    const totalReports = allReports.length;
    const resolvedReports = allReports.filter((r) => r.status === "RESOLVED").length;
    const credibleReports = allReports.filter((r) => r.isCredible).length;
    const pendingReports = allReports.filter((r) => r.status === "PENDING").length;

    res.json({
      id: account.id,
      email: account.email,
      name: account.name,
      credibility: account.credibility,
      image: account.image,
      totalReports,
      resolvedReports,
      credibleReports,
      pendingReports,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user credibility based on report verification
router.patch("/:userId/credibility", async (req, res) => {
  try {
    const { userId } = req.params;
    const { increment = 0.1 } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credibility: {
          increment,
        },
      },
    });

    res.json({
      message: "Credibility updated",
      credibility: user.credibility,
    });
  } catch (err) {
    console.error("Error updating credibility:", err);
    res.status(500).json({ error: "Failed to update credibility" });
  }
});

// Recalculate user credibility percentage based on resolved reports marked as credible
router.post("/:userId/credibility/recalculate", async (req, res) => {
  try {
    const { userId } = req.params;

    const allReports = await prisma.report.findMany({
      where: { userId },
      select: {
        status: true,
        isCredible: true,
      },
    });

    const resolvedReports = allReports.filter((r) => r.status === "RESOLVED");
    const credibleReports = resolvedReports.filter((r) => r.isCredible);

    const credibilityPercentage = resolvedReports.length > 0
      ? Math.round((credibleReports.length / resolvedReports.length) * 100)
      : 0;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { credibility: credibilityPercentage },
    });

    res.json({
      message: "Credibility recalculated",
      credibility: user.credibility,
      totalResolved: resolvedReports.length,
      credibleCount: credibleReports.length,
    });
  } catch (err) {
    console.error("Error recalculating credibility:", err);
    res.status(500).json({ error: "Failed to recalculate credibility" });
  }
});

export default router;