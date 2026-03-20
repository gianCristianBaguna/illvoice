import { Router } from "express";
import { prisma } from "../../prisma";

const router = Router();

// Get user profile with credibility and statistics
router.get("/profile", async (req, res) => {
  try {
    const email = req.headers["x-user-email"] as string;

    if (!email) {
      return res.status(400).json({ error: "Email header (X-User-Email) is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        credibility: true,
        image: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user report statistics
    const allReports = await prisma.report.findMany({
      where: { userId: user.id },
      select: {
        status: true,
        severity: true,
      },
    });

    const totalReports = allReports.length;
    const resolvedReports = allReports.filter((r) => r.status === "RESOLVED").length;
    const pendingReports = allReports.filter((r) => r.status === "PENDING").length;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      credibility: user.credibility,
      image: user.image,
      totalReports,
      resolvedReports,
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

export default router;
