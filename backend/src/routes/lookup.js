const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET /api/lookup/incident-types — All incident types for dropdowns
router.get("/incident-types", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT incident_type_id, incident_type_name, category FROM incident_types ORDER BY incident_type_name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch incident types" });
  }
});

// GET /api/lookup/states — All states for dropdowns
router.get("/states", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT state_code, state_abbrev, state_name FROM states ORDER BY state_name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

// GET /api/lookup/declaration-types — Declaration types for dropdowns
router.get("/declaration-types", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT type_code, type_name, description FROM declaration_types ORDER BY type_code"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch declaration types" });
  }
});

module.exports = router;
