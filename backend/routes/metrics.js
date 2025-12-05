// backend/routes/metrics.js - Real dashboard metrics
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
// GET /metrics/dashboard - Real-time dashboard metrics
// ============================================================================
router.get("/dashboard", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';

    // Build WHERE clause based on role
    let clientWhereClause = '';
    let clientWhereParams = [];

    if (role === 'agent') {
      clientWhereClause = 'WHERE owner_id = $1';
      clientWhereParams = [userId];
    } else if (role === 'manager') {
      // Managers see their clients + their team's clients
      clientWhereClause = `
        WHERE owner_id IN (
          SELECT id FROM users WHERE id = $1 OR manager_id = $1
        )
      `;
      clientWhereParams = [userId];
    } else {
      // FMO/admin see all clients in their organization
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
      const orgId = userOrg.rows[0]?.organization_id;
      if (orgId) {
        clientWhereClause = `
          WHERE owner_id IN (
            SELECT id FROM users WHERE organization_id = $1
          )
        `;
        clientWhereParams = [orgId];
      }
    }

    // 1. Total Clients
    const totalClientsQuery = `
      SELECT COUNT(*) as count
      FROM clients
      ${clientWhereClause}
    `;
    const totalClientsResult = await db.query(totalClientsQuery, clientWhereParams);
    const totalClients = parseInt(totalClientsResult.rows[0]?.count || 0);

    // 2. New Clients (this month)
    const newClientsQuery = `
      SELECT COUNT(*) as count
      FROM clients
      ${clientWhereClause}
      ${clientWhereClause ? 'AND' : 'WHERE'} created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const newClientsResult = await db.query(newClientsQuery, clientWhereParams);
    const newClients = parseInt(newClientsResult.rows[0]?.count || 0);

    // 3. Churned Clients (30 days)
    // Note: We don't have a churn_date field yet, so we'll estimate based on
    // clients with no communication in 180+ days and status = inactive
    const churnedQuery = `
      SELECT COUNT(*) as count
      FROM clients c
      ${clientWhereClause}
      ${clientWhereClause ? 'AND' : 'WHERE'} c.status = 'inactive'
      AND NOT EXISTS (
        SELECT 1 FROM communications
        WHERE client_id = c.id
        AND created_at > CURRENT_DATE - INTERVAL '180 days'
      )
    `;
    const churnedResult = await db.query(churnedQuery, clientWhereParams);
    const churned = parseInt(churnedResult.rows[0]?.count || 0);

    // 4. Retention Rate
    // Active clients = clients with communication in last 90 days OR created in last 30 days
    const activeClientsQuery = `
      SELECT COUNT(DISTINCT c.id) as count
      FROM clients c
      ${clientWhereClause}
      ${clientWhereClause ? 'AND' : 'WHERE'} (
        c.created_at > CURRENT_DATE - INTERVAL '30 days'
        OR EXISTS (
          SELECT 1 FROM communications
          WHERE client_id = c.id
          AND created_at > CURRENT_DATE - INTERVAL '90 days'
        )
      )
    `;
    const activeClientsResult = await db.query(activeClientsQuery, clientWhereParams);
    const activeClients = parseInt(activeClientsResult.rows[0]?.count || 0);
    const retentionRate = totalClients > 0
      ? ((activeClients / totalClients) * 100).toFixed(1)
      : "0.0";

    // 5. Tasks Due (not completed)
    const tasksQuery = `
      SELECT COUNT(*) as count
      FROM tasks
      WHERE assigned_to = $1
      AND status NOT IN ('done', 'completed')
    `;
    const tasksResult = await db.query(tasksQuery, [userId]);
    const tasksDue = parseInt(tasksResult.rows[0]?.count || 0);

    // 6. High-risk clients (risk score >= 70)
    const highRiskQuery = `
      SELECT COUNT(*) as count
      FROM clients
      ${clientWhereClause}
      ${clientWhereClause ? 'AND' : 'WHERE'} risk_score >= 70
    `;
    const highRiskResult = await db.query(highRiskQuery, clientWhereParams);
    const highRiskClients = parseInt(highRiskResult.rows[0]?.count || 0);

    // 7. Recent activity count (last 7 days)
    const recentActivityQuery = `
      SELECT COUNT(*) as count
      FROM communications
      WHERE client_id IN (
        SELECT id FROM clients ${clientWhereClause}
      )
      AND created_at > CURRENT_DATE - INTERVAL '7 days'
    `;
    const recentActivityResult = await db.query(recentActivityQuery, clientWhereParams);
    const recentActivity = parseInt(recentActivityResult.rows[0]?.count || 0);

    return res.json({
      ok: true,
      data: {
        totalClients,
        newClients,
        churned,
        retentionRate: `${retentionRate}%`,
        tasksDue,
        highRiskClients,
        activeClients,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /metrics/recent-activity - Recent communications for dashboard
// ============================================================================
router.get("/recent-activity", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';
    const limit = parseInt(req.query.limit) || 10;

    // Build client filter based on role
    let clientFilter = '';
    let params = [limit];

    if (role === 'agent') {
      clientFilter = 'AND c.owner_id = $2';
      params.push(userId);
    } else if (role === 'manager') {
      clientFilter = `
        AND c.owner_id IN (
          SELECT id FROM users WHERE id = $2 OR manager_id = $2
        )
      `;
      params.push(userId);
    } else {
      // FMO/admin see all in org
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
      const orgId = userOrg.rows[0]?.organization_id;
      if (orgId) {
        clientFilter = `
          AND c.owner_id IN (
            SELECT id FROM users WHERE organization_id = $2
          )
        `;
        params.push(orgId);
      }
    }

    const query = `
      SELECT
        comm.id,
        comm.type,
        comm.direction,
        comm.subject,
        comm.body,
        comm.created_at,
        c.first_name,
        c.last_name,
        CONCAT(c.first_name, ' ', c.last_name) as client_name
      FROM communications comm
      JOIN clients c ON comm.client_id = c.id
      WHERE 1=1 ${clientFilter}
      ORDER BY comm.created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, params);

    const activities = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      direction: row.direction,
      subject: row.subject,
      body: row.body,
      clientName: row.client_name,
      createdAt: row.created_at,
    }));

    return res.json({ ok: true, data: activities });

  } catch (error) {
    console.error('Recent activity error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /metrics/at-risk-clients - High-risk clients for dashboard
// ============================================================================
router.get("/at-risk-clients", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';
    const limit = parseInt(req.query.limit) || 10;
    const minRiskScore = parseInt(req.query.minScore) || 70;

    // Build WHERE clause based on role
    let clientWhereClause = '';
    let clientWhereParams = [minRiskScore, limit];

    if (role === 'agent') {
      clientWhereClause = 'WHERE owner_id = $3';
      clientWhereParams.push(userId);
    } else if (role === 'manager') {
      clientWhereClause = `
        WHERE owner_id IN (
          SELECT id FROM users WHERE id = $3 OR manager_id = $3
        )
      `;
      clientWhereParams.push(userId);
    } else {
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
      const orgId = userOrg.rows[0]?.organization_id;
      if (orgId) {
        clientWhereClause = `
          WHERE owner_id IN (
            SELECT id FROM users WHERE organization_id = $3
          )
        `;
        clientWhereParams.push(orgId);
      }
    }

    const query = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        risk_score,
        status,
        created_at
      FROM clients
      ${clientWhereClause}
      ${clientWhereClause ? 'AND' : 'WHERE'} risk_score >= $1
      ORDER BY risk_score DESC
      LIMIT $2
    `;

    const result = await db.query(query, clientWhereParams);

    const atRiskClients = result.rows.map(row => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      email: row.email,
      riskScore: row.risk_score,
      lastContact: row.created_at, // Use created_at as fallback
      status: row.status,
      riskLevel: row.risk_score >= 80 ? 'High' : row.risk_score >= 60 ? 'Medium' : 'Low',
    }));

    return res.json({ ok: true, data: atRiskClients });

  } catch (error) {
    console.error('At-risk clients error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /metrics/alerts - Dashboard alerts
// ============================================================================
router.get("/alerts", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';
    const alerts = [];

    // Build client filter
    let clientFilter = '';
    let params = [];

    if (role === 'agent') {
      clientFilter = 'WHERE owner_id = $1';
      params = [userId];
    } else if (role === 'manager') {
      clientFilter = `
        WHERE owner_id IN (
          SELECT id FROM users WHERE id = $1 OR manager_id = $1
        )
      `;
      params = [userId];
    } else {
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
      const orgId = userOrg.rows[0]?.organization_id;
      if (orgId) {
        clientFilter = `
          WHERE owner_id IN (
            SELECT id FROM users WHERE organization_id = $1
          )
        `;
        params = [orgId];
      }
    }

    // 1. Tasks overdue
    const overdueTasksQuery = `
      SELECT COUNT(*) as count
      FROM tasks
      WHERE assigned_to = $1
      AND status NOT IN ('done', 'completed')
      AND due_date < CURRENT_TIMESTAMP
    `;
    const overdueResult = await db.query(overdueTasksQuery, [userId]);
    const overdueCount = parseInt(overdueResult.rows[0]?.count || 0);
    if (overdueCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`,
      });
    }

    // 2. High-risk clients
    const highRiskQuery = `
      SELECT COUNT(*) as count
      FROM clients
      ${clientFilter}
      ${clientFilter ? 'AND' : 'WHERE'} risk_score >= 80
    `;
    const highRiskResult = await db.query(highRiskQuery, params);
    const highRiskCount = parseInt(highRiskResult.rows[0]?.count || 0);
    if (highRiskCount > 0) {
      alerts.push({
        type: 'warning',
        message: `${highRiskCount} high-risk client${highRiskCount > 1 ? 's' : ''} need attention`,
      });
    }

    // 3. Clients with no recent contact (90+ days)
    const noContactQuery = `
      SELECT COUNT(*) as count
      FROM clients c
      ${clientFilter}
      ${clientFilter ? 'AND' : 'WHERE'} NOT EXISTS (
        SELECT 1 FROM communications
        WHERE client_id = c.id
        AND created_at > CURRENT_DATE - INTERVAL '90 days'
      )
      AND c.status = 'active'
    `;
    const noContactResult = await db.query(noContactQuery, params);
    const noContactCount = parseInt(noContactResult.rows[0]?.count || 0);
    if (noContactCount > 0) {
      alerts.push({
        type: 'info',
        message: `${noContactCount} client${noContactCount > 1 ? 's' : ''} with no contact in 90+ days`,
      });
    }

    // 4. Tasks due today
    const dueTodayQuery = `
      SELECT COUNT(*) as count
      FROM tasks
      WHERE assigned_to = $1
      AND status NOT IN ('done', 'completed')
      AND DATE(due_date) = CURRENT_DATE
    `;
    const dueTodayResult = await db.query(dueTodayQuery, [userId]);
    const dueTodayCount = parseInt(dueTodayResult.rows[0]?.count || 0);
    if (dueTodayCount > 0) {
      alerts.push({
        type: 'info',
        message: `${dueTodayCount} task${dueTodayCount > 1 ? 's' : ''} due today`,
      });
    }

    return res.json({ ok: true, data: alerts });

  } catch (error) {
    console.error('Alerts error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /metrics/founder - Comprehensive founder/FMO metrics for pilot tracking
// ============================================================================
router.get("/founder", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';

    // Only admin/FMO/agency can access founder metrics
    if (!['admin', 'fmo', 'agency'].includes(role)) {
      return res.status(403).json({ ok: false, error: "Access denied - Founder metrics require admin, FMO, or agency role" });
    }

    // Get organization ID for filtering
    const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
    const orgId = userOrg.rows[0]?.organization_id;

    // If no org, return empty metrics
    if (!orgId) {
      return res.json({
        ok: true,
        data: {
          agents: { total: 0, active: 0, inactive: 0 },
          clients: { total: 0, perAgent: [] },
          retention: { overall: "0.0%", perAgent: [] },
          communications: { total: 0, byType: {}, perAgent: [] },
          tasks: { total: 0, completed: 0, completionRate: "0.0%" },
          adoption: { csvImports: 0, avgLoginsPerAgent: 0 },
          topPerformers: []
        }
      });
    }

    // =========================================================================
    // 1. AGENT METRICS
    // =========================================================================

    // Total agents in organization
    const totalAgentsQuery = `
      SELECT COUNT(*) as count
      FROM users
      WHERE organization_id = $1
    `;
    const totalAgentsResult = await db.query(totalAgentsQuery, [orgId]);
    const totalAgents = parseInt(totalAgentsResult.rows[0]?.count || 0);

    // Active agents (logged in within last 7 days)
    const activeAgentsQuery = `
      SELECT COUNT(*) as count
      FROM users
      WHERE organization_id = $1
      AND last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    `;
    const activeAgentsResult = await db.query(activeAgentsQuery, [orgId]);
    const activeAgents = parseInt(activeAgentsResult.rows[0]?.count || 0);

    const inactiveAgents = totalAgents - activeAgents;

    // =========================================================================
    // 2. CLIENT METRICS
    // =========================================================================

    // Total clients across all agents
    const totalClientsQuery = `
      SELECT COUNT(*) as count
      FROM clients
      WHERE owner_id IN (
        SELECT id FROM users WHERE organization_id = $1
      )
    `;
    const totalClientsResult = await db.query(totalClientsQuery, [orgId]);
    const totalClients = parseInt(totalClientsResult.rows[0]?.count || 0);

    // Clients per agent
    const clientsPerAgentQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(c.id) as client_count,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_count
      FROM users u
      LEFT JOIN clients c ON c.owner_id = u.id
      WHERE u.organization_id = $1
      GROUP BY u.id, u.name, u.email
      ORDER BY client_count DESC
    `;
    const clientsPerAgentResult = await db.query(clientsPerAgentQuery, [orgId]);
    const clientsPerAgent = clientsPerAgentResult.rows.map(row => ({
      agentId: row.id,
      agentName: row.name,
      agentEmail: row.email,
      totalClients: parseInt(row.client_count),
      activeClients: parseInt(row.active_count)
    }));

    // =========================================================================
    // 3. RETENTION METRICS
    // =========================================================================

    // Overall retention rate (active clients / total clients)
    const activeClientsQuery = `
      SELECT COUNT(*) as count
      FROM clients
      WHERE owner_id IN (
        SELECT id FROM users WHERE organization_id = $1
      )
      AND status = 'active'
    `;
    const activeClientsResult = await db.query(activeClientsQuery, [orgId]);
    const activeClientsCount = parseInt(activeClientsResult.rows[0]?.count || 0);
    const overallRetention = totalClients > 0
      ? ((activeClientsCount / totalClients) * 100).toFixed(1)
      : "0.0";

    // Retention per agent
    const retentionPerAgent = clientsPerAgent.map(agent => ({
      agentName: agent.agentName,
      retentionRate: agent.totalClients > 0
        ? ((agent.activeClients / agent.totalClients) * 100).toFixed(1) + "%"
        : "0.0%"
    }));

    // =========================================================================
    // 4. COMMUNICATION METRICS
    // =========================================================================

    // Total communications
    const totalCommsQuery = `
      SELECT COUNT(*) as count
      FROM communications
      WHERE client_id IN (
        SELECT id FROM clients
        WHERE owner_id IN (
          SELECT id FROM users WHERE organization_id = $1
        )
      )
    `;
    const totalCommsResult = await db.query(totalCommsQuery, [orgId]);
    const totalComms = parseInt(totalCommsResult.rows[0]?.count || 0);

    // Communications by type
    const commsByTypeQuery = `
      SELECT
        type,
        COUNT(*) as count
      FROM communications
      WHERE client_id IN (
        SELECT id FROM clients
        WHERE owner_id IN (
          SELECT id FROM users WHERE organization_id = $1
        )
      )
      GROUP BY type
    `;
    const commsByTypeResult = await db.query(commsByTypeQuery, [orgId]);
    const commsByType = {};
    commsByTypeResult.rows.forEach(row => {
      commsByType[row.type] = parseInt(row.count);
    });

    // Communications per agent
    const commsPerAgentQuery = `
      SELECT
        u.name,
        COUNT(comm.id) as comm_count
      FROM users u
      LEFT JOIN clients c ON c.owner_id = u.id
      LEFT JOIN communications comm ON comm.client_id = c.id
      WHERE u.organization_id = $1
      GROUP BY u.name
      ORDER BY comm_count DESC
    `;
    const commsPerAgentResult = await db.query(commsPerAgentQuery, [orgId]);
    const commsPerAgent = commsPerAgentResult.rows.map(row => ({
      agentName: row.name,
      totalCommunications: parseInt(row.comm_count || 0)
    }));

    // =========================================================================
    // 5. TASK METRICS
    // =========================================================================

    // Total tasks and completed tasks
    const tasksQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('done', 'completed') THEN 1 END) as completed
      FROM tasks
      WHERE assigned_to IN (
        SELECT id FROM users WHERE organization_id = $1
      )
    `;
    const tasksResult = await db.query(tasksQuery, [orgId]);
    const totalTasks = parseInt(tasksResult.rows[0]?.total || 0);
    const completedTasks = parseInt(tasksResult.rows[0]?.completed || 0);
    const taskCompletionRate = totalTasks > 0
      ? ((completedTasks / totalTasks) * 100).toFixed(1)
      : "0.0";

    // =========================================================================
    // 6. ADOPTION METRICS
    // =========================================================================

    // CSV imports (estimated by tracking client creation dates)
    // We'll count bulk adds as CSV imports (5+ clients added on same day by same agent)
    const csvImportsQuery = `
      SELECT COUNT(DISTINCT DATE(created_at) || '-' || owner_id) as import_count
      FROM (
        SELECT owner_id, DATE(created_at) as created_at, COUNT(*) as daily_count
        FROM clients
        WHERE owner_id IN (
          SELECT id FROM users WHERE organization_id = $1
        )
        GROUP BY owner_id, DATE(created_at)
        HAVING COUNT(*) >= 5
      ) bulk_adds
    `;
    const csvImportsResult = await db.query(csvImportsQuery, [orgId]);
    const csvImports = parseInt(csvImportsResult.rows[0]?.import_count || 0);

    // Average logins per agent (based on last_login timestamp)
    // This is a simplified metric - in production you'd track login events
    const avgLoginsPerAgent = totalAgents > 0 ? (activeAgents / totalAgents * 7).toFixed(1) : "0.0";

    // =========================================================================
    // 7. TOP PERFORMERS
    // =========================================================================

    // Top performers by client count + retention + activity
    const topPerformersQuery = `
      SELECT
        u.name,
        COUNT(DISTINCT c.id) as client_count,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_count,
        COUNT(comm.id) as comm_count
      FROM users u
      LEFT JOIN clients c ON c.owner_id = u.id
      LEFT JOIN communications comm ON comm.client_id = c.id
      WHERE u.organization_id = $1
      GROUP BY u.name
      ORDER BY client_count DESC, comm_count DESC
      LIMIT 5
    `;
    const topPerformersResult = await db.query(topPerformersQuery, [orgId]);
    const topPerformers = topPerformersResult.rows.map(row => ({
      agentName: row.name,
      clientCount: parseInt(row.client_count || 0),
      activeClients: parseInt(row.active_count || 0),
      totalCommunications: parseInt(row.comm_count || 0),
      retentionRate: row.client_count > 0
        ? ((parseInt(row.active_count || 0) / parseInt(row.client_count)) * 100).toFixed(1) + "%"
        : "0.0%"
    }));

    // =========================================================================
    // RETURN COMPREHENSIVE METRICS
    // =========================================================================

    return res.json({
      ok: true,
      data: {
        agents: {
          total: totalAgents,
          active: activeAgents,
          inactive: inactiveAgents
        },
        clients: {
          total: totalClients,
          perAgent: clientsPerAgent
        },
        retention: {
          overall: `${overallRetention}%`,
          perAgent: retentionPerAgent
        },
        communications: {
          total: totalComms,
          byType: commsByType,
          perAgent: commsPerAgent
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: `${taskCompletionRate}%`
        },
        adoption: {
          csvImports,
          avgLoginsPerAgent: parseFloat(avgLoginsPerAgent)
        },
        topPerformers
      }
    });

  } catch (error) {
    console.error('Founder metrics error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /metrics/retention-trend - Monthly retention rates for last 12 months
// ============================================================================
router.get("/retention-trend", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';

    // Build client filter based on role
    let clientFilter = 'c.owner_id = $1';
    let params = [userId];

    if (role === 'manager') {
      clientFilter = `c.owner_id IN (SELECT id FROM users WHERE id = $1 OR manager_id = $1)`;
    } else if (['admin', 'fmo', 'agency'].includes(role)) {
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
      const orgId = userOrg.rows[0]?.organization_id;
      if (orgId) {
        clientFilter = `c.owner_id IN (SELECT id FROM users WHERE organization_id = $1)`;
        params = [orgId];
      }
    }

    // Get retention data for last 12 months
    // Retention = (clients at end of month - new clients in month) / clients at start of month
    // Simplified: active clients / total clients for each month
    const trendQuery = `
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        )::date AS month_start
      ),
      monthly_stats AS (
        SELECT
          m.month_start,
          TO_CHAR(m.month_start, 'Mon') AS month_name,
          EXTRACT(YEAR FROM m.month_start) AS year,
          -- Total clients at end of month
          (SELECT COUNT(*) FROM clients c
           WHERE ${clientFilter}
           AND c.created_at <= (m.month_start + INTERVAL '1 month - 1 day')
          ) AS total_clients,
          -- Churned clients that month (status changed to inactive/churned)
          (SELECT COUNT(*) FROM clients c
           WHERE ${clientFilter}
           AND c.status IN ('inactive', 'churned')
           AND DATE_TRUNC('month', c.updated_at) = m.month_start
          ) AS churned_that_month,
          -- Clients with activity that month
          (SELECT COUNT(DISTINCT c.id) FROM clients c
           LEFT JOIN communications comm ON comm.client_id = c.id
           WHERE ${clientFilter}
           AND c.created_at <= (m.month_start + INTERVAL '1 month - 1 day')
           AND (
             c.created_at >= m.month_start
             OR comm.created_at BETWEEN m.month_start AND (m.month_start + INTERVAL '1 month - 1 day')
           )
          ) AS active_clients
      )
      SELECT
        month_name,
        year,
        total_clients,
        active_clients,
        churned_that_month,
        CASE
          WHEN total_clients > 0 THEN ROUND((active_clients::numeric / total_clients::numeric) * 100, 1)
          ELSE 100
        END AS retention_rate
      FROM monthly_stats
      ORDER BY month_start ASC
    `;

    const result = await db.query(trendQuery, params);

    // Format response
    const trendData = result.rows.map(row => ({
      month: row.month_name,
      year: parseInt(row.year),
      retention: parseFloat(row.retention_rate) || 100,
      totalClients: parseInt(row.total_clients) || 0,
      activeClients: parseInt(row.active_clients) || 0,
      churned: parseInt(row.churned_that_month) || 0
    }));

    // If no data, return reasonable defaults
    if (trendData.length === 0 || trendData.every(d => d.totalClients === 0)) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const defaultData = [];
      for (let i = 0; i < 12; i++) {
        const monthIdx = (currentMonth - 11 + i + 12) % 12;
        defaultData.push({
          month: months[monthIdx],
          retention: 100,
          totalClients: 0,
          activeClients: 0,
          churned: 0
        });
      }
      return res.json({ ok: true, data: defaultData, isEmpty: true });
    }

    return res.json({ ok: true, data: trendData, isEmpty: false });

  } catch (error) {
    console.error('Retention trend error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// ============================================================================
// GET /metrics/churn-breakdown - Churn reasons breakdown
// ============================================================================
router.get("/churn-breakdown", async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'agent';

    // Build client filter based on role
    let clientFilter = 'c.owner_id = $1';
    let params = [userId];

    if (role === 'manager') {
      clientFilter = `c.owner_id IN (SELECT id FROM users WHERE id = $1 OR manager_id = $1)`;
    } else if (['admin', 'fmo', 'agency'].includes(role)) {
      const userOrg = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId]);
      const orgId = userOrg.rows[0]?.organization_id;
      if (orgId) {
        clientFilter = `c.owner_id IN (SELECT id FROM users WHERE organization_id = $1)`;
        params = [orgId];
      }
    }

    // Try to get churn breakdown from churn_events table if it exists
    let breakdownData = [];

    try {
      const churnEventsQuery = `
        SELECT
          COALESCE(cr.reason_name, 'Unknown') as reason,
          COUNT(*) as count
        FROM churn_events ce
        JOIN clients c ON c.id = ce.client_id
        LEFT JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
        WHERE ${clientFilter}
        GROUP BY cr.reason_name
        ORDER BY count DESC
      `;
      const result = await db.query(churnEventsQuery, params);

      if (result.rows.length > 0) {
        const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        breakdownData = result.rows.map(row => ({
          name: row.reason,
          value: Math.round((parseInt(row.count) / total) * 100),
          count: parseInt(row.count)
        }));
      }
    } catch (e) {
      // churn_events table might not exist, continue with fallback
    }

    // If no data from churn_events, analyze from client data
    if (breakdownData.length === 0) {
      // Analyze churned/inactive clients by various factors
      const analysisQuery = `
        SELECT
          CASE
            WHEN c.carrier IS NOT NULL AND c.carrier != '' AND c.status IN ('inactive', 'churned')
              THEN 'Carrier Change'
            WHEN c.risk_score >= 80 AND c.status IN ('inactive', 'churned')
              THEN 'High Risk - No Contact'
            WHEN c.status = 'churned'
              THEN 'Client Left'
            WHEN c.status = 'inactive'
              THEN 'Inactive'
            ELSE 'Other'
          END as category,
          COUNT(*) as count
        FROM clients c
        WHERE ${clientFilter}
        AND c.status IN ('inactive', 'churned')
        GROUP BY
          CASE
            WHEN c.carrier IS NOT NULL AND c.carrier != '' AND c.status IN ('inactive', 'churned')
              THEN 'Carrier Change'
            WHEN c.risk_score >= 80 AND c.status IN ('inactive', 'churned')
              THEN 'High Risk - No Contact'
            WHEN c.status = 'churned'
              THEN 'Client Left'
            WHEN c.status = 'inactive'
              THEN 'Inactive'
            ELSE 'Other'
          END
        ORDER BY count DESC
      `;

      try {
        const result = await db.query(analysisQuery, params);

        if (result.rows.length > 0) {
          const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
          breakdownData = result.rows.map(row => ({
            name: row.category,
            value: Math.round((parseInt(row.count) / total) * 100),
            count: parseInt(row.count)
          }));
        }
      } catch (e) {
        console.error('Churn analysis fallback error:', e);
      }
    }

    // If still no data, return a meaningful empty state
    if (breakdownData.length === 0) {
      return res.json({
        ok: true,
        data: [],
        isEmpty: true,
        message: "No churned clients to analyze"
      });
    }

    // Ensure percentages add up to 100
    const totalPercent = breakdownData.reduce((sum, d) => sum + d.value, 0);
    if (totalPercent !== 100 && breakdownData.length > 0) {
      breakdownData[0].value += (100 - totalPercent);
    }

    return res.json({
      ok: true,
      data: breakdownData,
      isEmpty: false,
      totalChurned: breakdownData.reduce((sum, d) => sum + (d.count || 0), 0)
    });

  } catch (error) {
    console.error('Churn breakdown error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
