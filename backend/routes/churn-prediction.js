// backend/routes/churn-prediction.js
// API endpoints for the Churn Prediction Model
// Includes call outcome modal, alerts, morning briefing, and analytics

const express = require("express");
const router = express.Router();
const db = require("../db");
const churnPredictionEngine = require('../jobs/churn-prediction-engine');

// ============================================================================
// RISK SCORING
// ============================================================================

/**
 * GET /churn-prediction/score/:clientId
 * Get detailed risk score breakdown for a client
 */
router.get("/score/:clientId", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;

    // Verify access
    const clientCheck = await db.query(
      `SELECT id, first_name, last_name, owner_id
       FROM clients
       WHERE id = $1 AND (owner_id = $2 OR $3 IN ('admin', 'fmo', 'manager'))`,
      [clientId, req.user.id, req.user.role]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    // Calculate fresh score
    const scoreResult = await churnPredictionEngine.scoreClient(clientId);

    res.json({
      ok: true,
      client: {
        id: clientId,
        name: `${clientCheck.rows[0].first_name} ${clientCheck.rows[0].last_name}`
      },
      score: scoreResult
    });
  } catch (error) {
    console.error('[churn-prediction] Score error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /churn-prediction/recalculate/:clientId
 * Force recalculation of client risk score
 */
router.post("/recalculate/:clientId", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;

    // Verify access
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND owner_id = $2`,
      [clientId, req.user.id]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    // Calculate and update
    const scoreResult = await churnPredictionEngine.scoreClient(clientId);
    await churnPredictionEngine.updateClientRisk(clientId, scoreResult);

    res.json({
      ok: true,
      score: scoreResult.finalScore,
      riskCategory: scoreResult.riskCategory,
      isAuto100: scoreResult.isAuto100,
      auto100Reason: scoreResult.auto100Reason
    });
  } catch (error) {
    console.error('[churn-prediction] Recalculate error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CALL OUTCOME MODAL
// ============================================================================

/**
 * GET /churn-prediction/call-outcome-options
 * Get available call outcome options for modal
 */
router.get("/call-outcome-options", async (req, res) => {
  try {
    const options = await db.query(`
      SELECT id, outcome_category, outcome_code, outcome_label,
             score_adjustment, requires_churn_reason, requires_callback_date
      FROM call_outcome_options
      WHERE is_active = true
      ORDER BY outcome_category, display_order
    `);

    // Group by category
    const grouped = {
      retained: options.rows.filter(o => o.outcome_category === 'retained'),
      at_risk: options.rows.filter(o => o.outcome_category === 'at_risk'),
      lost: options.rows.filter(o => o.outcome_category === 'lost'),
      no_contact: options.rows.filter(o => o.outcome_category === 'no_contact')
    };

    res.json({ ok: true, options: options.rows, grouped });
  } catch (error) {
    console.error('[churn-prediction] Call outcome options error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /churn-prediction/call-outcome
 * Log a call outcome and apply score adjustment
 */
router.post("/call-outcome", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const {
      clientId,
      communicationId,
      outcomeCode,
      notes,
      churnReasonId,
      callbackDate,
      newCarrier,
      newPlan
    } = req.body;

    if (!clientId || !outcomeCode) {
      return res.status(400).json({ ok: false, error: 'Client ID and outcome code are required' });
    }

    // Get outcome option
    const optionResult = await db.query(
      `SELECT * FROM call_outcome_options WHERE outcome_code = $1`,
      [outcomeCode]
    );

    if (optionResult.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Invalid outcome code' });
    }

    const option = optionResult.rows[0];

    // Validate required fields
    if (option.requires_churn_reason && !churnReasonId) {
      return res.status(400).json({ ok: false, error: 'Churn reason is required for this outcome' });
    }

    if (option.requires_callback_date && !callbackDate) {
      return res.status(400).json({ ok: false, error: 'Callback date is required for this outcome' });
    }

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Insert call outcome
      const outcomeResult = await client.query(`
        INSERT INTO call_outcomes
        (client_id, user_id, communication_id, outcome_category, outcome_code, outcome_label,
         score_adjustment, churn_reason_id, callback_date, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        clientId,
        req.user.id,
        communicationId,
        option.outcome_category,
        outcomeCode,
        option.outcome_label,
        option.score_adjustment,
        churnReasonId,
        callbackDate,
        notes
      ]);

      // Apply score adjustment
      if (option.score_adjustment !== 0) {
        await client.query(`
          UPDATE clients
          SET risk_score = GREATEST(0, LEAST(100, risk_score + $1)),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [option.score_adjustment, clientId]);
      }

      // If LOST, create churn event
      if (option.outcome_category === 'lost' && churnReasonId) {
        // Get pre-churn data
        const preChurnData = await client.query(`
          SELECT risk_score, last_contact_date FROM clients WHERE id = $1
        `, [clientId]);

        const riskFactors = await client.query(`
          SELECT rf.factor_code, crf.points_contributed
          FROM client_risk_factors crf
          JOIN risk_factors rf ON rf.id = crf.risk_factor_id
          WHERE crf.client_id = $1
        `, [clientId]);

        const contacts = await client.query(`
          SELECT COUNT(*) as count
          FROM client_contacts
          WHERE client_id = $1 AND contact_date > NOW() - INTERVAL '90 days'
        `, [clientId]);

        await client.query(`
          INSERT INTO churn_events
          (client_id, churn_date, primary_reason_id, new_carrier, new_plan,
           pre_churn_risk_score, pre_churn_factors, days_since_last_contact,
           total_contacts_last_90_days, logged_by)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          clientId,
          churnReasonId,
          newCarrier,
          newPlan,
          preChurnData.rows[0]?.risk_score || 0,
          JSON.stringify(riskFactors.rows),
          preChurnData.rows[0]?.last_contact_date
            ? Math.floor((Date.now() - new Date(preChurnData.rows[0].last_contact_date)) / (1000 * 60 * 60 * 24))
            : null,
          parseInt(contacts.rows[0].count),
          req.user.id
        ]);

        // Update client status
        await client.query(`
          UPDATE clients SET status = 'churned', updated_at = CURRENT_TIMESTAMP WHERE id = $1
        `, [clientId]);
      }

      // If callback scheduled, create task
      if (callbackDate) {
        await client.query(`
          INSERT INTO tasks
          (assigned_to, client_id, title, description, due_date, priority, status, created_by)
          VALUES ($1, $2, $3, $4, $5, 'high', 'pending', $1)
        `, [
          req.user.id,
          clientId,
          'Scheduled Callback',
          notes || 'Client requested callback',
          callbackDate
        ]);
      }

      await client.query('COMMIT');

      // Get updated client score
      const updatedClient = await db.query(
        `SELECT risk_score, status FROM clients WHERE id = $1`,
        [clientId]
      );

      res.json({
        ok: true,
        callOutcomeId: outcomeResult.rows[0].id,
        newRiskScore: updatedClient.rows[0].risk_score,
        clientStatus: updatedClient.rows[0].status,
        message: 'Call outcome logged successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[churn-prediction] Call outcome error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// ALERTS
// ============================================================================

/**
 * GET /churn-prediction/alerts
 * Get active alerts for the logged-in agent
 */
router.get("/alerts", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { status = 'active', limit = 50 } = req.query;

    const alerts = await db.query(`
      SELECT
        ra.id, ra.alert_type, ra.alert_code, ra.alert_title, ra.alert_message,
        ra.response_window_hours, ra.response_due_at, ra.status,
        ra.created_at,
        c.id as client_id, c.first_name, c.last_name, c.risk_score, c.phone
      FROM risk_alerts ra
      JOIN clients c ON c.id = ra.client_id
      WHERE ra.user_id = $1
      AND ($2 = 'all' OR ra.status = $2)
      ORDER BY
        CASE ra.alert_type
          WHEN 'emergency' THEN 1
          WHEN 'urgent' THEN 2
          WHEN 'warning' THEN 3
          ELSE 4
        END,
        ra.created_at DESC
      LIMIT $3
    `, [req.user.id, status, limit]);

    // Count by type
    const counts = await db.query(`
      SELECT alert_type, COUNT(*) as count
      FROM risk_alerts
      WHERE user_id = $1 AND status = 'active'
      GROUP BY alert_type
    `, [req.user.id]);

    res.json({
      ok: true,
      alerts: alerts.rows,
      counts: counts.rows.reduce((acc, c) => ({ ...acc, [c.alert_type]: parseInt(c.count) }), {})
    });
  } catch (error) {
    console.error('[churn-prediction] Alerts error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PATCH /churn-prediction/alerts/:id
 * Update alert status (acknowledge, resolve, dismiss)
 */
router.patch("/alerts/:id", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { action, notes } = req.body;

    const validActions = ['acknowledge', 'resolve', 'dismiss'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action' });
    }

    let status, updateField;
    switch (action) {
      case 'acknowledge':
        status = 'acknowledged';
        updateField = 'acknowledged_at = CURRENT_TIMESTAMP';
        break;
      case 'resolve':
        status = 'resolved';
        updateField = 'resolved_at = CURRENT_TIMESTAMP, resolution_notes = $4';
        break;
      case 'dismiss':
        status = 'dismissed';
        updateField = 'resolved_at = CURRENT_TIMESTAMP';
        break;
    }

    await db.query(`
      UPDATE risk_alerts
      SET status = $1, ${updateField}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
    `, action === 'resolve' ? [status, id, req.user.id, notes] : [status, id, req.user.id]);

    res.json({ ok: true, message: 'Alert updated' });
  } catch (error) {
    console.error('[churn-prediction] Alert update error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// MORNING BRIEFING
// ============================================================================

/**
 * GET /churn-prediction/morning-briefing
 * Get today's morning briefing for the logged-in agent
 */
router.get("/morning-briefing", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if briefing exists for today
    let briefing = await db.query(`
      SELECT *
      FROM morning_briefings
      WHERE user_id = $1 AND briefing_date = $2
    `, [req.user.id, today]);

    // Generate if not exists or older than 1 hour
    if (briefing.rows.length === 0 ||
        (new Date() - new Date(briefing.rows[0].generated_at)) > 3600000) {
      const generated = await churnPredictionEngine.generateMorningBriefing(req.user.id);
      briefing = await db.query(`
        SELECT * FROM morning_briefings
        WHERE user_id = $1 AND briefing_date = $2
      `, [req.user.id, today]);
    }

    // Mark as viewed
    if (briefing.rows.length > 0 && !briefing.rows[0].viewed_at) {
      await db.query(`
        UPDATE morning_briefings SET viewed_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND briefing_date = $2
      `, [req.user.id, today]);
    }

    res.json({
      ok: true,
      briefing: briefing.rows[0] || null,
      userName: req.user.name
    });
  } catch (error) {
    console.error('[churn-prediction] Morning briefing error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /churn-prediction/dynamic-briefing
 * Get time-aware dynamic briefing with AI assistant personality
 * Morning: Summary of overnight risk analysis, today's priorities
 * Afternoon: Progress so far, what's left
 * Evening: Day wrap-up, preparation for tomorrow
 */
router.get("/dynamic-briefing", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    // Get user's assistant name
    const userResult = await db.query(
      `SELECT name, assistant_name FROM users WHERE id = $1`,
      [req.user.id]
    );
    const userName = userResult.rows[0]?.name || 'there';
    const assistantName = userResult.rows[0]?.assistant_name || 'Alex';

    // Determine time of day
    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    let greeting = 'Good Morning';

    if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
      greeting = 'Good Afternoon';
    } else if (hour >= 17) {
      timeOfDay = 'evening';
      greeting = 'Good Evening';
    }

    // Get client stats
    const clientStats = await db.query(`
      SELECT
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE risk_score >= 80) as critical_risk,
        COUNT(*) FILTER (WHERE risk_score >= 65 AND risk_score < 80) as high_risk,
        COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 65) as elevated_risk,
        COUNT(*) FILTER (WHERE risk_score < 50) as healthy_clients
      FROM clients
      WHERE owner_id = $1 AND status != 'churned'
    `, [req.user.id]);

    const stats = clientStats.rows[0];

    // Get today's tasks
    const today = new Date().toISOString().split('T')[0];
    const taskStats = await db.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks
      FROM tasks
      WHERE assigned_to = $1
      AND (due_date = $2 OR (status != 'completed' AND due_date < $2))
    `, [req.user.id, today]);

    const tasks = taskStats.rows[0];

    // Get priority clients needing attention (top 5 by risk)
    const priorityClients = await db.query(`
      SELECT
        c.id, c.first_name, c.last_name, c.risk_score, c.phone,
        c.last_contact_date,
        (SELECT rf.factor_name
         FROM client_risk_factors crf
         JOIN risk_factors rf ON rf.id = crf.risk_factor_id
         WHERE crf.client_id = c.id
         ORDER BY crf.points_contributed DESC
         LIMIT 1) as top_risk_factor
      FROM clients c
      WHERE c.owner_id = $1
      AND c.status != 'churned'
      AND c.risk_score >= 50
      ORDER BY c.risk_score DESC, c.last_contact_date ASC
      LIMIT 5
    `, [req.user.id]);

    // Get today's completed calls/communications
    const commsToday = await db.query(`
      SELECT
        COUNT(*) as total_comms,
        COUNT(*) FILTER (WHERE type = 'call') as calls,
        COUNT(*) FILTER (WHERE type = 'email') as emails
      FROM communications
      WHERE user_id = $1
      AND created_at::date = $2
    `, [req.user.id, today]);

    const comms = commsToday.rows[0];

    // Get risk changes since last login (clients whose scores increased overnight)
    const riskChanges = await db.query(`
      SELECT
        c.id, c.first_name, c.last_name, c.risk_score,
        rsh.previous_score, rsh.score_change
      FROM risk_score_history rsh
      JOIN clients c ON c.id = rsh.client_id
      WHERE c.owner_id = $1
      AND rsh.scored_at::date = $2
      AND rsh.score_change > 0
      ORDER BY rsh.score_change DESC
      LIMIT 5
    `, [req.user.id, today]);

    // Build the briefing narrative based on time of day
    let briefingNarrative = '';
    let actionItems = [];
    let insights = [];

    if (timeOfDay === 'morning') {
      // Morning briefing - fresh start, overnight analysis
      briefingNarrative = `Here's your morning brief. `;

      if (parseInt(stats.critical_risk) > 0 || parseInt(stats.high_risk) > 0) {
        const urgentCount = parseInt(stats.critical_risk) + parseInt(stats.high_risk);
        briefingNarrative += `The risk scoring system identified ${urgentCount} client${urgentCount !== 1 ? 's' : ''} requiring urgent attention. `;

        if (riskChanges.rows.length > 0) {
          const topChange = riskChanges.rows[0];
          briefingNarrative += `${topChange.first_name} ${topChange.last_name}'s risk score increased by ${topChange.score_change} points overnight - this should be your first call. `;
        }
      } else {
        briefingNarrative += `Your book looks healthy today - no critical risk clients detected overnight. `;
      }

      if (parseInt(tasks.pending_tasks) > 0) {
        briefingNarrative += `You have ${tasks.pending_tasks} task${parseInt(tasks.pending_tasks) !== 1 ? 's' : ''} scheduled for today. `;
      }

      // Action items for morning
      if (priorityClients.rows.length > 0) {
        actionItems.push(`Call ${priorityClients.rows[0].first_name} ${priorityClients.rows[0].last_name} (Risk: ${priorityClients.rows[0].risk_score}) - ${priorityClients.rows[0].top_risk_factor || 'High priority'}`);
      }
      if (parseInt(tasks.pending_tasks) > 0) {
        actionItems.push(`Complete ${tasks.pending_tasks} scheduled task${parseInt(tasks.pending_tasks) !== 1 ? 's' : ''}`);
      }
      actionItems.push(`Review ${stats.elevated_risk} elevated-risk clients before end of day`);

    } else if (timeOfDay === 'afternoon') {
      // Afternoon briefing - progress check, what's left
      briefingNarrative = `Here's your afternoon update. `;

      if (parseInt(comms.calls) > 0 || parseInt(comms.emails) > 0) {
        briefingNarrative += `Great progress so far! You've made ${comms.calls} call${parseInt(comms.calls) !== 1 ? 's' : ''} and sent ${comms.emails} email${parseInt(comms.emails) !== 1 ? 's' : ''} today. `;
      }

      if (parseInt(tasks.completed_tasks) > 0) {
        briefingNarrative += `You've completed ${tasks.completed_tasks} of ${tasks.total_tasks} tasks. `;
      }

      const remaining = parseInt(stats.critical_risk) + parseInt(stats.high_risk);
      if (remaining > 0) {
        briefingNarrative += `${remaining} high-priority client${remaining !== 1 ? 's' : ''} still need${remaining === 1 ? 's' : ''} attention before end of day. `;
      } else {
        briefingNarrative += `All critical clients have been contacted - you're in great shape! `;
      }

      // Action items for afternoon
      if (parseInt(tasks.pending_tasks) > 0) {
        actionItems.push(`${tasks.pending_tasks} task${parseInt(tasks.pending_tasks) !== 1 ? 's' : ''} remaining for today`);
      }
      if (priorityClients.rows.length > 0 && !parseInt(comms.calls)) {
        actionItems.push(`Don't forget to call ${priorityClients.rows[0].first_name} ${priorityClients.rows[0].last_name}`);
      }

    } else {
      // Evening briefing - wrap up
      briefingNarrative = `Here's your evening wrap-up. `;

      briefingNarrative += `Today you made ${comms.calls} call${parseInt(comms.calls) !== 1 ? 's' : ''} and completed ${tasks.completed_tasks} task${parseInt(tasks.completed_tasks) !== 1 ? 's' : ''}. `;

      if (parseInt(tasks.pending_tasks) > 0) {
        briefingNarrative += `${tasks.pending_tasks} task${parseInt(tasks.pending_tasks) !== 1 ? 's' : ''} will roll over to tomorrow. `;
      } else {
        briefingNarrative += `All tasks completed - great job! `;
      }

      // Preview for tomorrow
      briefingNarrative += `Tomorrow, keep an eye on ${parseInt(stats.critical_risk) + parseInt(stats.high_risk)} high-risk clients in your book.`;

      actionItems.push('Log any final notes for today');
      if (parseInt(tasks.pending_tasks) > 0) {
        actionItems.push('Review tomorrow\'s task list');
      }
    }

    // Build insights
    if (parseInt(stats.critical_risk) > 0) {
      insights.push(`${stats.critical_risk} client${parseInt(stats.critical_risk) !== 1 ? 's' : ''} in critical risk zone (80+)`);
    }
    if (riskChanges.rows.length > 0) {
      insights.push(`${riskChanges.rows.length} client${riskChanges.rows.length !== 1 ? 's' : ''} had risk score increases today`);
    }
    if (parseInt(stats.healthy_clients) > parseInt(stats.total_clients) * 0.8) {
      insights.push('Your book is in excellent health - over 80% of clients have low risk scores');
    }

    res.json({
      ok: true,
      briefing: {
        greeting,
        assistantName,
        userName: userName.split(' ')[0], // First name only
        timeOfDay,
        narrative: briefingNarrative,
        actionItems,
        insights,
        stats: {
          totalClients: parseInt(stats.total_clients),
          criticalRisk: parseInt(stats.critical_risk),
          highRisk: parseInt(stats.high_risk),
          elevatedRisk: parseInt(stats.elevated_risk),
          healthyClients: parseInt(stats.healthy_clients)
        },
        tasks: {
          total: parseInt(tasks.total_tasks),
          completed: parseInt(tasks.completed_tasks),
          pending: parseInt(tasks.pending_tasks),
          inProgress: parseInt(tasks.in_progress_tasks)
        },
        todayProgress: {
          calls: parseInt(comms.calls),
          emails: parseInt(comms.emails),
          totalComms: parseInt(comms.total_comms)
        },
        priorityClients: priorityClients.rows,
        riskChanges: riskChanges.rows,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[churn-prediction] Dynamic briefing error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// PRIORITY CALL QUEUE
// ============================================================================

/**
 * GET /churn-prediction/priority-queue
 * Get priority call queue (clients sorted by risk)
 */
router.get("/priority-queue", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { minScore = 50, limit = 50, offset = 0 } = req.query;

    const queue = await db.query(`
      SELECT
        c.id, c.first_name, c.last_name, c.phone, c.email,
        c.risk_score, c.status, c.carrier, c.plan,
        c.last_contact_date,
        (SELECT rf.factor_name
         FROM client_risk_factors crf
         JOIN risk_factors rf ON rf.id = crf.risk_factor_id
         WHERE crf.client_id = c.id
         ORDER BY crf.points_contributed DESC
         LIMIT 1) as top_risk_factor,
        (SELECT rsh.score_change
         FROM risk_score_history rsh
         WHERE rsh.client_id = c.id
         ORDER BY rsh.scored_at DESC
         LIMIT 1) as recent_score_change
      FROM clients c
      WHERE c.owner_id = $1
      AND c.status != 'churned'
      AND c.risk_score >= $2
      ORDER BY c.risk_score DESC, c.last_contact_date ASC
      LIMIT $3 OFFSET $4
    `, [req.user.id, minScore, limit, offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM clients
      WHERE owner_id = $1 AND status != 'churned' AND risk_score >= $2
    `, [req.user.id, minScore]);

    res.json({
      ok: true,
      queue: queue.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[churn-prediction] Priority queue error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /churn-prediction/priority-queue/next
 * Get next client in priority queue
 */
router.get("/priority-queue/next", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { currentClientId } = req.query;

    let whereClause = `WHERE c.owner_id = $1 AND c.status != 'churned' AND c.risk_score >= 50`;
    const params = [req.user.id];

    if (currentClientId) {
      // Get current client's score to find next one
      const currentScore = await db.query(
        `SELECT risk_score FROM clients WHERE id = $1`,
        [currentClientId]
      );

      if (currentScore.rows[0]) {
        whereClause += ` AND (c.risk_score < $2 OR (c.risk_score = $2 AND c.id > $3))`;
        params.push(currentScore.rows[0].risk_score, currentClientId);
      }
    }

    const next = await db.query(`
      SELECT
        c.id, c.first_name, c.last_name, c.phone, c.email,
        c.risk_score, c.status, c.carrier, c.plan, c.dob,
        c.address, c.city, c.state, c.zip,
        c.last_contact_date, c.notes
      FROM clients c
      ${whereClause}
      ORDER BY c.risk_score DESC, c.last_contact_date ASC
      LIMIT 1
    `, params);

    if (next.rows.length === 0) {
      return res.json({ ok: true, next: null, message: 'No more clients in queue' });
    }

    // Get risk factors for this client
    const factors = await db.query(`
      SELECT rf.factor_code, rf.factor_name, rf.factor_category, crf.points_contributed
      FROM client_risk_factors crf
      JOIN risk_factors rf ON rf.id = crf.risk_factor_id
      WHERE crf.client_id = $1
      ORDER BY crf.points_contributed DESC
    `, [next.rows[0].id]);

    // Get recent communications
    const comms = await db.query(`
      SELECT type, direction, outcome, created_at
      FROM communications
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [next.rows[0].id]);

    res.json({
      ok: true,
      next: {
        ...next.rows[0],
        riskFactors: factors.rows,
        recentCommunications: comms.rows
      }
    });
  } catch (error) {
    console.error('[churn-prediction] Next in queue error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// LOG CLIENT CONTACT
// ============================================================================

/**
 * POST /churn-prediction/contact
 * Log a client contact (meaningful, light touch, or automated)
 */
router.post("/contact", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const {
      clientId,
      contactType,
      outcome,
      durationMinutes,
      notes,
      isDay7Welcome,
      isDay30Checkin,
      isDay60Checkin,
      isDay90Review,
      isAnnualReview
    } = req.body;

    if (!clientId || !contactType) {
      return res.status(400).json({ ok: false, error: 'Client ID and contact type are required' });
    }

    // Determine credit value
    const creditMap = {
      benefits_review_call: 1.0,
      problem_resolution_call: 1.0,
      life_event_discussion: 1.0,
      aep_oep_checkin_call: 1.0,
      in_person_meeting: 1.0,
      scheduled_video: 1.0,
      quick_checkin_call: 0.5,
      text_conversation: 0.5,
      personalized_email: 0.5,
      birthday_message: 0.2,
      holiday_message: 0.2,
      newsletter: 0.2,
      reminder_text: 0.2
    };

    const credit = creditMap[contactType] || 0.5;

    const result = await db.query(`
      INSERT INTO client_contacts
      (client_id, user_id, contact_type, contact_credit, outcome, duration_minutes, notes,
       is_day_7_welcome, is_day_30_checkin, is_day_60_checkin, is_day_90_review, is_annual_review)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      clientId, req.user.id, contactType, credit, outcome, durationMinutes, notes,
      isDay7Welcome || false, isDay30Checkin || false, isDay60Checkin || false,
      isDay90Review || false, isAnnualReview || false
    ]);

    // Update client last contact date if meaningful contact
    if (credit === 1.0) {
      await db.query(`
        UPDATE clients SET last_contact_date = CURRENT_TIMESTAMP WHERE id = $1
      `, [clientId]);
    }

    res.json({
      ok: true,
      contactId: result.rows[0].id,
      credit,
      message: 'Contact logged successfully'
    });
  } catch (error) {
    console.error('[churn-prediction] Contact log error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CLIENT SEP STATUS
// ============================================================================

/**
 * GET /churn-prediction/sep-status/:clientId
 * Get active SEP status for a client
 */
router.get("/sep-status/:clientId", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;

    const sepStatus = await db.query(`
      SELECT *
      FROM client_sep_status
      WHERE client_id = $1 AND status = 'active'
      ORDER BY sep_end_date ASC
    `, [clientId]);

    res.json({
      ok: true,
      sepStatus: sepStatus.rows,
      hasActiveSep: sepStatus.rows.length > 0
    });
  } catch (error) {
    console.error('[churn-prediction] SEP status error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /churn-prediction/sep-status
 * Create or update SEP status for a client
 */
router.post("/sep-status", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId, sepType, triggerEvent, startDate, endDate, detectionSource } = req.body;

    if (!clientId || !sepType || !startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        error: 'Client ID, SEP type, start date, and end date are required'
      });
    }

    const result = await db.query(`
      INSERT INTO client_sep_status
      (client_id, sep_type, sep_trigger_event, sep_start_date, sep_end_date, detection_source)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (client_id, sep_type, sep_start_date) DO UPDATE SET
        sep_end_date = EXCLUDED.sep_end_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [clientId, sepType, triggerEvent, startDate, endDate, detectionSource || 'agent_entry']);

    // Trigger risk recalculation
    const scoreResult = await churnPredictionEngine.scoreClient(clientId);
    await churnPredictionEngine.updateClientRisk(clientId, scoreResult);

    res.json({
      ok: true,
      sepId: result.rows[0].id,
      newRiskScore: scoreResult.finalScore
    });
  } catch (error) {
    console.error('[churn-prediction] SEP status create error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// SCORE HISTORY & VELOCITY
// ============================================================================

/**
 * GET /churn-prediction/history/:clientId
 * Get score history for a client
 */
router.get("/history/:clientId", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const { days = 90 } = req.query;

    const history = await db.query(`
      SELECT
        risk_score, previous_score, score_change,
        scoring_method, scored_at,
        contributing_factors
      FROM risk_score_history
      WHERE client_id = $1
      AND scored_at > NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY scored_at DESC
    `, [clientId]);

    // Calculate velocity (7-day trend)
    const recentHistory = history.rows.slice(0, 7);
    let velocity = 'stable';
    if (recentHistory.length >= 2) {
      const totalChange = recentHistory[0].risk_score - recentHistory[recentHistory.length - 1].risk_score;
      if (totalChange >= 20) velocity = 'spiking';
      else if (totalChange >= 10) velocity = 'rising';
      else if (totalChange <= -10) velocity = 'improving';
    }

    res.json({
      ok: true,
      history: history.rows,
      velocity,
      velocityIndicator: {
        spiking: { icon: '!!', label: 'Spiking - Investigate urgently', color: 'red' },
        rising: { icon: 'up', label: 'Rising - Something changed', color: 'orange' },
        stable: { icon: 'stable', label: 'Stable - Monitor', color: 'gray' },
        improving: { icon: 'down', label: 'Improving - Engagement working', color: 'green' }
      }[velocity]
    });
  } catch (error) {
    console.error('[churn-prediction] History error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// INTERVENTION LOGGING
// ============================================================================

/**
 * POST /churn-prediction/intervention
 * Log an intervention for tracking effectiveness
 */
router.post("/intervention", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId, interventionType, notes } = req.body;

    if (!clientId || !interventionType) {
      return res.status(400).json({ ok: false, error: 'Client ID and intervention type are required' });
    }

    // Get current risk state
    const client = await db.query(
      `SELECT risk_score FROM clients WHERE id = $1`,
      [clientId]
    );

    if (client.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    const riskCategory = churnPredictionEngine.getRiskCategory(client.rows[0].risk_score);

    const result = await db.query(`
      INSERT INTO interventions
      (client_id, user_id, pre_intervention_score, risk_category, intervention_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [clientId, req.user.id, client.rows[0].risk_score, riskCategory.name, interventionType, notes]);

    res.json({
      ok: true,
      interventionId: result.rows[0].id,
      message: 'Intervention logged successfully'
    });
  } catch (error) {
    console.error('[churn-prediction] Intervention error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// RISK DISTRIBUTION
// ============================================================================

/**
 * GET /churn-prediction/distribution
 * Get risk score distribution for dashboard
 */
router.get("/distribution", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    let ownerFilter = '';
    const params = [];

    if (req.user.role === 'agent') {
      ownerFilter = 'AND owner_id = $1';
      params.push(req.user.id);
    }

    const distribution = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE risk_score >= 90) as severe,
        COUNT(*) FILTER (WHERE risk_score >= 80 AND risk_score < 90) as critical,
        COUNT(*) FILTER (WHERE risk_score >= 65 AND risk_score < 80) as high,
        COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 65) as elevated,
        COUNT(*) FILTER (WHERE risk_score >= 35 AND risk_score < 50) as medium,
        COUNT(*) FILTER (WHERE risk_score >= 20 AND risk_score < 35) as low,
        COUNT(*) FILTER (WHERE risk_score < 20) as stable,
        COUNT(*) as total
      FROM clients
      WHERE status != 'churned' ${ownerFilter}
    `, params);

    res.json({
      ok: true,
      distribution: distribution.rows[0],
      categories: [
        { name: 'Severe', key: 'severe', min: 90, max: 100, color: '#7f1d1d' },
        { name: 'Critical', key: 'critical', min: 80, max: 89, color: '#dc2626' },
        { name: 'High', key: 'high', min: 65, max: 79, color: '#ef4444' },
        { name: 'Elevated', key: 'elevated', min: 50, max: 64, color: '#f97316' },
        { name: 'Medium', key: 'medium', min: 35, max: 49, color: '#eab308' },
        { name: 'Low', key: 'low', min: 20, max: 34, color: '#22c55e' },
        { name: 'Stable', key: 'stable', min: 0, max: 19, color: '#166534' }
      ]
    });
  } catch (error) {
    console.error('[churn-prediction] Distribution error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
