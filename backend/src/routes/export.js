const express = require("express");
const { Parser } = require("json2csv");
const pool = require("../config/db");

const router = express.Router();

// GET /api/export/csv — Export filtered disasters as CSV
router.get("/csv", async (req, res) => {
  try {
    const { incident_type, state, declaration_type, start_date, end_date, search } = req.query;

    let where = ["d.is_deleted = false"];
    let params = [];
    let paramIdx = 1;

    if (incident_type) {
      where.push(`it.incident_type_name = $${paramIdx++}`);
      params.push(incident_type);
    }
    if (declaration_type) {
      where.push(`d.declaration_type = $${paramIdx++}`);
      params.push(declaration_type);
    }
    if (start_date) {
      where.push(`d.declaration_date >= $${paramIdx++}`);
      params.push(start_date);
    }
    if (end_date) {
      where.push(`d.declaration_date <= $${paramIdx++}`);
      params.push(end_date);
    }
    if (search) {
      where.push(`d.declaration_title ILIKE $${paramIdx++}`);
      params.push(`%${search}%`);
    }
    if (state) {
      where.push(`EXISTS (
        SELECT 1 FROM disaster_areas da2
        JOIN states s2 ON da2.state_code = s2.state_code
        WHERE da2.disaster_number = d.disaster_number
        AND s2.state_abbrev = $${paramIdx++}
      )`);
      params.push(state.toUpperCase());
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(`
      SELECT d.disaster_number, dt.type_name AS declaration_type,
             it.incident_type_name, d.declaration_title,
             d.declaration_date, d.incident_begin_date, d.incident_end_date,
             d.closeout_date, d.ih_program, d.ia_program, d.pa_program, d.hm_program
      FROM disasters d
      JOIN incident_types it ON d.incident_type_id = it.incident_type_id
      JOIN declaration_types dt ON d.declaration_type = dt.type_code
      ${whereClause}
      ORDER BY d.declaration_date DESC
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No data to export" });
    }

    const parser = new Parser({
      fields: [
        "disaster_number", "declaration_type", "incident_type_name",
        "declaration_title", "declaration_date", "incident_begin_date",
        "incident_end_date", "closeout_date",
        "ih_program", "ia_program", "pa_program", "hm_program",
      ],
    });
    const csv = parser.parse(result.rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=disasters_export.csv");
    res.send(csv);
  } catch (err) {
    console.error("Export CSV error:", err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

module.exports = router;
