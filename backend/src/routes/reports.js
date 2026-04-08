//Author - Tanmay
const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports — List all reports (admin sees all, users see their own)
router.get("/", authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === "admin") {
      query = `
        SELECT r.*, u.username, u.email
        FROM user_reports r
        JOIN users u ON r.user_id = u.user_id
        ORDER BY r.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT r.*, u.username
        FROM user_reports r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
      `;
      params = [req.user.user_id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("List reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// POST /api/reports — Submit a new report
router.post("/", authenticate, async (req, res) => {
  try {
    const { disaster_number, title, description, severity } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await pool.query(
      `INSERT INTO user_reports (user_id, disaster_number, title, description, severity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.user_id, disaster_number || null, title, description || null, severity || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

// PUT /api/reports/:id/status — Update report status (admin only)
router.put("/:id/status", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "verified", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE user_reports SET status = $1 WHERE report_id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update report error:", err);
    res.status(500).json({ error: "Failed to update report" });
  }
});

// DELETE /api/reports/:id — Delete a report
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const where = req.user.role === "admin"
      ? "report_id = $1"
      : "report_id = $1 AND user_id = $2";
    const params = req.user.role === "admin"
      ? [req.params.id]
      : [req.params.id, req.user.user_id];

    const result = await pool.query(
      `DELETE FROM user_reports WHERE ${where} RETURNING report_id`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("Delete report error:", err);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

module.exports = router;
