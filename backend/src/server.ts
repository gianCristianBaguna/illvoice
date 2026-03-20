import cors from "cors";
import "dotenv/config";
import express from "express";
import adminRoutes from "./api/admin/google-signin";
import authRoutes from "./api/auth/google";
import dashboardRoutes from "./api/dashboard/dashboard";
import reportRoutes from "./api/reports/index";
import userRoutes from "./api/user/profile";
import { prisma } from "./prisma";

import dotenv from 'dotenv';

dotenv.config();
console.log("Backend Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("OpenAI API Key configured:", !!process.env.OPENAI_API_KEY);

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// connect to the database once at startup so we can fail fast
prisma
  .$connect()
  .then(() => console.log("Prisma connected to database"))
  .catch((err) => {
    console.error("Prisma connection error:", err);
    process.exit(1);
  });

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = Number(process.env.PORT)|| 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://192.168.50.203:${PORT}`);
});

// Add this right before your other routes
app.get("/where-am-i", (req, res) => {
  // Pull the URL directly from your hardcoded config or env
  const dbUrl = process.env.DATABASE_URL || "Using Hardcoded Prisma.ts";
  
  // This extracts the project ID from the URL (e.g., db.xyz.supabase.co)
  const match = dbUrl.match(/db\.(.*?)\.supabase/);
  const projectRef = match ? match[1] : "Local/Unknown";

  res.json({ 
    message: "Server is alive! 🚀",
    database_host: projectRef,
    full_url_preview: dbUrl.substring(0, 25) + "..." // Hide password for safety
  });
});




app.get("/debug-db", async (req, res) => {
  const userCount = await prisma.user.count();
  const firstUser = await prisma.user.findFirst();
  res.json({ 
    totalUsers: userCount, 
    sampleId: firstUser?.id || "NO USERS FOUND" 
  });
});

app.get("/seed-test", async (req, res) => {
  try {
    const newUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        role: "RESIDENT"
      }
    });
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Handle unhandled errors
process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("Unhandled Rejection:", reason);
  await prisma.$disconnect();
  process.exit(1);
});