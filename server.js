const express = require("express");
const cors = require("cors");
const path = require("path");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Science For Life API is running", status: "OK" });
});

app.get("/__envcheck", (req, res) => {
  res.json({
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    HAS_DB_PASSWORD: !!process.env.DB_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  });
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

app.listen(PORT);
