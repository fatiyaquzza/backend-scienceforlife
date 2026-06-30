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

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
