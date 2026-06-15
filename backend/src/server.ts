import cors from "cors";
import "dotenv/config";
import express from "express";
import adminRoutes from "./api/admin/login";
import adminGoogleRoutes from "./api/admin/google-signin";
import googleAuthRoutes from "./api/auth/google";
import usernamePasswordAuthRoutes from "./api/auth/username-password";
import dashboardRoutes from "./api/dashboard/dashboard";
import reportRoutes from "./api/reports/index";
import userRoutes from "./api/user/profile";
import { authenticateToken, authorizeRoles } from "./middleware/auth";
import { prisma } from "./prisma";

console.log("Backend Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("OpenAI API Key configured:", !!process.env.OPENAI_API_KEY);

const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.254.111:4000", "http://192.168.254.111:8081"],
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

// Public auth routes
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/auth", usernamePasswordAuthRoutes);
app.use("/api/reports", reportRoutes);

// Dashboard routes (handle auth internally for mobile compatibility)
app.use("/dashboard", dashboardRoutes);

// Protected routes - user requires valid JWT
app.use("/api/user", authenticateToken, userRoutes);

// Admin routes (with their own internal authorization checks)
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminGoogleRoutes);

const PORT = Number(process.env.PORT)|| 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://192.168.254.111:${PORT}`);
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

 app.get("/seed-demo-admin", async (req, res) => {
   try {
     const bcrypt = require('bcryptjs');
     const hashedPassword = await bcrypt.hash('admin123', 10);
     const existingUser = await prisma.user.findUnique({ where: { email: 'admin@demo.gov' } });
     if (existingUser) {
       await prisma.user.update({
         where: { email: 'admin@demo.gov' },
         data: { password: hashedPassword, authMethod: 'USERNAME_PASSWORD', role: 'BARANGAY_OFFICIAL' }
       });
       res.json({ success: true, message: 'Demo admin updated with password' });
     } else {
       const user = await prisma.user.create({
         data: {
           email: 'admin@demo.gov',
           name: 'Demo Admin',
           password: hashedPassword,
           authMethod: 'USERNAME_PASSWORD',
           role: 'BARANGAY_OFFICIAL'
         }
       });
       res.json({ success: true, user });
     }
   } catch (err: any) {
     res.status(500).json({ error: err.message });
   }
 });

 app.get("/seed-barangay-admin", async (req, res) => {
   try {
     const bcrypt = require('bcryptjs');
     const hashedPassword = await bcrypt.hash('admin123', 10);
     const existingUser = await prisma.user.findUnique({ where: { email: 'admin@barangay.gov' } });
     if (existingUser) {
       await prisma.user.update({
         where: { email: 'admin@barangay.gov' },
         data: { password: hashedPassword, authMethod: 'USERNAME_PASSWORD', role: 'BARANGAY_OFFICIAL' }
       });
       res.json({ success: true, message: 'Barangay admin updated with password' });
     } else {
       const user = await prisma.user.create({
         data: {
           email: 'admin@barangay.gov',
           name: 'Barangay Admin',
           password: hashedPassword,
           authMethod: 'USERNAME_PASSWORD',
           role: 'BARANGAY_OFFICIAL'
         }
       });
       res.json({ success: true, user });
     }
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