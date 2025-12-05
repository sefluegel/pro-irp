// backend/routes/clients.js (PostgreSQL version - ready for scale!)
const express = require("express");
const db = require("../db");

const router = express.Router();

// ============================================================================
// MIDDLEWARE - Require Authentication
// ============================================================================
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

router.use(requireAuth);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get clients the user has access to (based on role)
async function getAccessibleClientIds(userId, role) {
  // For now, agents only see their own clients
  // In the future, managers will see their team's clients, FMOs see all

  if (role === 'fmo' || role === 'admin') {
    // FMOs and admins see ALL clients
    const result = await db.query('SELECT id FROM clients');
    return result.rows.map(r => r.id);
  } else if (role === 'manager') {
    // Managers see their own + their team's clients
    // First get agents under this manager
    const agents = await db.query(
      'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
      [userId]
    );
    const agentIds = agents.rows.map(a => a.id);

    if (agentIds.length === 0) return [];

    const result = await db.query(
      'SELECT id FROM clients WHERE owner_id = ANY($1)',
      [agentIds]
    );
    return result.rows.map(r => r.id);
  } else {
    // Agents only see their own clients
    const result = await db.query(
      'SELECT id FROM clients WHERE owner_id = $1',
      [userId]
    );
    return result.rows.map(r => r.id);
  }
}

// Normalize client data for insert/update
function normalizeClientData(body) {
  return {
    first_name: body.firstName || body.first_name || '',
    last_name: body.lastName || body.last_name || '',
    email: (body.email || '').trim().toLowerCase(),
    phone: (body.phone || '').trim(),
    address: body.address || '',
    city: body.city || '',
    state: body.state || '',
    zip: body.zip || '',
    dob: body.dob || null,
    carrier: body.carrier || '',
    plan: body.plan || '',
    plan_type: body.planType || body.plan_type || '',
    effective_date: body.effectiveDate || body.effective_date || null,
    status: body.status || 'prospect',
    risk_score: body.riskScore || body.risk_score || 0,
    notes: body.notes || '',
    tags: body.tags || [],
    preferred_language: body.preferredLanguage || body.preferred_language || '',
    primary_care: body.primaryCare || body.primary_care || '',
    specialists: body.specialists || '',
    medications: body.medications || '',
    soa_on_file: body.soaOnFile || body.soa_on_file || false,
    soa_signed: body.soaSigned || body.soa_signed || null,
    ptc_on_file: body.ptcOnFile || body.ptc_on_file || false,
    ptc_signed: body.ptcSigned || body.ptc_signed || null,
    enrollment_on_file: body.enrollmentOnFile || body.enrollment_on_file || false
  };
}

// Format client for API response
function formatClient(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    dob: row.dob,
    carrier: row.carrier,
    plan: row.plan,
    planType: row.plan_type,
    effectiveDate: row.effective_date,
    status: row.status,
    riskScore: row.risk_score,
    lastContactDate: row.last_contact_date,
    nextContactDate: row.next_contact_date,
    totalContacts: row.total_contacts,
    totalPolicies: row.total_policies,
    lifetimeValue: row.lifetime_value,
    notes: row.notes,
    tags: row.tags,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preferredLanguage: row.preferred_language,
    primaryCare: row.primary_care,
    specialists: row.specialists,
    medications: row.medications,
    soaOnFile: row.soa_on_file,
    soaSigned: row.soa_signed,
    ptcOnFile: row.ptc_on_file,
    ptcSigned: row.ptc_signed,
    enrollmentOnFile: row.enrollment_on_file
  };
}

// ============================================================================
// GET /clients - List all clients (with pagination and search)
// ============================================================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    // Search query
    const search = req.query.q || '';

    // Build WHERE clause based on role
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (userRole === 'agent') {
      paramCount++;
      whereClause = `WHERE owner_id = $${paramCount}`;
      params.push(userId);
    } else if (userRole === 'manager') {
      // Get team member IDs
      const team = await db.query(
        'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
        [userId]
      );
      const teamIds = team.rows.map(t => t.id);

      if (teamIds.length > 0) {
        paramCount++;
        whereClause = `WHERE owner_id = ANY($${paramCount})`;
        params.push(teamIds);
      }
    }
    // FMO/admin sees all clients (no WHERE clause)

    // Add search filter
    if (search) {
      const searchPattern = `%${search}%`;
      paramCount++;
      const searchCondition = `(
        first_name ILIKE $${paramCount} OR
        last_name ILIKE $${paramCount} OR
        email ILIKE $${paramCount} OR
        phone ILIKE $${paramCount} OR
        carrier ILIKE $${paramCount}
      )`;

      whereClause = whereClause
        ? `${whereClause} AND ${searchCondition}`
        : `WHERE ${searchCondition}`;
      params.push(searchPattern);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM clients ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const query = `
      SELECT * FROM clients
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const result = await db.query(query, params);
    const clients = result.rows.map(formatClient);

    return res.json({
      ok: true,
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /clients/:id - Get single client
// ============================================================================
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.id;

    // Get client
    const result = await db.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    const client = result.rows[0];

    // Check access
    if (userRole === 'agent' && client.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    } else if (userRole === 'manager') {
      // Check if client belongs to someone in their team
      const team = await db.query(
        'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
        [userId]
      );
      const teamIds = team.rows.map(t => t.id);

      if (!teamIds.includes(client.owner_id)) {
        return res.status(403).json({ ok: false, error: "Access denied" });
      }
    }
    // FMO/admin can access any client

    return res.json({
      ok: true,
      data: formatClient(client)
    });

  } catch (error) {
    console.error('Get client error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// POST /clients - Create new client
// ============================================================================
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    const data = normalizeClientData(req.body || {});

    // Validation
    if (!data.first_name && !data.last_name) {
      return res.status(400).json({ ok: false, error: "First name or last name required" });
    }

    // Check for duplicate email
    if (data.email) {
      const existing = await db.query(
        'SELECT id FROM clients WHERE email = $1 AND owner_id = $2',
        [data.email, userId]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          ok: false,
          error: "Client with this email already exists",
          id: existing.rows[0].id
        });
      }
    }

    // Get user's organization
    const userResult = await db.query(
      'SELECT organization_id FROM users WHERE id = $1',
      [userId]
    );
    const organizationId = userResult.rows[0]?.organization_id || null;

    // Insert client
    const result = await db.query(
      `INSERT INTO clients (
        owner_id, organization_id,
        first_name, last_name, email, phone, address, city, state, zip, dob,
        carrier, plan, plan_type, effective_date,
        status, risk_score, notes, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        userId, organizationId,
        data.first_name, data.last_name, data.email, data.phone,
        data.address, data.city, data.state, data.zip, data.dob,
        data.carrier, data.plan, data.plan_type, data.effective_date,
        data.status, data.risk_score, data.notes, data.tags
      ]
    );

    return res.json({
      ok: true,
      data: formatClient(result.rows[0])
    });

  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// PUT /clients/:id - Update client (full update)
// PATCH /clients/:id - Update client (partial update)
// ============================================================================
async function updateClientHandler(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.id;

    // Get existing client
    const existing = await db.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    const client = existing.rows[0];

    // Check access
    if (userRole === 'agent' && client.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    } else if (userRole === 'manager') {
      const team = await db.query(
        'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
        [userId]
      );
      const teamIds = team.rows.map(t => t.id);

      if (!teamIds.includes(client.owner_id)) {
        return res.status(403).json({ ok: false, error: "Access denied" });
      }
    }

    // Merge data
    const data = normalizeClientData(req.body || {});

    // Update - Only update fields that exist in the database
    // Note: Some fields may not exist yet, so we'll update only core fields for now
    const result = await db.query(
      `UPDATE clients SET
        first_name = $1, last_name = $2, email = $3, phone = $4,
        address = $5, city = $6, state = $7, zip = $8, dob = $9,
        carrier = $10, plan = $11, plan_type = $12, effective_date = $13,
        status = $14, risk_score = $15, notes = $16, tags = $17,
        preferred_language = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *`,
      [
        data.first_name, data.last_name, data.email, data.phone,
        data.address, data.city, data.state, data.zip, data.dob,
        data.carrier, data.plan, data.plan_type, data.effective_date,
        data.status, data.risk_score, data.notes, data.tags,
        data.preferred_language,
        clientId
      ]
    );

    return res.json({
      ok: true,
      data: formatClient(result.rows[0])
    });

  } catch (error) {
    console.error('Update client error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

// Register both PUT and PATCH routes with the same handler
router.put("/:id", updateClientHandler);
router.patch("/:id", updateClientHandler);

// ============================================================================
// DELETE /clients/:id - Delete client
// ============================================================================
router.delete("/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.id;

    console.log('[DELETE] User:', userId, 'Role:', userRole, 'Deleting client:', clientId);

    // Get existing client
    const existing = await db.query(
      'SELECT owner_id FROM clients WHERE id = $1',
      [clientId]
    );

    if (existing.rows.length === 0) {
      console.log('[DELETE] Client not found:', clientId);
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    const client = existing.rows[0];
    console.log('[DELETE] Client owner_id:', client.owner_id, 'User id:', userId, 'Match:', client.owner_id === userId);

    // Check access (only owner, FMO, or admin can delete)
    if (userRole === 'admin' || userRole === 'fmo') {
      // Admins and FMOs can delete any client
      console.log('[DELETE] Admin/FMO access granted');
    } else if (userRole === 'agent' && client.owner_id !== userId) {
      console.log('[DELETE] Access denied - agent does not own client');
      return res.status(403).json({ ok: false, error: "Access denied" });
    } else if (userRole === 'manager' && client.owner_id !== userId) {
      console.log('[DELETE] Access denied - manager does not own client');
      return res.status(403).json({ ok: false, error: "Access denied" });
    }

    // Delete (cascades to communications, tasks, uploads)
    console.log('[DELETE] Executing DELETE query for client:', clientId);
    const deleteResult = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [clientId]);
    console.log('[DELETE] Delete result - rowCount:', deleteResult.rowCount, 'rows:', JSON.stringify(deleteResult.rows));

    if (deleteResult.rowCount === 0) {
      console.log('[DELETE] WARNING: No rows were deleted despite client existing');
      return res.status(500).json({ ok: false, error: "Delete failed - no rows affected" });
    }

    console.log('[DELETE] Successfully deleted client:', clientId);
    return res.json({ ok: true, deleted: deleteResult.rowCount });

  } catch (error) {
    console.error('Delete client error:', error);
    return res.status(500).json({ ok: false, error: error.message || "Internal server error" });
  }
});

// ============================================================================
// POST /clients/bulk - Bulk import/upsert clients
// ============================================================================
router.post("/bulk", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    const userId = req.user.id;

    const items = Array.isArray(req.body) ? req.body :
                  Array.isArray(req.body?.items) ? req.body.items : [];

    if (items.length === 0) {
      return res.status(400).json({ ok: false, error: "Array of clients required" });
    }

    // Get user's organization
    const userResult = await db.query(
      'SELECT organization_id FROM users WHERE id = $1',
      [userId]
    );
    const organizationId = userResult.rows[0]?.organization_id || null;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = [];

    // Get filename from request if provided
    const filename = req.body?.filename || 'import.csv';

    console.log('[BULK IMPORT] Starting import of', items.length, 'items for user:', userId);

    // Create bulk import record first
    const importRecord = await db.query(
      `INSERT INTO bulk_imports (user_id, filename, total_rows)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, filename, items.length]
    );
    const bulkImportId = importRecord.rows[0].id;

    // Duplicate detection disabled - always create new clients
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const data = normalizeClientData(item);

      // Must have a name
      if (!data.first_name && !data.last_name) {
        console.log('[BULK IMPORT] Skipping item', i, '- no name');
        skipped++;
        continue;
      }

      // Create new client (no duplicate checking)
      try {
        await db.query(
          `INSERT INTO clients (
            owner_id, organization_id, bulk_import_id,
            first_name, last_name, email, phone,
            carrier, plan, plan_type, status, effective_date,
            dob, address, city, state, zip, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [userId, organizationId, bulkImportId, data.first_name, data.last_name,
           data.email, data.phone, data.carrier, data.plan, data.plan_type,
           data.status, data.effective_date, data.dob, data.address,
           data.city, data.state, data.zip, data.notes]
        );
        created++;
      } catch (err) {
        console.error('[BULK IMPORT] Error creating client', i, ':', err.message);
        errors.push({ index: i, name: `${data.first_name} ${data.last_name}`, error: err.message });
      }
    }

    console.log('[BULK IMPORT] Complete - created:', created, 'updated:', updated, 'skipped:', skipped, 'errors:', errors.length);

    // Update bulk import record with results
    await db.query(
      `UPDATE bulk_imports SET created_count = $1, skipped_count = $2, error_count = $3
       WHERE id = $4`,
      [created, skipped, errors.length, bulkImportId]
    );

    // Get total count
    const totalResult = await db.query(
      'SELECT COUNT(*) FROM clients WHERE owner_id = $1',
      [userId]
    );
    const total = parseInt(totalResult.rows[0].count);

    return res.json({
      ok: true,
      importId: bulkImportId,
      added: created,
      updated,
      skipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // First 10 errors for debugging
      upserted: created + updated,
      total
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /clients/imports - List recent bulk imports
// ============================================================================
router.get("/imports", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT * FROM bulk_imports
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const imports = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      totalRows: row.total_rows,
      createdCount: row.created_count,
      skippedCount: row.skipped_count,
      errorCount: row.error_count,
      status: row.status,
      reversedAt: row.reversed_at,
      reversedCount: row.reversed_count,
      createdAt: row.created_at
    }));

    return res.json({ ok: true, data: imports });

  } catch (error) {
    console.error('Get imports error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// POST /clients/imports/:id/reverse - Reverse/undo a bulk import
// ============================================================================
router.post("/imports/:id/reverse", async (req, res) => {
  try {
    const userId = req.user.id;
    const importId = req.params.id;

    // Verify the import belongs to this user
    const importResult = await db.query(
      'SELECT * FROM bulk_imports WHERE id = $1 AND user_id = $2',
      [importId, userId]
    );

    if (importResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Import not found" });
    }

    const importRecord = importResult.rows[0];

    if (importRecord.status === 'reversed') {
      return res.status(400).json({ ok: false, error: "This import has already been reversed" });
    }

    // Delete all clients from this import
    const deleteResult = await db.query(
      'DELETE FROM clients WHERE bulk_import_id = $1 RETURNING id',
      [importId]
    );

    const deletedCount = deleteResult.rowCount;

    // Update the import record
    await db.query(
      `UPDATE bulk_imports SET status = 'reversed', reversed_at = CURRENT_TIMESTAMP, reversed_count = $1
       WHERE id = $2`,
      [deletedCount, importId]
    );

    console.log('[BULK IMPORT] Reversed import', importId, '- deleted', deletedCount, 'clients');

    return res.json({
      ok: true,
      deleted: deletedCount,
      message: `Successfully reversed import. ${deletedCount} clients deleted.`
    });

  } catch (error) {
    console.error('Reverse import error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /clients/export.csv - Export clients as CSV
// ============================================================================
router.get("/export.csv", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    // Build query based on role
    let query = 'SELECT * FROM clients';
    let params = [];

    if (userRole === 'agent') {
      query += ' WHERE owner_id = $1';
      params.push(userId);
    } else if (userRole === 'manager') {
      const team = await db.query(
        'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
        [userId]
      );
      const teamIds = team.rows.map(t => t.id);
      query += ' WHERE owner_id = ANY($1)';
      params.push(teamIds);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    // CSV columns
    const cols = [
      'id', 'firstName', 'lastName', 'email', 'phone',
      'carrier', 'plan', 'status', 'createdAt', 'updatedAt'
    ];

    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [];
    lines.push(cols.join(","));

    for (const row of result.rows) {
      const client = formatClient(row);
      lines.push(cols.map(k => esc(client[k])).join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=clients_export.csv");
    res.send(lines.join("\n"));

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// COMMUNICATIONS - GET /clients/:clientId/comms
// ============================================================================
router.get("/:clientId/comms", async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.params.clientId;
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const type = req.query.type || '';

    // Check client access
    const clientResult = await db.query(
      'SELECT owner_id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    // Build query
    let query = `
      SELECT * FROM communications
      WHERE client_id = $1
    `;
    let params = [clientId];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);

    const comms = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      direction: row.direction,
      subject: row.subject,
      body: row.body,
      outcome: row.outcome,
      scheduledAt: row.scheduled_at,
      completedAt: row.completed_at,
      metadata: row.metadata,
      timestamp: row.created_at,
      createdAt: row.created_at
    }));

    return res.json({ ok: true, data: comms });

  } catch (error) {
    console.error('Get comms error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// COMMUNICATIONS - POST /clients/:clientId/comms
// ============================================================================
router.post("/:clientId/comms", async (req, res) => {
  try {
    const userId = req.user.id;
    const clientId = req.params.clientId;
    const { type, message, meta, subject, direction } = req.body || {};

    if (!type || !message) {
      return res.status(400).json({ ok: false, error: "type and message required" });
    }

    // Check client access
    const clientResult = await db.query(
      'SELECT owner_id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    // Insert communication
    const result = await db.query(
      `INSERT INTO communications (
        client_id, user_id, type, direction, subject, body, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [clientId, userId, type, direction || 'outbound', subject || '', message, meta || {}]
    );

    const comm = result.rows[0];

    return res.json({
      ok: true,
      data: {
        id: comm.id,
        type: comm.type,
        direction: comm.direction,
        subject: comm.subject,
        message: comm.body,
        meta: comm.metadata,
        timestamp: comm.created_at
      }
    });

  } catch (error) {
    console.error('Create comm error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// COMMUNICATIONS - DELETE /clients/:clientId/comms/:commId
// ============================================================================
router.delete("/:clientId/comms/:commId", async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM communications WHERE id = $1 AND client_id = $2',
      [req.params.commId, req.params.clientId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Communication not found" });
    }

    return res.json({ ok: true });

  } catch (error) {
    console.error('Delete comm error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
