// backend/routes/risk.js - Risk scoring API endpoints
const express = require("express");
const router = express.Router();
const db = require("../db");
const riskScoringEngine = require('../jobs/risk-scoring-engine');

// ============================================================================
// RISK FACTORS
// ============================================================================

/**
 * GET /risk/factors
 * Get all risk factors and their weights
 */
router.get("/factors", async (req, res) => {
  try {
    const factors = await db.query(
      `SELECT id, factor_code, factor_name, factor_category, description,
              base_weight, ml_weight, is_active
       FROM risk_factors
       ORDER BY factor_category, base_weight DESC`
    );

    // Group by category
    const grouped = {};
    for (const factor of factors.rows) {
      if (!grouped[factor.factor_category]) {
        grouped[factor.factor_category] = [];
      }
      grouped[factor.factor_category].push(factor);
    }

    res.json({
      ok: true,
      factors: factors.rows,
      grouped
    });
  } catch (error) {
    console.error('[risk] Get factors error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PATCH /risk/factors/:id
 * Update a risk factor's weight (admin only)
 */
router.patch("/factors/:id", async (req, res) => {
  try {
    if (!req.user || !['admin', 'fmo'].includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { base_weight, is_active } = req.body;

    await db.query(
      `UPDATE risk_factors SET
        base_weight = COALESCE($1, base_weight),
        is_active = COALESCE($2, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [base_weight, is_active, id]
    );

    res.json({ ok: true, message: 'Risk factor updated' });
  } catch (error) {
    console.error('[risk] Update factor error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CLIENT RISK DATA
// ============================================================================

/**
 * GET /risk/client/:clientId
 * Get detailed risk information for a specific client
 */
router.get("/client/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;

    // Verify agent has access to this client
    const clientCheck = await db.query(
      `SELECT id, first_name, last_name, risk_score, status
       FROM clients
       WHERE id = $1 AND (owner_id = $2 OR $3 IN ('admin', 'fmo', 'manager'))`,
      [clientId, userId, req.user.role]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    const client = clientCheck.rows[0];

    // Get current risk factors
    const factors = await db.query(
      `SELECT
        rf.factor_code, rf.factor_name, rf.factor_category,
        crf.factor_value, crf.points_contributed, crf.detected_at
       FROM client_risk_factors crf
       JOIN risk_factors rf ON rf.id = crf.risk_factor_id
       WHERE crf.client_id = $1
       ORDER BY crf.points_contributed DESC`,
      [clientId]
    );

    // Get score history (last 30 days)
    const history = await db.query(
      `SELECT risk_score, previous_score, score_change, contributing_factors, scored_at
       FROM risk_score_history
       WHERE client_id = $1
       AND scored_at > NOW() - INTERVAL '30 days'
       ORDER BY scored_at DESC
       LIMIT 30`,
      [clientId]
    );

    // Get prescription changes
    const rxChanges = await db.query(
      `SELECT change_type, drug_name, previous_value, new_value, risk_weight, detected_at, reviewed_at
       FROM prescription_changes
       WHERE client_id = $1
       ORDER BY detected_at DESC
       LIMIT 10`,
      [clientId]
    );

    res.json({
      ok: true,
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        riskScore: client.risk_score,
        status: client.status
      },
      factors: factors.rows,
      history: history.rows,
      prescriptionChanges: rxChanges.rows,
      riskLevel: getRiskLevel(client.risk_score)
    });
  } catch (error) {
    console.error('[risk] Get client risk error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /risk/client/:clientId/recalculate
 * Trigger immediate risk recalculation for a client
 */
router.post("/client/:clientId/recalculate", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;

    // Verify agent has access to this client
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND owner_id = $2`,
      [clientId, userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    // Run risk scoring
    const result = await riskScoringEngine.scoreClient(clientId);
    await riskScoringEngine.updateClientRisk(clientId, result);

    res.json({
      ok: true,
      score: result.normalizedScore,
      factors: result.factors,
      riskLevel: getRiskLevel(result.normalizedScore)
    });
  } catch (error) {
    console.error('[risk] Recalculate error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// RISK DASHBOARD / ANALYTICS
// ============================================================================

/**
 * GET /risk/dashboard
 * Get risk overview for dashboard
 */
router.get("/dashboard", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Build client filter based on role
    let clientFilter = '';
    const params = [];
    let paramIndex = 1;

    if (userRole === 'agent') {
      clientFilter = `WHERE c.owner_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Risk score distribution
    const distribution = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE risk_score < 25) as low,
        COUNT(*) FILTER (WHERE risk_score >= 25 AND risk_score < 50) as moderate,
        COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 75) as elevated,
        COUNT(*) FILTER (WHERE risk_score >= 75) as high
       FROM clients c
       ${clientFilter}
       AND c.status != 'churned'`,
      params
    );

    // Top risk factors across all clients
    const topFactors = await db.query(
      `SELECT
        rf.factor_name, rf.factor_category,
        COUNT(*) as client_count,
        AVG(crf.points_contributed) as avg_contribution
       FROM client_risk_factors crf
       JOIN risk_factors rf ON rf.id = crf.risk_factor_id
       JOIN clients c ON c.id = crf.client_id
       ${clientFilter ? clientFilter.replace('WHERE', clientFilter.includes('WHERE') ? 'WHERE' : 'WHERE') : ''}
       ${clientFilter ? 'AND' : 'WHERE'} c.status != 'churned'
       GROUP BY rf.id, rf.factor_name, rf.factor_category
       ORDER BY client_count DESC
       LIMIT 10`,
      params
    );

    // High risk clients needing attention
    const highRiskClients = await db.query(
      `SELECT
        c.id, c.first_name, c.last_name, c.risk_score, c.status,
        c.last_contact_date, c.phone,
        (SELECT COUNT(*) FROM client_risk_factors WHERE client_id = c.id) as factor_count
       FROM clients c
       ${clientFilter}
       ${clientFilter ? 'AND' : 'WHERE'} c.status != 'churned'
       AND c.risk_score >= 60
       ORDER BY c.risk_score DESC
       LIMIT 20`,
      params
    );

    // Recent score increases (clients getting riskier)
    const risingRisk = await db.query(
      `SELECT DISTINCT ON (rsh.client_id)
        rsh.client_id, c.first_name, c.last_name,
        rsh.risk_score, rsh.previous_score, rsh.score_change,
        rsh.scored_at
       FROM risk_score_history rsh
       JOIN clients c ON c.id = rsh.client_id
       ${clientFilter ? clientFilter.replace('c.', 'c.') : ''}
       ${clientFilter ? 'AND' : 'WHERE'} rsh.score_change > 10
       AND rsh.scored_at > NOW() - INTERVAL '7 days'
       ORDER BY rsh.client_id, rsh.scored_at DESC`,
      params
    );

    res.json({
      ok: true,
      distribution: distribution.rows[0],
      topFactors: topFactors.rows,
      highRiskClients: highRiskClients.rows,
      risingRisk: risingRisk.rows
    });
  } catch (error) {
    console.error('[risk] Dashboard error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /risk/at-risk-clients
 * Get paginated list of at-risk clients
 */
router.get("/at-risk-clients", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 20, offset = 0, minScore = 50, maxScore = 100 } = req.query;

    let query = `
      SELECT
        c.id, c.first_name, c.last_name, c.email, c.phone,
        c.risk_score, c.status, c.carrier, c.plan, c.plan_type,
        c.last_contact_date, c.next_contact_date,
        u.name as owner_name
      FROM clients c
      JOIN users u ON u.id = c.owner_id
      WHERE c.status != 'churned'
      AND c.risk_score >= $1
      AND c.risk_score <= $2
    `;

    const params = [minScore, maxScore];
    let paramIndex = 3;

    if (userRole === 'agent') {
      query += ` AND c.owner_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY c.risk_score DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const clients = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM clients c
      WHERE c.status != 'churned'
      AND c.risk_score >= $1
      AND c.risk_score <= $2
    `;

    const countParams = [minScore, maxScore];

    if (userRole === 'agent') {
      countQuery += ` AND c.owner_id = $3`;
      countParams.push(userId);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      ok: true,
      clients: clients.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[risk] At-risk clients error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function getRiskLevel(score) {
  if (score < 25) return { level: 'low', label: 'Low Risk', color: 'green' };
  if (score < 50) return { level: 'moderate', label: 'Moderate Risk', color: 'yellow' };
  if (score < 75) return { level: 'elevated', label: 'Elevated Risk', color: 'orange' };
  return { level: 'high', label: 'High Risk', color: 'red' };
}

module.exports = router;
