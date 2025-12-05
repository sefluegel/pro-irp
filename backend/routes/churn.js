// backend/routes/churn.js - Churn tracking & agent feedback system
// Handles logging churned clients, reasons, and win-back attempts
const express = require("express");
const router = express.Router();
const db = require("../db");

// ============================================================================
// CHURN REASONS (Lookup data)
// ============================================================================

/**
 * GET /churn/reasons
 * Get all active churn reasons for dropdown selection
 */
router.get("/reasons", async (req, res) => {
  try {
    const reasons = await db.query(
      `SELECT id, reason_code, reason_name, reason_category, description, is_preventable
       FROM churn_reasons
       WHERE is_active = true
       ORDER BY display_order, reason_name`
    );

    // Group by category for easier frontend rendering
    const grouped = {};
    for (const reason of reasons.rows) {
      if (!grouped[reason.reason_category]) {
        grouped[reason.reason_category] = [];
      }
      grouped[reason.reason_category].push(reason);
    }

    res.json({
      ok: true,
      reasons: reasons.rows,
      grouped
    });
  } catch (error) {
    console.error('[churn] Get reasons error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CHURN EVENTS
// ============================================================================

/**
 * POST /churn/log
 * Log a client churn event (when agent loses a client)
 */
router.post("/log", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const {
      clientId,
      churnDate,
      primaryReasonId,
      secondaryReasonIds,
      newCarrier,
      newPlan,
      newPlanType,
      agentNotes,
      preventionNotes,
      wasPreventable,
      preventionOpportunity,
      warningSigns
    } = req.body;

    // Validate required fields
    if (!clientId || !primaryReasonId) {
      return res.status(400).json({
        ok: false,
        error: 'Client ID and primary reason are required'
      });
    }

    // Verify agent has access to this client
    const clientCheck = await db.query(
      `SELECT c.id, c.risk_score, c.last_contact_date, c.status,
              c.first_name, c.last_name
       FROM clients c
       WHERE c.id = $1 AND c.owner_id = $2`,
      [clientId, userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    const client = clientCheck.rows[0];

    // Calculate days since last contact
    let daysSinceLastContact = null;
    if (client.last_contact_date) {
      const lastContact = new Date(client.last_contact_date);
      const churn = new Date(churnDate || Date.now());
      daysSinceLastContact = Math.floor((churn - lastContact) / (1000 * 60 * 60 * 24));
    }

    // Get contacts in last 90 days
    const contactsResult = await db.query(
      `SELECT COUNT(*) as count FROM communications
       WHERE client_id = $1 AND created_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );
    const totalContactsLast90Days = parseInt(contactsResult.rows[0].count);

    // Get current risk factors
    const riskFactors = await db.query(
      `SELECT rf.factor_code, crf.points_contributed
       FROM client_risk_factors crf
       JOIN risk_factors rf ON rf.id = crf.risk_factor_id
       WHERE crf.client_id = $1`,
      [clientId]
    );

    // Get active medications from Blue Button
    const medications = await db.query(
      `SELECT DISTINCT drug_name, ndc_code
       FROM prescription_claims
       WHERE client_id = $1
       ORDER BY fill_date DESC
       LIMIT 20`,
      [clientId]
    );

    // Get recent prescription changes
    const rxChanges = await db.query(
      `SELECT change_type, drug_name, detected_at
       FROM prescription_changes
       WHERE client_id = $1 AND detected_at > NOW() - INTERVAL '90 days'
       ORDER BY detected_at DESC`,
      [clientId]
    );

    // Insert churn event
    const result = await db.query(
      `INSERT INTO churn_events (
        client_id, churn_date, primary_reason_id, secondary_reason_ids,
        new_carrier, new_plan, new_plan_type,
        agent_notes, prevention_notes, was_preventable, prevention_opportunity,
        warning_signs, pre_churn_risk_score, pre_churn_factors,
        days_since_last_contact, total_contacts_last_90_days,
        active_medications, recent_rx_changes, logged_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id`,
      [
        clientId,
        churnDate || new Date(),
        primaryReasonId,
        secondaryReasonIds || [],
        newCarrier,
        newPlan,
        newPlanType,
        agentNotes,
        preventionNotes,
        wasPreventable,
        preventionOpportunity,
        warningSigns || [],
        client.risk_score,
        JSON.stringify(riskFactors.rows),
        daysSinceLastContact,
        totalContactsLast90Days,
        JSON.stringify(medications.rows),
        JSON.stringify(rxChanges.rows),
        userId
      ]
    );

    // Update competitor tracking if they went to a known competitor
    if (newCarrier) {
      await db.query(
        `INSERT INTO competitor_plans (carrier_name, plan_name, plan_type, clients_lost_to, last_loss_date)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (carrier_name, plan_name)
         DO UPDATE SET
           clients_lost_to = competitor_plans.clients_lost_to + 1,
           last_loss_date = $4,
           updated_at = CURRENT_TIMESTAMP`,
        [newCarrier, newPlan || 'Unknown', newPlanType, churnDate || new Date()]
      );
    }

    // HIPAA audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, client_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          clientId,
          'CHURN_LOGGED',
          'churn_event',
          result.rows[0].id,
          JSON.stringify({ primary_reason_id: primaryReasonId, was_preventable: wasPreventable })
        ]
      );
    } catch (auditError) {
      console.warn('[churn] Audit log error:', auditError.message);
    }

    console.log('[churn] Logged churn for client:', client.first_name, client.last_name);

    res.json({
      ok: true,
      churnEventId: result.rows[0].id,
      message: 'Churn event logged successfully'
    });
  } catch (error) {
    console.error('[churn] Log error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /churn/events
 * Get churn events (for reporting and ML training)
 */
router.get("/events", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      reasonCategory,
      preventable
    } = req.query;

    let query = `
      SELECT
        ce.id, ce.churn_date, ce.new_carrier, ce.new_plan,
        ce.agent_notes, ce.was_preventable, ce.prevention_opportunity,
        ce.pre_churn_risk_score, ce.days_since_last_contact,
        ce.logged_at,
        cr.reason_name, cr.reason_category,
        c.first_name, c.last_name, c.email,
        u.name as logged_by_name
      FROM churn_events ce
      JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
      JOIN clients c ON c.id = ce.client_id
      JOIN users u ON u.id = ce.logged_by
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'agent') {
      query += ` AND ce.logged_by = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Date filters
    if (startDate) {
      query += ` AND ce.churn_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND ce.churn_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Category filter
    if (reasonCategory) {
      query += ` AND cr.reason_category = $${paramIndex}`;
      params.push(reasonCategory);
      paramIndex++;
    }

    // Preventable filter
    if (preventable !== undefined) {
      query += ` AND ce.was_preventable = $${paramIndex}`;
      params.push(preventable === 'true');
      paramIndex++;
    }

    query += ` ORDER BY ce.churn_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const events = await db.query(query, params);

    res.json({
      ok: true,
      events: events.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[churn] Get events error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /churn/events/:id
 * Get detailed churn event
 */
router.get("/events/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { id } = req.params;

    const event = await db.query(
      `SELECT
        ce.*,
        cr.reason_name, cr.reason_category, cr.description as reason_description,
        c.first_name, c.last_name, c.email, c.phone, c.carrier, c.plan,
        u.name as logged_by_name
       FROM churn_events ce
       JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
       JOIN clients c ON c.id = ce.client_id
       JOIN users u ON u.id = ce.logged_by
       WHERE ce.id = $1`,
      [id]
    );

    if (event.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Churn event not found' });
    }

    // Get secondary reasons
    const secondaryReasons = await db.query(
      `SELECT reason_name, reason_category
       FROM churn_reasons
       WHERE id = ANY($1)`,
      [event.rows[0].secondary_reason_ids || []]
    );

    // Get win-back attempts
    const winbackAttempts = await db.query(
      `SELECT wa.*, u.name as attempted_by_name
       FROM winback_attempts wa
       JOIN users u ON u.id = wa.logged_by
       WHERE wa.churn_event_id = $1
       ORDER BY wa.attempt_date DESC`,
      [id]
    );

    res.json({
      ok: true,
      event: {
        ...event.rows[0],
        secondary_reasons: secondaryReasons.rows,
        winback_attempts: winbackAttempts.rows
      }
    });
  } catch (error) {
    console.error('[churn] Get event error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// WIN-BACK ATTEMPTS
// ============================================================================

/**
 * POST /churn/winback
 * Log a win-back attempt for a churned client
 */
router.post("/winback", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const {
      churnEventId,
      attemptDate,
      attemptType,
      outcome,
      outcomeNotes,
      wonBackDate,
      wonBackPlan
    } = req.body;

    if (!churnEventId || !attemptType || !outcome) {
      return res.status(400).json({
        ok: false,
        error: 'Churn event ID, attempt type, and outcome are required'
      });
    }

    // Get client ID from churn event
    const churnEvent = await db.query(
      `SELECT client_id FROM churn_events WHERE id = $1`,
      [churnEventId]
    );

    if (churnEvent.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Churn event not found' });
    }

    const clientId = churnEvent.rows[0].client_id;

    // Insert win-back attempt
    const result = await db.query(
      `INSERT INTO winback_attempts (
        churn_event_id, client_id, attempt_date, attempt_type,
        outcome, outcome_notes, won_back_date, won_back_plan, logged_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        churnEventId,
        clientId,
        attemptDate || new Date(),
        attemptType,
        outcome,
        outcomeNotes,
        wonBackDate,
        wonBackPlan,
        userId
      ]
    );

    // If won back, update client status
    if (outcome === 'won_back' && wonBackDate) {
      await db.query(
        `UPDATE clients SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [clientId]
      );
    }

    res.json({
      ok: true,
      winbackAttemptId: result.rows[0].id,
      message: 'Win-back attempt logged successfully'
    });
  } catch (error) {
    console.error('[churn] Winback error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// RETENTION SUCCESSES
// ============================================================================

/**
 * POST /churn/retention-success
 * Log when an at-risk client was successfully retained
 */
router.post("/retention-success", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const {
      clientId,
      interventionType,
      interventionNotes,
      whatWorked
    } = req.body;

    if (!clientId || !interventionType) {
      return res.status(400).json({
        ok: false,
        error: 'Client ID and intervention type are required'
      });
    }

    // Verify agent has access to this client and get current risk
    const clientCheck = await db.query(
      `SELECT id, risk_score FROM clients WHERE id = $1 AND owner_id = $2`,
      [clientId, userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    const client = clientCheck.rows[0];

    // Get current risk factors
    const riskFactors = await db.query(
      `SELECT rf.factor_code, crf.points_contributed
       FROM client_risk_factors crf
       JOIN risk_factors rf ON rf.id = crf.risk_factor_id
       WHERE crf.client_id = $1`,
      [clientId]
    );

    // Insert retention success
    const result = await db.query(
      `INSERT INTO retention_successes (
        client_id, recorded_date, pre_intervention_risk_score,
        risk_factors_present, intervention_type, intervention_notes,
        what_worked, logged_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        clientId,
        new Date(),
        client.risk_score,
        JSON.stringify(riskFactors.rows),
        interventionType,
        interventionNotes,
        whatWorked,
        userId
      ]
    );

    // Update client status to active if they were at_risk
    await db.query(
      `UPDATE clients SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'at_risk'`,
      [clientId]
    );

    res.json({
      ok: true,
      retentionSuccessId: result.rows[0].id,
      message: 'Retention success logged successfully'
    });
  } catch (error) {
    console.error('[churn] Retention success error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * GET /churn/stats
 * Get churn statistics for reporting
 */
router.get("/stats", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { startDate, endDate } = req.query;

    // Total churns
    const totalChurns = await db.query(
      `SELECT COUNT(*) as count FROM churn_events
       WHERE ($1::date IS NULL OR churn_date >= $1)
       AND ($2::date IS NULL OR churn_date <= $2)`,
      [startDate || null, endDate || null]
    );

    // Churns by reason category
    const byCategory = await db.query(
      `SELECT cr.reason_category, COUNT(*) as count
       FROM churn_events ce
       JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
       WHERE ($1::date IS NULL OR ce.churn_date >= $1)
       AND ($2::date IS NULL OR ce.churn_date <= $2)
       GROUP BY cr.reason_category
       ORDER BY count DESC`,
      [startDate || null, endDate || null]
    );

    // Top churn reasons
    const topReasons = await db.query(
      `SELECT cr.reason_name, COUNT(*) as count
       FROM churn_events ce
       JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
       WHERE ($1::date IS NULL OR ce.churn_date >= $1)
       AND ($2::date IS NULL OR ce.churn_date <= $2)
       GROUP BY cr.reason_name
       ORDER BY count DESC
       LIMIT 10`,
      [startDate || null, endDate || null]
    );

    // Preventable vs non-preventable
    const preventability = await db.query(
      `SELECT was_preventable, COUNT(*) as count
       FROM churn_events
       WHERE ($1::date IS NULL OR churn_date >= $1)
       AND ($2::date IS NULL OR churn_date <= $2)
       GROUP BY was_preventable`,
      [startDate || null, endDate || null]
    );

    // Top competitors
    const topCompetitors = await db.query(
      `SELECT carrier_name, clients_lost_to
       FROM competitor_plans
       ORDER BY clients_lost_to DESC
       LIMIT 5`
    );

    // Average pre-churn risk score
    const avgRiskScore = await db.query(
      `SELECT AVG(pre_churn_risk_score) as avg_score
       FROM churn_events
       WHERE pre_churn_risk_score IS NOT NULL
       AND ($1::date IS NULL OR churn_date >= $1)
       AND ($2::date IS NULL OR churn_date <= $2)`,
      [startDate || null, endDate || null]
    );

    // Win-back success rate
    const winbackStats = await db.query(
      `SELECT
         COUNT(*) as total_attempts,
         COUNT(*) FILTER (WHERE outcome = 'won_back') as successful
       FROM winback_attempts
       WHERE ($1::date IS NULL OR attempt_date >= $1)
       AND ($2::date IS NULL OR attempt_date <= $2)`,
      [startDate || null, endDate || null]
    );

    res.json({
      ok: true,
      stats: {
        totalChurns: parseInt(totalChurns.rows[0].count),
        byCategory: byCategory.rows,
        topReasons: topReasons.rows,
        preventability: preventability.rows,
        topCompetitors: topCompetitors.rows,
        averagePreChurnRiskScore: parseFloat(avgRiskScore.rows[0].avg_score) || 0,
        winbackStats: {
          totalAttempts: parseInt(winbackStats.rows[0].total_attempts),
          successful: parseInt(winbackStats.rows[0].successful),
          successRate: winbackStats.rows[0].total_attempts > 0
            ? (winbackStats.rows[0].successful / winbackStats.rows[0].total_attempts * 100).toFixed(1)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('[churn] Stats error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /churn/ml-training-data
 * Export churn data for ML model training
 * Returns sanitized data suitable for training
 */
router.get("/ml-training-data", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    // Only allow admins/fmos to export training data
    if (!['admin', 'fmo'].includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Admin access required' });
    }

    const { limit = 10000 } = req.query;

    // Get churn events with all features
    const churnData = await db.query(
      `SELECT
        ce.pre_churn_risk_score,
        ce.pre_churn_factors,
        ce.days_since_last_contact,
        ce.total_contacts_last_90_days,
        ce.was_preventable,
        ce.active_medications,
        ce.recent_rx_changes,
        cr.reason_category,
        cr.reason_code,
        c.plan_type,
        c.carrier,
        EXTRACT(YEAR FROM AGE(c.dob)) as age,
        c.state,
        1 as churned
       FROM churn_events ce
       JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
       JOIN clients c ON c.id = ce.client_id
       ORDER BY ce.churn_date DESC
       LIMIT $1`,
      [limit]
    );

    // Get retained clients (non-churned) for comparison
    const retainedData = await db.query(
      `SELECT
        c.risk_score as pre_churn_risk_score,
        NULL as pre_churn_factors,
        EXTRACT(DAY FROM NOW() - c.last_contact_date) as days_since_last_contact,
        (SELECT COUNT(*) FROM communications WHERE client_id = c.id AND created_at > NOW() - INTERVAL '90 days') as total_contacts_last_90_days,
        NULL as was_preventable,
        NULL as active_medications,
        NULL as recent_rx_changes,
        NULL as reason_category,
        NULL as reason_code,
        c.plan_type,
        c.carrier,
        EXTRACT(YEAR FROM AGE(c.dob)) as age,
        c.state,
        0 as churned
       FROM clients c
       WHERE c.status = 'active'
       AND c.id NOT IN (SELECT client_id FROM churn_events)
       ORDER BY RANDOM()
       LIMIT $1`,
      [limit]
    );

    res.json({
      ok: true,
      trainingData: {
        churned: churnData.rows,
        retained: retainedData.rows,
        totalChurned: churnData.rows.length,
        totalRetained: retainedData.rows.length
      }
    });
  } catch (error) {
    console.error('[churn] ML training data error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
