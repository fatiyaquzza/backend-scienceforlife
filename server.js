const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/database");
const { apiCatalog, totalEndpointCount } = require("./docs/apiCatalog");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
const startedAt = Date.now();
const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://ilmanainitiative.com",
  "https://www.ilmanainitiative.com",
];
const clientOrigins = new Set(
  (process.env.CLIENT_ORIGINS || DEFAULT_CLIENT_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const formatUptime = () => {
  const totalSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}j ${minutes}m ${seconds}dtk`;
};

const checkDatabase = async () => {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
};

const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://ilmanainitiative.com https://www.ilmanainitiative.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ")
  );

  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
};

const rateLimitMaps = [];

const createRateLimit = ({ windowMs, max }) => {
  const hits = new Map();
  rateLimitMaps.push(hits);

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || req.socket.remoteAddress}:${req.method}:${req.path}`;
    const hit = hits.get(key);

    if (!hit || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    hit.count += 1;
    if (hit.count > max) {
      const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: "Terlalu banyak percobaan. Coba lagi nanti.",
      });
    }

    next();
  };
};

// Cleanup expired rate-limit entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  rateLimitMaps.forEach((map) => {
    for (const [key, entry] of map) {
      if (entry.resetAt <= now) map.delete(key);
    }
  });
}, 5 * 60 * 1000).unref();

const authRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const contactRateLimit = createRateLimit({ windowMs: 10 * 60 * 1000, max: 10 });
const postOnly = (middleware) => (req, res, next) =>
  req.method === "POST" ? middleware(req, res, next) : next();

// Middleware
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || clientOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/api/auth/login", postOnly(authRateLimit));
app.use("/api/auth/register", postOnly(authRateLimit));
app.use("/api/contact/feedback", postOnly(contactRateLimit));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadDir));

// Warn on startup if upload dir doesn't exist
const fs = require("fs");
if (!fs.existsSync(uploadDir)) {
  console.warn(`[ILMANA] Upload dir not found: ${uploadDir}. Set UPLOAD_DIR in .env or ensure the directory exists.`);
}

app.get("/", async (req, res) => {
  const dbHealthy = await checkDatabase();
  const quickLinks = [
    { method: "GET", path: "/api/health", auth: "Public", summary: "Health check JSON untuk load balancer atau monitor." },
    { method: "GET", path: "/docs", auth: "Public", summary: "Dokumentasi visual seluruh endpoint aktif." },
    { method: "POST", path: "/api/upload-image", auth: "Admin", summary: "Upload gambar isi materi dan soal." },
  ];

  res.render("index", {
    dbHealthy,
    environment: process.env.NODE_ENV || "development",
    uptime: formatUptime(),
    totalEndpointCount,
    quickLinks,
    now: new Date().toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: process.env.TZ || "Asia/Jakarta",
    }),
  });
});

app.get("/docs", (req, res) => {
  res.render("docs", {
    apiCatalog,
    totalEndpointCount,
  });
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/modules", require("./routes/moduleRoutes"));
app.use("/api/submodules", require("./routes/subModuleRoutes"));
app.use("/api/materials", require("./routes/materialRoutes"));
app.use("/api/questions", require("./routes/questionRoutes"));
app.use("/api/progress", require("./routes/userProgressRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ai", require("./routes/aiChatRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api", require("./routes/uploadRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Ilmana API is running", status: "OK" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("Only")) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ILMANA backend listening on port ${PORT}`);
});
