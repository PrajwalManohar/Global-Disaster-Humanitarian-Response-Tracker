//Author - Tanmay
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const disasterRoutes = require("./routes/disasters");
const analyticsRoutes = require("./routes/analytics");
const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const exportRoutes = require("./routes/export");
const lookupRoutes = require("./routes/lookup");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.use("/api/disasters", disasterRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/lookup", lookupRoutes);

app.get("/api/health", async (_req, res) => {
  const pool = require("./config/db");
  try {
    const result = await pool.query("SELECT NOW() AS server_time, COUNT(*) AS disaster_count FROM disasters WHERE is_deleted = false");
    res.json({ status: "ok", ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
