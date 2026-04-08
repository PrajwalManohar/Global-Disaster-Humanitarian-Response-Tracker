//Author - Aditya
const express = require("express");
const pool = require("../config/db");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/disasters — List with pagination, sorting, filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      sort = "declaration_date",
      order = "desc",
      incident_type,
      state,
      declaration_type,
      start_date,
      end_date,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const allowedSorts = ["declaration_date", "disaster_number", "declaration_title"];
    const sortCol = allowedSorts.includes(sort) ? sort : "declaration_date";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

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

    const countQuery = `
      SELECT COUNT(*) FROM disasters d
      JOIN incident_types it ON d.incident_type_id = it.incident_type_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT d.disaster_number, d.declaration_type, d.declaration_title,
             d.declaration_date, d.incident_begin_date, d.incident_end_date,
             d.closeout_date, d.ih_program, d.ia_program, d.pa_program, d.hm_program,
             it.incident_type_name, it.category AS incident_category,
             dt.type_name AS declaration_type_name
      FROM disasters d
      JOIN incident_types it ON d.incident_type_id = it.incident_type_id
      JOIN declaration_types dt ON d.declaration_type = dt.type_code
      ${whereClause}
      ORDER BY d.${sortCol} ${sortOrder}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limitNum, offset);

    const dataResult = await pool.query(dataQuery, params);

    res.json({
      data: dataResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("List disasters error:", err);
    res.status(500).json({ error: "Failed to fetch disasters" });
  }
});

// GET /api/disasters/:id — Single disaster with areas
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const disaster = await pool.query(
      `SELECT d.*, it.incident_type_name, it.category AS incident_category,
              dt.type_name AS declaration_type_name, dt.description AS declaration_type_desc
       FROM disasters d
       JOIN incident_types it ON d.incident_type_id = it.incident_type_id
       JOIN declaration_types dt ON d.declaration_type = dt.type_code
       WHERE d.disaster_number = $1 AND d.is_deleted = false`,
      [id]
    );

    if (disaster.rows.length === 0) {
      return res.status(404).json({ error: "Disaster not found" });
    }

    const areas = await pool.query(
      `SELECT da.*, s.state_abbrev, s.state_name
       FROM disaster_areas da
       JOIN states s ON da.state_code = s.state_code
       WHERE da.disaster_number = $1
       ORDER BY s.state_name, da.designated_area`,
      [id]
    );

    res.json({
      ...disaster.rows[0],
      areas: areas.rows,
    });
  } catch (err) {
    console.error("Get disaster error:", err);
    res.status(500).json({ error: "Failed to fetch disaster" });
  }
});

// POST /api/disasters — Create new disaster
router.post("/", authenticate, authorize("editor", "admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      disaster_number, declaration_type, incident_type_name,
      declaration_title, declaration_date, incident_begin_date,
      incident_end_date, closeout_date,
      ih_program, ia_program, pa_program, hm_program,
      areas,
    } = req.body;

    if (!disaster_number || !declaration_type || !incident_type_name || !declaration_title || !declaration_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await client.query("BEGIN");

    // Resolve incident type (create if new)
    let typeResult = await client.query(
      "SELECT incident_type_id FROM incident_types WHERE incident_type_name = $1",
      [incident_type_name]
    );
    let incident_type_id;
    if (typeResult.rows.length === 0) {
      const ins = await client.query(
        "INSERT INTO incident_types (incident_type_name, category) VALUES ($1, 'Other') RETURNING incident_type_id",
        [incident_type_name]
      );
      incident_type_id = ins.rows[0].incident_type_id;
    } else {
      incident_type_id = typeResult.rows[0].incident_type_id;
    }

    const result = await client.query(
      `INSERT INTO disasters (
        disaster_number, declaration_type, incident_type_id, declaration_title,
        declaration_date, incident_begin_date, incident_end_date, closeout_date,
        ih_program, ia_program, pa_program, hm_program
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        disaster_number, declaration_type, incident_type_id, declaration_title,
        declaration_date, incident_begin_date || null, incident_end_date || null,
        closeout_date || null,
        ih_program || false, ia_program || false, pa_program || false, hm_program || false,
      ]
    );

    if (areas && Array.isArray(areas)) {
      for (const area of areas) {
        await client.query(
          `INSERT INTO disaster_areas (disaster_number, state_code, fips_county_code, designated_area, place_code)
           VALUES ($1, $2, $3, $4, $5)`,
          [disaster_number, area.state_code, area.fips_county_code || null, area.designated_area || null, area.place_code || null]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Disaster number already exists" });
    }
    console.error("Create disaster error:", err);
    res.status(500).json({ error: "Failed to create disaster" });
  } finally {
    client.release();
  }
});

// PUT /api/disasters/:id — Update disaster
router.put("/:id", authenticate, authorize("editor", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      declaration_type, incident_type_name,
      declaration_title, declaration_date, incident_begin_date,
      incident_end_date, closeout_date,
      ih_program, ia_program, pa_program, hm_program,
    } = req.body;

    let incident_type_id;
    if (incident_type_name) {
      const typeResult = await pool.query(
        "SELECT incident_type_id FROM incident_types WHERE incident_type_name = $1",
        [incident_type_name]
      );
      if (typeResult.rows.length === 0) {
        return res.status(400).json({ error: `Unknown incident type: ${incident_type_name}` });
      }
      incident_type_id = typeResult.rows[0].incident_type_id;
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const addField = (name, value) => {
      if (value !== undefined) {
        fields.push(`${name} = $${idx++}`);
        values.push(value);
      }
    };

    addField("declaration_type", declaration_type);
    addField("incident_type_id", incident_type_id);
    addField("declaration_title", declaration_title);
    addField("declaration_date", declaration_date);
    addField("incident_begin_date", incident_begin_date);
    addField("incident_end_date", incident_end_date);
    addField("closeout_date", closeout_date);
    addField("ih_program", ih_program);
    addField("ia_program", ia_program);
    addField("pa_program", pa_program);
    addField("hm_program", hm_program);

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE disasters SET ${fields.join(", ")} WHERE disaster_number = $${idx} AND is_deleted = false RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Disaster not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update disaster error:", err);
    res.status(500).json({ error: "Failed to update disaster" });
  }
});

// DELETE /api/disasters/:id — Soft delete (admin only)
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE disasters SET is_deleted = true WHERE disaster_number = $1 AND is_deleted = false RETURNING disaster_number",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Disaster not found" });
    }
    res.json({ message: "Disaster deleted successfully", disaster_number: parseInt(id) });
  } catch (err) {
    console.error("Delete disaster error:", err);
    res.status(500).json({ error: "Failed to delete disaster" });
  }
});

module.exports = router;
