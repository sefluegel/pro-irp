// backend/routes/comms.js - PostgreSQL version with HIPAA audit logging
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
// HIPAA AUDIT LOGGING
// ============================================================================
async function logCommunicationAccess(userId, clientId, commId, action, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, client_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        clientId,
        action,
        'communication',
        commId,
        JSON.stringify(details),
        details.ip || null
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Check if user has access to client's communications
async function checkClientAccess(userId, userRole, clientId) {
  const clientResult = await db.query(
    'SELECT owner_id, organization_id FROM clients WHERE id = $1',
    [clientId]
  );

  if (clientResult.rows.length === 0) {
    return { hasAccess: false, reason: 'Client not found' };
  }

  const client = clientResult.rows[0];

  // Admin and FMO can access all communications
  if (userRole === 'admin' || userRole === 'fmo') {
    return { hasAccess: true };
  }

  // Agency role can access communications for clients in their organization
  if (userRole === 'agency') {
    const userResult = await db.query(
      'SELECT organization_id FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows[0]?.organization_id === client.organization_id) {
      return { hasAccess: true };
    }
  }

  // Agent can only access their own clients' communications
  if (userRole === 'agent' && client.owner_id === userId) {
    return { hasAccess: true };
  }

  // Manager can access their team's communications
  if (userRole === 'manager') {
    const teamResult = await db.query(
      'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
      [userId]
    );
    const teamIds = teamResult.rows.map(r => r.id);
    if (teamIds.includes(client.owner_id)) {
      return { hasAccess: true };
    }
  }

  return { hasAccess: false, reason: 'Access denied' };
}

// Format communication for API response
function formatCommunication(row) {
  return {
    id: row.id,
    type: row.type,
    direction: row.direction,
    subject: row.subject,
    body: row.body,
    message: row.body, // Alias for compatibility
    outcome: row.outcome,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    metadata: row.metadata,
    meta: row.metadata, // Alias for compatibility
    timestamp: row.created_at,
    createdAt: row.created_at,
    clientId: row.client_id,
    userId: row.user_id
  };
}

// ============================================================================
// GET /comms - List communications (with optional filters)
// ============================================================================
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.query.clientId || req.query.client_id;
    const type = req.query.type;
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));

    // Build query based on role and filters
    let query = `SELECT comm.* FROM communications comm`;
    let params = [];
    let paramCount = 0;
    let whereConditions = [];

    // Filter by client if specified
    if (clientId) {
      paramCount++;
      whereConditions.push(`comm.client_id = $${paramCount}`);
      params.push(clientId);

      // Check access to this specific client
      const access = await checkClientAccess(userId, userRole, clientId);
      if (!access.hasAccess) {
        return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
      }
    } else {
      // No specific client - filter by role
      if (userRole === 'agent') {
        // Agents see comms for their clients only
        query += ` JOIN clients c ON comm.client_id = c.id`;
        paramCount++;
        whereConditions.push(`c.owner_id = $${paramCount}`);
        params.push(userId);
      } else if (userRole === 'manager') {
        // Managers see their team's comms
        query += ` JOIN clients c ON comm.client_id = c.id`;
        const teamResult = await db.query(
          'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
          [userId]
        );
        const teamIds = teamResult.rows.map(t => t.id);
        paramCount++;
        whereConditions.push(`c.owner_id = ANY($${paramCount})`);
        params.push(teamIds);
      } else if (userRole === 'agency') {
        // Agency sees all comms in their org
        query += ` JOIN clients c ON comm.client_id = c.id`;
        const userResult = await db.query(
          'SELECT organization_id FROM users WHERE id = $1',
          [userId]
        );
        const orgId = userResult.rows[0]?.organization_id;
        if (orgId) {
          paramCount++;
          whereConditions.push(`c.organization_id = $${paramCount}`);
          params.push(orgId);
        }
      }
      // FMO/admin see all (no additional filter)
    }

    // Filter by type if specified
    if (type) {
      paramCount++;
      whereConditions.push(`comm.type = $${paramCount}`);
      params.push(type.toLowerCase());
    }

    // Add WHERE clause
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Order and limit
    query += ` ORDER BY comm.created_at DESC`;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    const result = await db.query(query, params);
    const communications = result.rows.map(formatCommunication);

    // HIPAA Audit Log
    await logCommunicationAccess(userId, clientId, null, 'COMM_LIST', {
      count: communications.length,
      type: type || 'all',
      ip: req.ip
    });

    return res.json({ ok: true, data: communications });

  } catch (error) {
    console.error('Get communications error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// POST /comms - Create new communication
// ============================================================================
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const { clientId, client_id, type, message, subject, direction, meta, metadata, outcome } = req.body || {};

    const actualClientId = clientId || client_id;
    const actualBody = message || req.body.body;

    if (!actualClientId) {
      return res.status(400).json({ ok: false, error: "clientId is required" });
    }

    if (!type || !actualBody) {
      return res.status(400).json({ ok: false, error: "type and message are required" });
    }

    // Check access to client
    const access = await checkClientAccess(userId, userRole, actualClientId);
    if (!access.hasAccess) {
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    // Validate type
    const validTypes = ['call', 'email', 'sms', 'appointment', 'note'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        ok: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Insert communication
    const result = await db.query(
      `INSERT INTO communications (
        client_id, user_id, type, direction, subject, body, outcome, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        actualClientId,
        userId,
        type.toLowerCase(),
        direction || 'outbound',
        subject || '',
        actualBody,
        outcome || null,
        meta || metadata || {}
      ]
    );

    const comm = result.rows[0];

    // Update client's last_contact_date
    await db.query(
      `UPDATE clients SET
        last_contact_date = CURRENT_TIMESTAMP,
        total_contacts = total_contacts + 1
       WHERE id = $1`,
      [actualClientId]
    );

    // HIPAA Audit Log
    await logCommunicationAccess(userId, actualClientId, comm.id, 'COMM_CREATE', {
      type: type,
      direction: direction || 'outbound',
      ip: req.ip
    });

    // ========================================================================
    // ACTUALLY SEND THE COMMUNICATION (if outbound)
    // ========================================================================
    let sendResult = null;

    if (direction !== 'inbound') {
      try {
        // Get client contact info AND preferred language
        const clientInfo = await db.query(
          'SELECT email, phone, preferred_language, first_name, last_name FROM clients WHERE id = $1',
          [actualClientId]
        );

        const client = clientInfo.rows[0];
        const clientLang = client?.preferred_language?.toLowerCase() || 'en';
        const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim();

        // Get agent info
        const agentInfo = await db.query(
          'SELECT email, name FROM users WHERE id = $1',
          [userId]
        );
        const agent = agentInfo.rows[0];
        const agentName = agent?.name || 'Your Medicare Agent';

        // Import automatic translator
        const { autoTranslate } = require('../utils/translator');

        // Send SMS via Twilio (with automatic translation)
        if (type.toLowerCase() === 'sms' && client?.phone) {
          const { sendSMS } = require('../utils/twilio');

          // Automatically translate message if client speaks Spanish
          const translatedBody = await autoTranslate(client.preferred_language, actualBody);

          sendResult = await sendSMS({
            to: client.phone,
            body: translatedBody,
            clientId: actualClientId,
            userId: userId
          });
          console.log(`✅ SMS sent (${clientLang}):`, sendResult);
        }

        // Send Email via agent's connected email (or SendGrid fallback) with automatic translation
        if (type.toLowerCase() === 'email' && client?.email) {
          const { sendEmail } = require('../utils/agent-email');

          // Automatically translate subject and body if client speaks Spanish
          const translatedSubject = await autoTranslate(client.preferred_language, subject || 'Message from your agent');
          const translatedBody = await autoTranslate(client.preferred_language, actualBody);

          // Create simple HTML if not provided
          const htmlBody = req.body.html || `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>${translatedBody.replace(/\n/g, '<br>')}</p>
              <p style="margin-top: 30px; color: #666;">- ${agentName}</p>
            </div>
          `;

          sendResult = await sendEmail({
            userId: userId,
            to: client.email,
            subject: translatedSubject,
            text: translatedBody,
            html: htmlBody,
            clientId: actualClientId
          });
          console.log(`✅ Email sent (${clientLang}):`, sendResult);
        }

      } catch (sendError) {
        console.error('⚠️  Failed to send communication:', sendError.message);
        // Don't fail the whole request - communication is logged even if sending fails
        // Update metadata to indicate send failure
        await db.query(
          `UPDATE communications SET metadata = $1 WHERE id = $2`,
          [JSON.stringify({ ...comm.metadata, sendError: sendError.message }), comm.id]
        );
      }
    }

    return res.json({
      ok: true,
      data: formatCommunication(comm),
      sendResult: sendResult
    });

  } catch (error) {
    console.error('Create communication error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /comms/:commId - Get single communication
// ============================================================================
router.get("/:commId", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const commId = req.params.commId;

    // Get communication
    const result = await db.query(
      'SELECT * FROM communications WHERE id = $1',
      [commId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Communication not found' });
    }

    const comm = result.rows[0];

    // Check access to client
    const access = await checkClientAccess(userId, userRole, comm.client_id);
    if (!access.hasAccess) {
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    // HIPAA Audit Log
    await logCommunicationAccess(userId, comm.client_id, commId, 'COMM_VIEW', {
      type: comm.type,
      ip: req.ip
    });

    return res.json({ ok: true, data: formatCommunication(comm) });

  } catch (error) {
    console.error('Get communication error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// DELETE /comms/:clientId/:commId - Delete communication
// ============================================================================
router.delete("/:clientId/:commId", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.clientId;
    const commId = req.params.commId;

    // Check access
    const access = await checkClientAccess(userId, userRole, clientId);
    if (!access.hasAccess) {
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    // Get communication to verify it belongs to this client
    const commResult = await db.query(
      'SELECT * FROM communications WHERE id = $1 AND client_id = $2',
      [commId, clientId]
    );

    if (commResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Communication not found' });
    }

    const comm = commResult.rows[0];

    // Only the creator or admin/fmo can delete
    if (userRole === 'agent' && comm.user_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Only the creator can delete this communication' });
    }

    // Delete communication
    await db.query('DELETE FROM communications WHERE id = $1', [commId]);

    // Update client's total_contacts
    await db.query(
      'UPDATE clients SET total_contacts = GREATEST(0, total_contacts - 1) WHERE id = $1',
      [clientId]
    );

    // HIPAA Audit Log
    await logCommunicationAccess(userId, clientId, commId, 'COMM_DELETE', {
      type: comm.type,
      ip: req.ip
    });

    return res.json({ ok: true });

  } catch (error) {
    console.error('Delete communication error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
