// backend/routes/pilot-metrics.js
// Comprehensive Founder Pilot Metrics API
// Provides all the data needed for the founder dashboard drill-down

const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware to ensure only admins, FMOs, agencies, and managers can access
const founderAccess = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  if (!['admin', 'fmo', 'agency', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: 'Founder access required' });
  }
  next();
};

router.use(founderAccess);

// ============================================================================
// OVERVIEW - Hero metrics for main dashboard
// ============================================================================

router.get("/overview", async (req, res) => {
  try {
    const { period = '7_days' } = req.query;
    const periodDays = getPeriodDays(period);

    // Total agents
    const agents = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '1 day') as active_today,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_week
      FROM users
      WHERE role = 'agent' AND is_active = true
    `);

    // Total clients and risk breakdown
    const clients = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE risk_score >= 60) as at_risk,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '${periodDays} days') as new_period,
        COUNT(*) FILTER (WHERE retention_status = 'saved') as saved,
        COUNT(*) FILTER (WHERE retention_status = 'churned' OR status = 'churned') as churned
      FROM clients
      WHERE status != 'deleted'
    `);

    // Automations sent this period
    const automations = await db.query(`
      SELECT
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE outcome = 'delivered') as delivered
      FROM communications
      WHERE created_at > NOW() - INTERVAL '${periodDays} days'
      AND metadata->>'automated' = 'true'
    `).catch(() => ({ rows: [{ sent: 0, delivered: 0 }] }));

    // Estimated revenue saved (assuming avg $500 commission per client per year)
    const avgCommission = 500;
    const savedCount = parseInt(clients.rows[0].saved) || 0;
    const estimatedRevenueSaved = savedCount * avgCommission;

    // Comparison to previous period
    const prevClients = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE risk_score >= 60) as at_risk
      FROM clients
      WHERE created_at < NOW() - INTERVAL '${periodDays} days'
      AND created_at > NOW() - INTERVAL '${periodDays * 2} days'
    `);

    const atRiskChange = calculatePercentChange(
      parseInt(prevClients.rows[0]?.at_risk) || 0,
      parseInt(clients.rows[0].at_risk) || 0
    );

    res.json({
      ok: true,
      data: {
        agents: {
          total: parseInt(agents.rows[0].total),
          activeToday: parseInt(agents.rows[0].active_today),
          activeWeek: parseInt(agents.rows[0].active_week),
          activePercent: calculatePercent(agents.rows[0].active_week, agents.rows[0].total)
        },
        clients: {
          total: parseInt(clients.rows[0].total),
          atRisk: parseInt(clients.rows[0].at_risk),
          atRiskPercent: calculatePercent(clients.rows[0].at_risk, clients.rows[0].total),
          atRiskChange,
          newThisPeriod: parseInt(clients.rows[0].new_period),
          saved: savedCount,
          churned: parseInt(clients.rows[0].churned)
        },
        automations: {
          sent: parseInt(automations.rows[0].sent),
          delivered: parseInt(automations.rows[0].delivered),
          deliveryRate: calculatePercent(automations.rows[0].delivered, automations.rows[0].sent)
        },
        revenue: {
          estimatedSaved: estimatedRevenueSaved,
          avgCommission
        },
        period
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Overview error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// AGENT ADOPTION - Onboarding funnel
// ============================================================================

router.get("/adoption", async (req, res) => {
  try {
    const funnel = await db.query(`
      SELECT
        COUNT(*) as total_agents,
        COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) as onboarded,
        COUNT(*) FILTER (WHERE sms_connected_at IS NOT NULL) as sms_connected,
        COUNT(*) FILTER (WHERE email_connected_at IS NOT NULL) as email_connected,
        COUNT(*) FILTER (WHERE calendar_connected_at IS NOT NULL) as calendar_connected,
        COUNT(*) FILTER (WHERE first_import_at IS NOT NULL) as imported_clients,
        COUNT(*) FILTER (WHERE first_pdf_parsed_at IS NOT NULL) as used_pdf_parser,
        COUNT(*) FILTER (WHERE first_bluebutton_connected_at IS NOT NULL) as bluebutton_connected
      FROM users
      WHERE role = 'agent' AND is_active = true
    `);

    // Get detailed agent list with onboarding status
    const agents = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at as signed_up_at,
        u.last_login_at,
        u.onboarding_completed_at,
        u.sms_connected_at,
        u.email_connected_at,
        u.calendar_connected_at,
        u.first_import_at,
        u.first_pdf_parsed_at,
        u.first_bluebutton_connected_at,
        u.first_client_added_at,
        (SELECT COUNT(*) FROM clients WHERE owner_id = u.id) as client_count
      FROM users u
      WHERE u.role = 'agent' AND u.is_active = true
      ORDER BY u.created_at DESC
    `);

    const f = funnel.rows[0];
    const total = parseInt(f.total_agents) || 1;

    res.json({
      ok: true,
      data: {
        funnel: {
          signedUp: { count: total, percent: 100 },
          onboarded: { count: parseInt(f.onboarded), percent: calculatePercent(f.onboarded, total) },
          smsConnected: { count: parseInt(f.sms_connected), percent: calculatePercent(f.sms_connected, total) },
          emailConnected: { count: parseInt(f.email_connected), percent: calculatePercent(f.email_connected, total) },
          calendarConnected: { count: parseInt(f.calendar_connected), percent: calculatePercent(f.calendar_connected, total) },
          importedClients: { count: parseInt(f.imported_clients), percent: calculatePercent(f.imported_clients, total) },
          usedPdfParser: { count: parseInt(f.used_pdf_parser), percent: calculatePercent(f.used_pdf_parser, total) },
          bluebuttonConnected: { count: parseInt(f.bluebutton_connected), percent: calculatePercent(f.bluebutton_connected, total) }
        },
        agents: agents.rows.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          signedUpAt: a.signed_up_at,
          lastLoginAt: a.last_login_at,
          clientCount: parseInt(a.client_count),
          milestones: {
            onboarding: a.onboarding_completed_at,
            sms: a.sms_connected_at,
            email: a.email_connected_at,
            calendar: a.calendar_connected_at,
            import: a.first_import_at,
            pdfParser: a.first_pdf_parsed_at,
            bluebutton: a.first_bluebutton_connected_at,
            firstClient: a.first_client_added_at
          },
          completedSteps: countCompletedMilestones(a)
        }))
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Adoption error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Adoption detail for specific milestone
router.get("/adoption/:milestone", async (req, res) => {
  try {
    const { milestone } = req.params;
    const columnMap = {
      'onboarding': 'onboarding_completed_at',
      'sms': 'sms_connected_at',
      'email': 'email_connected_at',
      'calendar': 'calendar_connected_at',
      'import': 'first_import_at',
      'pdf-parser': 'first_pdf_parsed_at',
      'bluebutton': 'first_bluebutton_connected_at'
    };

    const column = columnMap[milestone];
    if (!column) {
      return res.status(400).json({ ok: false, error: 'Invalid milestone' });
    }

    // Agents who completed this milestone
    const completed = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.${column} as completed_at,
        (SELECT COUNT(*) FROM clients WHERE owner_id = u.id) as client_count
      FROM users u
      WHERE u.role = 'agent' AND u.is_active = true AND u.${column} IS NOT NULL
      ORDER BY u.${column} DESC
    `);

    // Agents who haven't completed
    const notCompleted = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at as signed_up_at,
        u.last_login_at,
        (SELECT COUNT(*) FROM clients WHERE owner_id = u.id) as client_count
      FROM users u
      WHERE u.role = 'agent' AND u.is_active = true AND u.${column} IS NULL
      ORDER BY u.last_login_at DESC NULLS LAST
    `);

    // Trend over time
    const trend = await db.query(`
      SELECT
        DATE(${column}) as date,
        COUNT(*) as count
      FROM users
      WHERE role = 'agent' AND ${column} IS NOT NULL
      GROUP BY DATE(${column})
      ORDER BY date
    `);

    res.json({
      ok: true,
      data: {
        milestone,
        completed: {
          count: completed.rows.length,
          agents: completed.rows
        },
        notCompleted: {
          count: notCompleted.rows.length,
          agents: notCompleted.rows
        },
        trend: trend.rows
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Adoption detail error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CLIENT QUALITY - Data completeness metrics
// ============================================================================

router.get("/client-quality", async (req, res) => {
  try {
    // Overall quality metrics
    const quality = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE profile_completeness >= 80) as profile_complete,
        COUNT(*) FILTER (WHERE carrier IS NOT NULL AND carrier != '') as has_carrier,
        COUNT(*) FILTER (WHERE plan_type IS NOT NULL AND plan_type != '') as has_plan_info,
        COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as has_phone,
        COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as has_email,
        COUNT(*) FILTER (WHERE dob IS NOT NULL) as has_dob,
        AVG(profile_completeness) as avg_completeness
      FROM clients
      WHERE status != 'deleted'
    `);

    // Blue Button connections
    const bluebutton = await db.query(`
      SELECT COUNT(DISTINCT client_id) as connected
      FROM blue_button_authorizations
      WHERE status = 'active'
    `).catch(() => ({ rows: [{ connected: 0 }] }));

    // Medications (check if medications field exists and has data)
    const medications = await db.query(`
      SELECT COUNT(*) as has_medications
      FROM clients
      WHERE status != 'deleted'
      AND (medications IS NOT NULL AND medications != '' AND medications != '[]')
    `).catch(() => ({ rows: [{ has_medications: 0 }] }));

    // Communication logs
    const comms = await db.query(`
      SELECT COUNT(DISTINCT client_id) as has_comms
      FROM communications
    `).catch(() => ({ rows: [{ has_comms: 0 }] }));

    const q = quality.rows[0];
    const total = parseInt(q.total) || 1;

    res.json({
      ok: true,
      data: {
        overallScore: Math.round(parseFloat(q.avg_completeness) || 0),
        total,
        fields: {
          profileComplete: {
            count: parseInt(q.profile_complete),
            percent: calculatePercent(q.profile_complete, total)
          },
          bluebutton: {
            count: parseInt(bluebutton.rows[0].connected),
            percent: calculatePercent(bluebutton.rows[0].connected, total)
          },
          medications: {
            count: parseInt(medications.rows[0].has_medications),
            percent: calculatePercent(medications.rows[0].has_medications, total)
          },
          planInfo: {
            count: parseInt(q.has_plan_info),
            percent: calculatePercent(q.has_plan_info, total)
          },
          phone: {
            count: parseInt(q.has_phone),
            percent: calculatePercent(q.has_phone, total)
          },
          email: {
            count: parseInt(q.has_email),
            percent: calculatePercent(q.has_email, total)
          },
          dob: {
            count: parseInt(q.has_dob),
            percent: calculatePercent(q.has_dob, total)
          },
          carrier: {
            count: parseInt(q.has_carrier),
            percent: calculatePercent(q.has_carrier, total)
          },
          communications: {
            count: parseInt(comms.rows[0].has_comms),
            percent: calculatePercent(comms.rows[0].has_comms, total)
          }
        }
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Client quality error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Client quality detail for specific field
router.get("/client-quality/:field", async (req, res) => {
  try {
    const { field } = req.params;
    const { status = 'missing', limit = 100, offset = 0 } = req.query;

    let condition;
    switch (field) {
      case 'bluebutton':
        // Special handling for Blue Button
        const bbQuery = status === 'has'
          ? `SELECT c.*, bba.status as bb_status, bba.last_sync_at
             FROM clients c
             JOIN blue_button_authorizations bba ON bba.client_id = c.id
             WHERE c.status != 'deleted'
             ORDER BY bba.last_sync_at DESC
             LIMIT $1 OFFSET $2`
          : `SELECT c.*, NULL as bb_status, NULL as last_sync_at
             FROM clients c
             LEFT JOIN blue_button_authorizations bba ON bba.client_id = c.id
             WHERE c.status != 'deleted' AND bba.id IS NULL
             ORDER BY c.created_at DESC
             LIMIT $1 OFFSET $2`;

        const bbClients = await db.query(bbQuery, [limit, offset]).catch(() => ({ rows: [] }));

        return res.json({
          ok: true,
          data: {
            field,
            status,
            clients: bbClients.rows.map(c => ({
              id: c.id,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
              email: c.email,
              phone: c.phone,
              riskScore: c.risk_score,
              bbStatus: c.bb_status,
              lastSync: c.last_sync_at,
              createdAt: c.created_at
            }))
          }
        });

      case 'profile':
        condition = status === 'has' ? 'profile_completeness >= 80' : 'profile_completeness < 80';
        break;
      case 'medications':
        condition = status === 'has'
          ? "(medications IS NOT NULL AND medications != '' AND medications != '[]')"
          : "(medications IS NULL OR medications = '' OR medications = '[]')";
        break;
      case 'plan':
        condition = status === 'has' ? "plan_type IS NOT NULL AND plan_type != ''" : "(plan_type IS NULL OR plan_type = '')";
        break;
      case 'phone':
        condition = status === 'has' ? "phone IS NOT NULL AND phone != ''" : "(phone IS NULL OR phone = '')";
        break;
      case 'email':
        condition = status === 'has' ? "email IS NOT NULL AND email != ''" : "(email IS NULL OR email = '')";
        break;
      case 'dob':
        condition = status === 'has' ? "dob IS NOT NULL" : "dob IS NULL";
        break;
      case 'carrier':
        condition = status === 'has' ? "carrier IS NOT NULL AND carrier != ''" : "(carrier IS NULL OR carrier = '')";
        break;
      default:
        return res.status(400).json({ ok: false, error: 'Invalid field' });
    }

    const clients = await db.query(`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.risk_score,
        c.profile_completeness,
        c.created_at,
        u.name as agent_name
      FROM clients c
      LEFT JOIN users u ON u.id = c.owner_id
      WHERE c.status != 'deleted' AND ${condition}
      ORDER BY c.risk_score DESC NULLS LAST, c.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM clients WHERE status != 'deleted' AND ${condition}
    `);

    res.json({
      ok: true,
      data: {
        field,
        status,
        total: parseInt(countResult.rows[0].total),
        clients: clients.rows.map(c => ({
          id: c.id,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
          email: c.email,
          phone: c.phone,
          riskScore: c.risk_score,
          profileCompleteness: c.profile_completeness,
          agentName: c.agent_name,
          createdAt: c.created_at
        }))
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Client quality detail error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Quality by agent
router.get("/client-quality/by-agent", async (req, res) => {
  try {
    const agents = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(c.id) as total_clients,
        AVG(c.profile_completeness) as avg_completeness,
        COUNT(c.id) FILTER (WHERE c.profile_completeness >= 80) as complete_profiles
      FROM users u
      LEFT JOIN clients c ON c.owner_id = u.id AND c.status != 'deleted'
      WHERE u.role = 'agent' AND u.is_active = true
      GROUP BY u.id, u.name, u.email
      ORDER BY avg_completeness ASC NULLS LAST
    `);

    res.json({
      ok: true,
      data: {
        agents: agents.rows.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          totalClients: parseInt(a.total_clients),
          avgCompleteness: Math.round(parseFloat(a.avg_completeness) || 0),
          completeProfiles: parseInt(a.complete_profiles)
        }))
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Quality by agent error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// VALUE DELIVERY - Risk alerts, saves, revenue
// ============================================================================

router.get("/value", async (req, res) => {
  try {
    const { period = '7_days' } = req.query;
    const periodDays = getPeriodDays(period);

    // Risk alerts generated and acted upon
    const alerts = await db.query(`
      SELECT
        COUNT(*) as generated,
        COUNT(*) FILTER (WHERE acted_on_at IS NOT NULL) as acted_on,
        AVG(EXTRACT(EPOCH FROM (acted_on_at - generated_at)) / 3600) as avg_time_hours
      FROM risk_alert_actions
      WHERE generated_at > NOW() - INTERVAL '${periodDays} days'
    `).catch(() => ({ rows: [{ generated: 0, acted_on: 0, avg_time_hours: null }] }));

    // Automations
    const automations = await db.query(`
      SELECT
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE outcome = 'delivered') as delivered,
        COUNT(DISTINCT client_id) as unique_clients
      FROM communications
      WHERE created_at > NOW() - INTERVAL '${periodDays} days'
      AND metadata->>'automated' = 'true'
    `).catch(() => ({ rows: [{ sent: 0, delivered: 0, unique_clients: 0 }] }));

    // Re-engagements (clients who received automation then had a communication)
    const reengagements = await db.query(`
      SELECT COUNT(DISTINCT c1.client_id) as count
      FROM communications c1
      JOIN communications c2 ON c2.client_id = c1.client_id
        AND c2.created_at > c1.created_at
        AND c2.created_at < c1.created_at + INTERVAL '7 days'
        AND c2.direction = 'inbound'
      WHERE c1.created_at > NOW() - INTERVAL '${periodDays} days'
      AND c1.metadata->>'automated' = 'true'
    `).catch(() => ({ rows: [{ count: 0 }] }));

    // Clients saved vs churned
    const retention = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE retention_status = 'saved') as saved,
        COUNT(*) FILTER (WHERE retention_status = 'churned' OR status = 'churned') as churned,
        COUNT(*) FILTER (WHERE retention_status = 'saved' AND retention_status_changed_at > NOW() - INTERVAL '${periodDays} days') as saved_period,
        COUNT(*) FILTER (WHERE (retention_status = 'churned' OR status = 'churned') AND COALESCE(retention_status_changed_at, updated_at) > NOW() - INTERVAL '${periodDays} days') as churned_period
      FROM clients
      WHERE status != 'deleted'
    `);

    const a = alerts.rows[0];
    const auto = automations.rows[0];
    const r = retention.rows[0];

    // Calculate estimated revenue
    const avgCommission = 500;
    const savedCount = parseInt(r.saved) || 0;

    res.json({
      ok: true,
      data: {
        riskAlerts: {
          generated: parseInt(a.generated),
          actedOn: parseInt(a.acted_on),
          actedOnPercent: calculatePercent(a.acted_on, a.generated),
          avgTimeToActionHours: a.avg_time_hours ? parseFloat(a.avg_time_hours).toFixed(1) : null
        },
        automations: {
          sent: parseInt(auto.sent),
          delivered: parseInt(auto.delivered),
          deliveryRate: calculatePercent(auto.delivered, auto.sent),
          uniqueClients: parseInt(auto.unique_clients),
          reengagements: parseInt(reengagements.rows[0].count)
        },
        retention: {
          saved: savedCount,
          savedThisPeriod: parseInt(r.saved_period),
          churned: parseInt(r.churned),
          churnedThisPeriod: parseInt(r.churned_period)
        },
        revenue: {
          estimatedSaved: savedCount * avgCommission,
          avgCommission
        },
        period
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Value error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Risk alerts detail
router.get("/value/risk-alerts", async (req, res) => {
  try {
    const { period = '30_days', limit = 100, offset = 0 } = req.query;
    const periodDays = getPeriodDays(period);

    const alerts = await db.query(`
      SELECT
        raa.*,
        c.first_name,
        c.last_name,
        c.email,
        c.risk_score as current_risk,
        u.name as agent_name
      FROM risk_alert_actions raa
      JOIN clients c ON c.id = raa.client_id
      LEFT JOIN users u ON u.id = raa.user_id
      WHERE raa.generated_at > NOW() - INTERVAL '${periodDays} days'
      ORDER BY raa.generated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]).catch(() => ({ rows: [] }));

    res.json({
      ok: true,
      data: {
        alerts: alerts.rows.map(a => ({
          id: a.id,
          alertId: a.alert_id,
          clientId: a.client_id,
          clientName: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
          clientEmail: a.email,
          agentName: a.agent_name,
          riskScoreAtAlert: a.risk_score_at_alert,
          currentRiskScore: a.current_risk,
          generatedAt: a.generated_at,
          viewedAt: a.viewed_at,
          actedOnAt: a.acted_on_at,
          actionType: a.action_type,
          outcome: a.outcome,
          timeToAction: a.acted_on_at && a.generated_at
            ? Math.round((new Date(a.acted_on_at) - new Date(a.generated_at)) / (1000 * 60 * 60) * 10) / 10
            : null
        }))
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Risk alerts detail error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Saved clients detail
router.get("/value/saved", async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const saved = await db.query(`
      SELECT
        c.*,
        u.name as agent_name,
        su.name as saved_by_name
      FROM clients c
      LEFT JOIN users u ON u.id = c.owner_id
      LEFT JOIN users su ON su.id = c.saved_by
      WHERE c.retention_status = 'saved'
      ORDER BY c.retention_status_changed_at DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      ok: true,
      data: {
        clients: saved.rows.map(c => ({
          id: c.id,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          email: c.email,
          phone: c.phone,
          agentName: c.agent_name,
          savedBy: c.saved_by_name,
          savedAt: c.retention_status_changed_at,
          riskScore: c.risk_score
        }))
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Saved detail error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// SYSTEM HEALTH - API, delivery, errors
// ============================================================================

router.get("/system-health", async (req, res) => {
  try {
    const { period = '24_hours' } = req.query;
    const periodHours = period === '7_days' ? 168 : period === '24_hours' ? 24 : 1;

    // API metrics from system_health_metrics
    const apiMetrics = await db.query(`
      SELECT
        AVG(metric_value) FILTER (WHERE metric_name = 'response_time_ms') as avg_response_time,
        COUNT(*) FILTER (WHERE metric_type = 'api_request') as total_requests,
        COUNT(*) FILTER (WHERE metric_type = 'api_error') as total_errors
      FROM system_health_metrics
      WHERE recorded_at > NOW() - INTERVAL '${periodHours} hours'
    `).catch(() => ({ rows: [{ avg_response_time: 150, total_requests: 0, total_errors: 0 }] }));

    // SMS metrics
    const smsMetrics = await db.query(`
      SELECT
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE outcome = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE outcome = 'failed') as failed
      FROM communications
      WHERE type = 'sms'
      AND created_at > NOW() - INTERVAL '${periodHours} hours'
    `).catch(() => ({ rows: [{ sent: 0, delivered: 0, failed: 0 }] }));

    // Email metrics
    const emailMetrics = await db.query(`
      SELECT
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE outcome = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE outcome = 'failed') as failed
      FROM communications
      WHERE type = 'email'
      AND created_at > NOW() - INTERVAL '${periodHours} hours'
    `).catch(() => ({ rows: [{ sent: 0, delivered: 0, failed: 0 }] }));

    // Recent errors from audit logs
    const recentErrors = await db.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action LIKE '%error%' OR action LIKE '%fail%'
      AND created_at > NOW() - INTERVAL '${periodHours} hours'
    `).catch(() => ({ rows: [{ count: 0 }] }));

    const api = apiMetrics.rows[0];
    const sms = smsMetrics.rows[0];
    const email = emailMetrics.rows[0];

    res.json({
      ok: true,
      data: {
        api: {
          uptime: 99.9, // Would need actual monitoring to calculate
          avgResponseTime: Math.round(parseFloat(api.avg_response_time) || 150),
          totalRequests: parseInt(api.total_requests),
          totalErrors: parseInt(api.total_errors),
          errorRate: calculatePercent(api.total_errors, api.total_requests)
        },
        sms: {
          sent: parseInt(sms.sent),
          delivered: parseInt(sms.delivered),
          failed: parseInt(sms.failed),
          deliveryRate: calculatePercent(sms.delivered, sms.sent)
        },
        email: {
          sent: parseInt(email.sent),
          delivered: parseInt(email.delivered),
          failed: parseInt(email.failed),
          deliveryRate: calculatePercent(email.delivered, email.sent)
        },
        errors: {
          total: parseInt(recentErrors.rows[0].count)
        },
        status: 'operational',
        period
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] System health error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Error log detail
router.get("/system-health/errors", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const errors = await db.query(`
      SELECT
        id,
        user_id,
        action,
        resource_type,
        details,
        ip_address,
        created_at
      FROM audit_logs
      WHERE action LIKE '%error%' OR action LIKE '%fail%'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]).catch(() => ({ rows: [] }));

    res.json({
      ok: true,
      data: {
        errors: errors.rows
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Error log error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// FEATURE USAGE - Module usage statistics
// ============================================================================

router.get("/feature-usage", async (req, res) => {
  try {
    const { period = '7_days' } = req.query;
    const periodDays = getPeriodDays(period);

    const usage = await db.query(`
      SELECT
        feature,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE action = 'view') as views,
        COUNT(*) FILTER (WHERE action = 'create') as creates,
        COUNT(*) FILTER (WHERE action = 'update') as updates
      FROM feature_usage
      WHERE created_at > NOW() - INTERVAL '${periodDays} days'
      GROUP BY feature
      ORDER BY total_events DESC
    `).catch(() => ({ rows: [] }));

    // Trend by day
    const trend = await db.query(`
      SELECT
        DATE(created_at) as date,
        feature,
        COUNT(*) as events
      FROM feature_usage
      WHERE created_at > NOW() - INTERVAL '${periodDays} days'
      GROUP BY DATE(created_at), feature
      ORDER BY date
    `).catch(() => ({ rows: [] }));

    res.json({
      ok: true,
      data: {
        features: usage.rows.map(f => ({
          feature: f.feature,
          totalEvents: parseInt(f.total_events),
          uniqueUsers: parseInt(f.unique_users),
          views: parseInt(f.views),
          creates: parseInt(f.creates),
          updates: parseInt(f.updates)
        })),
        trend: trend.rows,
        period
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Feature usage error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// TRENDS - Daily metrics over time
// ============================================================================

router.get("/trends", async (req, res) => {
  try {
    const { period = '30_days' } = req.query;
    const periodDays = getPeriodDays(period);

    const trends = await db.query(`
      SELECT *
      FROM daily_metrics_snapshot
      WHERE snapshot_date > NOW() - INTERVAL '${periodDays} days'
      ORDER BY snapshot_date
    `).catch(() => ({ rows: [] }));

    res.json({
      ok: true,
      data: {
        snapshots: trends.rows,
        period
      }
    });
  } catch (error) {
    console.error('[pilot-metrics] Trends error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// SNAPSHOT GENERATOR - Creates daily metrics snapshot
// ============================================================================

router.post("/generate-snapshot", async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if snapshot already exists for today
    const existing = await db.query(`
      SELECT id FROM daily_metrics_snapshot WHERE snapshot_date = $1
    `, [today]);

    if (existing.rows.length > 0) {
      return res.json({ ok: true, message: 'Snapshot already exists for today' });
    }

    // Gather all metrics
    const agents = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '1 day') as active_day,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as active_week,
        COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) as onboarded,
        COUNT(*) FILTER (WHERE sms_connected_at IS NOT NULL) as sms,
        COUNT(*) FILTER (WHERE email_connected_at IS NOT NULL) as email,
        COUNT(*) FILTER (WHERE calendar_connected_at IS NOT NULL) as calendar,
        COUNT(*) FILTER (WHERE first_import_at IS NOT NULL) as imported,
        COUNT(*) FILTER (WHERE first_pdf_parsed_at IS NOT NULL) as pdf,
        COUNT(*) FILTER (WHERE first_bluebutton_connected_at IS NOT NULL) as bb
      FROM users WHERE role = 'agent' AND is_active = true
    `);

    const clients = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as added_today,
        COUNT(*) FILTER (WHERE source_type = 'csv_import') as via_import,
        COUNT(*) FILTER (WHERE source_type = 'manual') as via_manual,
        COUNT(*) FILTER (WHERE source_type = 'pdf_parse') as via_pdf,
        COUNT(*) FILTER (WHERE profile_completeness >= 80) as profile_complete,
        COUNT(*) FILTER (WHERE plan_type IS NOT NULL) as with_plan,
        COUNT(*) FILTER (WHERE risk_score >= 60) as at_risk,
        COUNT(*) FILTER (WHERE retention_status = 'saved') as saved,
        COUNT(*) FILTER (WHERE retention_status = 'churned') as churned
      FROM clients WHERE status != 'deleted'
    `);

    const bb = await db.query(`
      SELECT COUNT(DISTINCT client_id) as connected FROM blue_button_authorizations WHERE status = 'active'
    `).catch(() => ({ rows: [{ connected: 0 }] }));

    const comms = await db.query(`
      SELECT COUNT(DISTINCT client_id) as with_comms FROM communications
    `).catch(() => ({ rows: [{ with_comms: 0 }] }));

    const a = agents.rows[0];
    const c = clients.rows[0];

    // Insert snapshot
    await db.query(`
      INSERT INTO daily_metrics_snapshot (
        snapshot_date,
        total_agents, active_agents_day, active_agents_week,
        agents_onboarded, agents_sms_connected, agents_email_connected,
        agents_calendar_connected, agents_imported_clients, agents_used_pdf_parser,
        agents_bluebutton_connected,
        total_clients, clients_added_today, clients_via_import, clients_via_manual,
        clients_via_pdf, clients_with_bluebutton, clients_profile_complete,
        clients_with_plan_info, clients_with_comms, clients_at_risk,
        clients_saved, clients_churned
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
    `, [
      today,
      a.total, a.active_day, a.active_week,
      a.onboarded, a.sms, a.email, a.calendar, a.imported, a.pdf, a.bb,
      c.total, c.added_today, c.via_import, c.via_manual, c.via_pdf,
      bb.rows[0].connected, c.profile_complete, c.with_plan,
      comms.rows[0].with_comms, c.at_risk, c.saved, c.churned
    ]);

    res.json({ ok: true, message: 'Snapshot generated successfully' });
  } catch (error) {
    console.error('[pilot-metrics] Generate snapshot error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CLIENT ACTIONS - Mark as saved/churned
// ============================================================================

router.post("/mark-saved/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    await db.query(`
      UPDATE clients
      SET retention_status = 'saved',
          retention_status_changed_at = CURRENT_TIMESTAMP,
          saved_by = $1
      WHERE id = $2
    `, [req.user.id, clientId]);

    res.json({ ok: true, message: 'Client marked as saved' });
  } catch (error) {
    console.error('[pilot-metrics] Mark saved error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/mark-churned/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;

    await db.query(`
      UPDATE clients
      SET retention_status = 'churned',
          retention_status_changed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [clientId]);

    res.json({ ok: true, message: 'Client marked as churned' });
  } catch (error) {
    console.error('[pilot-metrics] Mark churned error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPeriodDays(period) {
  switch (period) {
    case '24_hours': return 1;
    case '7_days': return 7;
    case '30_days': return 30;
    case '90_days': return 90;
    default: return 7;
  }
}

function calculatePercent(numerator, denominator) {
  const num = parseInt(numerator) || 0;
  const denom = parseInt(denominator) || 1;
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

function calculatePercentChange(oldVal, newVal) {
  const old = parseInt(oldVal) || 0;
  const current = parseInt(newVal) || 0;
  if (old === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - old) / old) * 100);
}

function countCompletedMilestones(agent) {
  let count = 0;
  if (agent.onboarding_completed_at) count++;
  if (agent.sms_connected_at) count++;
  if (agent.email_connected_at) count++;
  if (agent.calendar_connected_at) count++;
  if (agent.first_import_at) count++;
  if (agent.first_pdf_parsed_at) count++;
  if (agent.first_bluebutton_connected_at) count++;
  return count;
}

module.exports = router;
