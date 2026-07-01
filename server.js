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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.get("/api/debug-upload", (req, res) => {
  const currentDir = path.join(__dirname, "uploads");
  const testFile = path.join(uploadDir, "images", "content-1782887663666-72909869.jpeg");
  const testFileOld = path.join(currentDir, "images", "content-1782887663666-72909869.jpeg");
  let testFileFound = false;
  let testFileStat = null;
  try {
    if (fs.existsSync(testFile)) {
      testFileFound = true;
      testFileStat = fs.statSync(testFile);
    }
  } catch (e) {
    testFileStat = { error: e.message };
  }
  let listing = [];
  try {
    if (fs.existsSync(path.join(uploadDir, "images"))) {
      listing = fs.readdirSync(path.join(uploadDir, "images")).slice(0, 20);
    }
  } catch (e) {
    listing = [{ error: e.message }];
  }
  res.json({
    uploadDirEnv: process.env.UPLOAD_DIR || "(not set)",
    uploadDirUsed: uploadDir,
    uploadDirExists: fs.existsSync(uploadDir),
    testFile: testFile,
    testFileFound,
    testFileStat,
    testFileOld,
    testFileOldExists: fs.existsSync(testFileOld),
    imagesDirContent: listing,
    oldPath: currentDir,
    oldPathExists: fs.existsSync(currentDir),
    cwd: process.cwd(),
    dirname: __dirname,
  });
});

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
