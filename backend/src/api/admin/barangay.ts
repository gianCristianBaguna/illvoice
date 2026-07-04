import { Request, Response, Router } from "express";
import { prisma } from "../../prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const barangays = await prisma.barangay.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });
    res.json(barangays);
  } catch (err: any) {
    console.error("Error fetching barangays:", err);
    res.status(500).json({ error: "Failed to fetch barangays" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const barangay = await prisma.barangay.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });

    if (!barangay) {
      return res.status(404).json({ error: "Barangay not found" });
    }

    res.json(barangay);
  } catch (err: any) {
    console.error("Error fetching barangay:", err);
    res.status(500).json({ error: "Failed to fetch barangay" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude, address, boundaryPolygon } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Name, latitude, and longitude are required" });
    }

    const existing = await prisma.barangay.findFirst({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: "Barangay already exists" });
    }

    const barangay = await prisma.barangay.create({
      data: {
        name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        address: address || undefined,
        boundaryPolygon: boundaryPolygon || undefined,
      },
    });

    res.status(201).json(barangay);
  } catch (err: any) {
    console.error("Error creating barangay:", err);
    res.status(500).json({ error: err.message || "Failed to create barangay" });
  }
});

// Update barangay (name, location, address, boundary)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, address, boundaryPolygon } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Barangay ID is required" });
    }

    const barangay = await prisma.barangay.findUnique({ where: { id } });
    if (!barangay) {
      return res.status(404).json({ error: "Barangay not found" });
    }

    const updated = await prisma.barangay.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(latitude !== undefined && { latitude: Number(latitude) }),
        ...(longitude !== undefined && { longitude: Number(longitude) }),
        ...(address !== undefined && { address }),
        ...(boundaryPolygon !== undefined && { boundaryPolygon }),
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Error updating barangay:", err);
    res.status(500).json({ error: err.message || "Failed to update barangay" });
  }
});

// Delete barangay
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Barangay ID is required" });
    }

    const barangay = await prisma.barangay.findUnique({
      where: { id },
      include: { officials: true },
    });

    if (!barangay) {
      return res.status(404).json({ error: "Barangay not found" });
    }

    // Prevent deletion if there are assigned officials
    if (barangay.officials && barangay.officials.length > 0) {
      return res.status(400).json({
        error: "Cannot delete barangay with assigned officials. Reassign or remove officials first.",
      });
    }

    await prisma.barangay.delete({ where: { id } });

    res.json({ message: "Barangay deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting barangay:", err);
    res.status(500).json({ error: err.message || "Failed to delete barangay" });
  }
});

// Get officials for a barangay
router.get("/:id/officials", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Barangay ID is required" });
    }

    const officials = await prisma.user.findMany({
      where: {
        barangayId: id,
        role: 'BARANGAY_OFFICIAL',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    res.json(officials);
  } catch (err: any) {
    console.error("Error fetching barangay officials:", err);
    res.status(500).json({ error: err.message || "Failed to fetch officials" });
  }
});

// Get all barangay accounts with official counts (for admin list)
router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const barangays = await prisma.barangay.findMany({
      orderBy: { name: "asc" },
      include: {
        officials: {
          where: { role: 'BARANGAY_OFFICIAL' },
          select: { id: true },
        },
      },
    });

    const accounts = barangays.map(b => ({
      id: b.id,
      name: b.name,
      latitude: b.latitude,
      longitude: b.longitude,
      address: b.address,
      boundaryPolygon: b.boundaryPolygon,
      officialCount: b.officials.length,
    }));

    res.json(accounts);
  } catch (err: any) {
    console.error("Error fetching barangay accounts:", err);
    res.status(500).json({ error: "Failed to fetch barangay accounts" });
  }
});

export default router;