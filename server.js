const express = require("express");
const cors = require("cors");
const path = require("path");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const pool = require("./config/database");
const { apiCatalog, totalEndpointCount } = require("./docs/apiCatalog");
const { classifyError } = require("./utils/httpError");
const { assertJwtSecretUsable } = require("./utils/jwtSecret");

// Dicek sebelum apa pun dilayani. JWT_SECRET yang lemah berarti siapa pun bisa
// menandatangani token dengan role admin, jadi lebih baik aplikasi berhenti
// sekarang dengan pesan jelas daripada diam-diam menerima token palsu.
assertJwtSecretUsable(process.env.NODE_ENV, process.env.JWT_SECRET);

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
// Jumlah proxy yang mendahului aplikasi. Nilai ini menentukan sebanyak apa
// X-Forwarded-For dipercaya. Dulu selalu 1, padahal kalau aplikasinya dijalankan
// tanpa proxy (misalnya `npm run dev`) atau ada dua hop di depannya, req.ip
// diambil langsung dari header yang dikendalikan klien. Karena rate limiter
// memakai req.ip sebagai kunci, penyerang cukup mengacak header itu untuk
// melewati batas login/register/feedback tanpa batas.
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "1", 10);
app.set("trust proxy", Number.isInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 1);

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
app.use("/api/team", require("./routes/teamRoutes"));
app.use("/api", require("./routes/uploadRoutes"));

// Health check
app.get("/api/health", async (req, res) => {
  // Dulu endpoint ini selalu balas OK tanpa menyentuh database, jadi load
  // balancer akan melapor sehat padahal MySQL tidak bisa dijangkau. Health
  // check yang tidak memverifikasi apa pun hanya memindahkan masalah ke
  // request berikutnya.
  const dbHealthy = await checkDatabase();

  res.status(dbHealthy ? 200 : 503).json({
    message: dbHealthy ? "Ilmana API is running" : "Database unavailable",
    status: dbHealthy ? "OK" : "DEGRADED",
    uptime: formatUptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// 404 untuk path API yang tidak terdaftar. Harus SETELAH semua route di atas:
// kalau diletakkan lebih awal, handler ini akan menangkap /api/health juga.
// Tanpa handler ini Express membalas HTML 404 bawaan, yang tidak konsisten
// dengan seluruh respons API lain.
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});


// Error handling middleware
//
// Dua masalah lama yang diperbaiki di sini:
//
// 1. Dulu error ditangani dengan `err.message.includes("Only")`. Itu tebakan
//    rapuh: error apa pun yang kebetulan mengandung kata "Only" akan dibalas
//    400 sekaligus memantulkan pesan mentahnya. Sekarang penentuannya
//    berdasarkan kode terstruktur dari multer dan body parser, bukan tebakan
//    teks. Implementasinya ada di utils/httpError.js supaya bisa diuji
//    tanpa mem-boot server.
// 2. Handler ini tidak pernah menulis apa pun ke log, jadi tidak ada jejak
//    error di server. Sekarang setiap kegagalan tidak terduga dicatat.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const { status, message } = classifyError(err);
  console.error(`[ILMANA] ${req.method} ${req.originalUrl} -> ${status}:`, err?.stack || message);

  if (status < 500) {
    return res.status(status).json({ message });
  }

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === "development" ? { error: err?.message } : {}),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`ILMANA backend listening on port ${PORT}`);
});
