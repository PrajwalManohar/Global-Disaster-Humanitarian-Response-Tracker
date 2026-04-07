const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET /api/analytics/by-type — Disaster count by incident type
router.get("/by-type", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT it.incident_type_name, it.category, COUNT(*) AS total
      FROM disasters d
      JOIN incident_types it ON d.incident_type_id = it.incident_type_id
      WHERE d.is_deleted = false
      GROUP BY it.incident_type_name, it.category
      ORDER BY total DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Analytics by-type error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/by-state — Disaster count by state (for heatmap)
router.get("/by-state", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.state_abbrev, s.state_name, COUNT(DISTINCT da.disaster_number) AS disaster_count
      FROM disaster_areas da
      JOIN states s ON da.state_code = s.state_code
      JOIN disasters d ON da.disaster_number = d.disaster_number
      WHERE d.is_deleted = false
      GROUP BY s.state_abbrev, s.state_name
      ORDER BY disaster_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Analytics by-state error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/by-year — Disaster count by year (timeline)
router.get("/by-year", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(YEAR FROM declaration_date)::INTEGER AS year,
             COUNT(*) AS total
      FROM disasters
      WHERE is_deleted = false
      GROUP BY year
      ORDER BY year
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Analytics by-year error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/by-month — Seasonal pattern
router.get("/by-month", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(MONTH FROM declaration_date)::INTEGER AS month,
             COUNT(*) AS total
      FROM disasters
      WHERE is_deleted = false
      GROUP BY month
      ORDER BY month
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Analytics by-month error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/programs — Assistance program distribution
router.get("/programs", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ih_program) AS ih_total,
        COUNT(*) FILTER (WHERE ia_program) AS ia_total,
        COUNT(*) FILTER (WHERE pa_program) AS pa_total,
        COUNT(*) FILTER (WHERE hm_program) AS hm_total,
        COUNT(*) AS total_disasters
      FROM disasters
      WHERE is_deleted = false
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Analytics programs error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/by-decade — Disaster count grouped by decade
router.get("/by-decade", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT (EXTRACT(YEAR FROM declaration_date)::INTEGER / 10 * 10) AS decade,
             COUNT(*) AS total
      FROM disasters
      WHERE is_deleted = false
      GROUP BY decade
      ORDER BY decade
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Analytics by-decade error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/top-states — Top N states by disaster count
router.get("/top-states", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const result = await pool.query(`
      SELECT s.state_abbrev, s.state_name,
             COUNT(DISTINCT da.disaster_number) AS disaster_count,
             MODE() WITHIN GROUP (ORDER BY it.incident_type_name) AS most_common_type
      FROM disaster_areas da
      JOIN states s ON da.state_code = s.state_code
      JOIN disasters d ON da.disaster_number = d.disaster_number
      JOIN incident_types it ON d.incident_type_id = it.incident_type_id
      WHERE d.is_deleted = false
      GROUP BY s.state_abbrev, s.state_name
      ORDER BY disaster_count DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error("Analytics top-states error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/analytics/summary — Quick summary stats
router.get("/summary", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_disasters,
        COUNT(DISTINCT d.incident_type_id) AS total_types,
        MIN(declaration_date) AS earliest_date,
        MAX(declaration_date) AS latest_date,
        (SELECT COUNT(DISTINCT state_code) FROM disaster_areas) AS states_affected
      FROM disasters d
      WHERE d.is_deleted = false
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

module.exports = router;
