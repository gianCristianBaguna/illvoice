import cors from "cors";
import "dotenv/config";
import express from "express";
import adminBarangayRoutes from "./api/admin/barangay";
import adminGoogleRoutes from "./api/admin/google-signin";
import adminRoutes from "./api/admin/login";
import googleAuthRoutes from "./api/auth/google";
import usernamePasswordAuthRoutes from "./api/auth/username-password";
import dashboardRoutes from "./api/dashboard/dashboard";
import reportRoutes from "./api/reports/index";
import uploadRoutes from "./api/upload/upload";
import notificationRoutes from "./api/notifications/index";
import userRoutes from "./api/user/profile";
import { authenticateToken } from "./middleware/auth";
import { prisma } from "./prisma";

console.log("Backend Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("OpenAI API Key configured:", !!process.env.OPENAI_API_KEY);

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://192.168.5.235:4000",
        "http://192.168.5.235:8081",
        "https://illvoice-production.up.railway.app",
      ];

      if (!origin || allowedOrigins.includes(origin) || /https:\/\/.*\.vercel\.app$/i.test(origin) || /https:\/\/.*\.vercel\.dev$/i.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));

// connect to the database once at startup - don't exit on failure, allow mock mode
prisma
  .$connect()
  .then(() => console.log("Prisma connected to database"))
  .catch((err: any) => {
    console.warn("Prisma connection error (continuing in mock mode):", err.message);
  });

// Public auth routes
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/auth", usernamePasswordAuthRoutes);
app.use("/api/reports", reportRoutes);

// Dashboard routes (handle auth internally for mobile compatibility)
app.use("/dashboard", dashboardRoutes);

// Protected routes - user requires valid JWT
app.use("/api/user", authenticateToken, userRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);

// SSE stream endpoint - handles auth via query param (EventSource doesn't support headers)
app.get("/api/notifications/stream", async (req: any, res: express.Response) => {
  // Inline auth for EventSource compatibility
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || '0ed61e861b352aeed7230f238dd766ef4535b60d8f0b74543f8c160097afc3d6';

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Use userId from token for SSE registry
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Add client to SSE registry
    const { addClient, removeClient } = require('./sse');
    addClient(userId, res);

    // Keep alive interval
    const keepAlive = setInterval(() => {
      res.write(':\n\n');
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      removeClient(userId, res);
    });

    req.on('error', () => {
      clearInterval(keepAlive);
      removeClient(userId, res);
    });
  } catch (err) {
    console.error('SSE auth error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Admin routes (with their own internal authorization checks)
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminGoogleRoutes);
app.use("/api/admin/barangays", adminBarangayRoutes);

// Upload proxy (uses service role - no RLS)
app.use("/api/upload", uploadRoutes);

const PORT = Number(process.env.PORT)|| 4000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://192.168.5.235:${PORT}`);
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
     
     // First create a barangay if needed
     let barangay = await prisma.barangay.findFirst({ where: { name: 'Demo Barangay' } });
     if (!barangay) {
       barangay = await prisma.barangay.create({
         data: {
           name: 'Demo Barangay',
           latitude: 14.5995,
           longitude: 120.9842,
           address: 'Demo Location'
         }
       });
     }
     
     const existingUser = await prisma.user.findUnique({ where: { email: 'admin@demo.gov' } });
     if (existingUser) {
       await prisma.user.update({
         where: { email: 'admin@demo.gov' },
         data: { password: hashedPassword, authMethod: 'USERNAME_PASSWORD', role: 'BARANGAY_OFFICIAL', barangayId: barangay.id }
       });
       res.json({ success: true, message: 'Demo admin updated with password and barangay assignment' });
     } else {
       const user = await prisma.user.create({
         data: {
           email: 'admin@demo.gov',
           name: 'Demo Admin',
           password: hashedPassword,
           authMethod: 'USERNAME_PASSWORD',
           role: 'BARANGAY_OFFICIAL',
           barangayId: barangay.id
         }
       });
       res.json({ success: true, user, barangayId: barangay.id });
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