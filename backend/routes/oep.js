// backend/routes/oep.js - OEP Retention Hub API routes
const express = require('express');
const db = require('../db');

const router = express.Router();

// ============================================================================
// MIDDLEWARE - Require Authentication
// ============================================================================
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

router.use(requireAuth);

// ============================================================================
// MERGE TAGS - Available for template personalization
// ============================================================================
const MERGE_TAGS = [
  { key: 'ClientName', tag: '{ClientName}', description: 'Client full name' },
  { key: 'FirstName', tag: '{FirstName}', description: 'Client first name' },
  { key: 'AgentName', tag: '{AgentName}', description: 'Your name' },
  { key: 'AgentPhone', tag: '{AgentPhone}', description: 'Your phone number' },
  { key: 'AgentEmail', tag: '{AgentEmail}', description: 'Your email' },
  { key: 'PolicyYear', tag: '{PolicyYear}', description: 'Policy year (e.g., 2026)' },
  { key: 'CurrentPlan', tag: '{CurrentPlan}', description: 'Client current plan name' },
  { key: 'CurrentCarrier', tag: '{CurrentCarrier}', description: 'Client current carrier' },
];

// ============================================================================
// HELPER - Get current OEP season info
// ============================================================================
function getOEPSeason(now = new Date()) {
  const y = now.getFullYear();
  const inCurrentOEP = now.getMonth() <= 2; // Jan=0, Feb=1, Mar=2
  const seasonYear = inCurrentOEP ? y : y + 1;
  const start = new Date(seasonYear, 0, 1); // Jan 1
  const end = new Date(seasonYear, 2, 31, 23, 59, 59, 999); // Mar 31
  const cohortStart = new Date(seasonYear - 1, 4, 1); // May 1 prev year
  const cohortEnd = new Date(seasonYear, 0, 1); // Jan 1 of season
  return { seasonYear, start, end, cohortStart, cohortEnd, inCurrentOEP: now >= start && now <= end };
}

// ============================================================================
// TEMPLATES
// ============================================================================

// GET /oep/templates - List all templates (system + user's custom)
router.get('/templates', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT * FROM oep_templates
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY is_featured DESC, is_system DESC, title ASC
    `, [userId]);

    return res.json({ ok: true, data: result.rows });
  } catch (error) {
    console.error('Get OEP templates error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /oep/templates/:id - Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const result = await db.query(`
      SELECT * FROM oep_templates
      WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
    `, [templateId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get OEP template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /oep/templates - Create new template
router.post('/templates', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, type, subject, content, tags = [] } = req.body;

    if (!title || !type || !content) {
      return res.status(400).json({ ok: false, error: 'title, type, and content are required' });
    }

    const result = await db.query(`
      INSERT INTO oep_templates (user_id, title, type, subject, content, tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, title, type.toLowerCase(), subject || null, content, tags]);

    // Log activity
    await db.query(`
      INSERT INTO oep_activity (user_id, activity_type, metadata)
      VALUES ($1, 'template_created', $2)
    `, [userId, JSON.stringify({ templateId: result.rows[0].id, title })]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create OEP template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PUT /oep/templates/:id - Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;
    const { title, type, subject, content, tags, is_featured } = req.body;

    const existing = await db.query(`
      SELECT * FROM oep_templates WHERE id = $1
    `, [templateId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    const template = existing.rows[0];

    // System templates can only be edited by creating a user copy
    if (template.is_system && template.user_id === null) {
      const copyResult = await db.query(`
        INSERT INTO oep_templates (user_id, title, type, subject, content, tags, is_featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userId,
        title || template.title,
        type || template.type,
        subject !== undefined ? subject : template.subject,
        content || template.content,
        tags || template.tags,
        is_featured !== undefined ? is_featured : false
      ]);

      return res.json({ ok: true, data: copyResult.rows[0], message: 'Created personal copy of system template' });
    }

    if (template.user_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Cannot edit another user\'s template' });
    }

    const result = await db.query(`
      UPDATE oep_templates
      SET title = COALESCE($1, title),
          type = COALESCE($2, type),
          subject = COALESCE($3, subject),
          content = COALESCE($4, content),
          tags = COALESCE($5, tags),
          is_featured = COALESCE($6, is_featured),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title, type, subject, content, tags, is_featured, templateId]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update OEP template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// DELETE /oep/templates/:id - Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const existing = await db.query(`
      SELECT * FROM oep_templates WHERE id = $1
    `, [templateId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    if (existing.rows[0].is_system) {
      return res.status(403).json({ ok: false, error: 'Cannot delete system templates' });
    }

    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Cannot delete another user\'s template' });
    }

    await db.query('DELETE FROM oep_templates WHERE id = $1', [templateId]);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete OEP template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /oep/merge-tags - Get available merge tags
router.get('/merge-tags', (req, res) => {
  res.json({ ok: true, data: MERGE_TAGS });
});

// ============================================================================
// AUTOMATIONS
// ============================================================================

// GET /oep/automations - Get user's automation settings
router.get('/automations', async (req, res) => {
  try {
    const userId = req.user.id;

    let result = await db.query(`
      SELECT * FROM oep_automations WHERE user_id = $1
    `, [userId]);

    // Create default settings if none exist
    if (result.rows.length === 0) {
      result = await db.query(`
        INSERT INTO oep_automations (user_id)
        VALUES ($1)
        RETURNING *
      `, [userId]);
    }

    const row = result.rows[0];

    // Transform to camelCase for frontend
    const automations = {
      jan1: row.jan_1,
      feb1: row.feb_1,
      mar1: row.mar_1,
      newsletter: row.newsletter,
      requireApproval: row.require_approval,
    };

    return res.json({ ok: true, data: automations });
  } catch (error) {
    console.error('Get OEP automations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PUT /oep/automations - Update automation settings
router.put('/automations', async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    await db.query(`
      INSERT INTO oep_automations (user_id, jan_1, feb_1, mar_1, newsletter, require_approval)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        jan_1 = COALESCE($2, oep_automations.jan_1),
        feb_1 = COALESCE($3, oep_automations.feb_1),
        mar_1 = COALESCE($4, oep_automations.mar_1),
        newsletter = COALESCE($5, oep_automations.newsletter),
        require_approval = COALESCE($6, oep_automations.require_approval),
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      settings.jan1,
      settings.feb1,
      settings.mar1,
      settings.newsletter,
      settings.requireApproval,
    ]);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Update OEP automations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// COHORT - OEP Retention Cohort Management
// ============================================================================

// GET /oep/season - Get current OEP season info
router.get('/season', (req, res) => {
  const season = getOEPSeason();
  res.json({ ok: true, data: season });
});

// GET /oep/cohort - Get OEP cohort for current/specified season
router.get('/cohort', async (req, res) => {
  try {
    const userId = req.user.id;
    const season = getOEPSeason();
    const seasonYear = parseInt(req.query.seasonYear) || season.seasonYear;

    const result = await db.query(`
      SELECT
        oc.*,
        c.first_name, c.last_name, c.email, c.phone, c.effective_date,
        c.carrier, c.plan,
        (SELECT json_agg(h ORDER BY h.created_at DESC)
         FROM oep_contact_history h WHERE h.cohort_id = oc.id) as history
      FROM oep_cohort oc
      JOIN clients c ON c.id = oc.client_id
      WHERE oc.user_id = $1 AND oc.season_year = $2
      ORDER BY c.last_name, c.first_name
    `, [userId, seasonYear]);

    // Transform for frontend
    const cohort = result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      effectiveDate: row.effective_date,
      carrier: row.carrier,
      plan: row.plan,
      firstWithAgent: row.first_with_agent,
      status: row.status,
      newsletter: row.newsletter,
      outreachPlan: {
        jan1: row.plan_jan_1,
        feb1: row.plan_feb_1,
        mar1: row.plan_mar_1,
      },
      jan1Sent: row.jan_1_sent,
      jan1SentAt: row.jan_1_sent_at,
      feb1Sent: row.feb_1_sent,
      feb1SentAt: row.feb_1_sent_at,
      mar1Sent: row.mar_1_sent,
      mar1SentAt: row.mar_1_sent_at,
      notes: row.notes,
      history: row.history || [],
      seasonYear: row.season_year,
    }));

    return res.json({ ok: true, data: cohort, season: { ...season, seasonYear } });
  } catch (error) {
    console.error('Get OEP cohort error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /oep/cohort/auto-populate - Auto-populate cohort from clients
router.post('/cohort/auto-populate', async (req, res) => {
  try {
    const userId = req.user.id;
    const season = getOEPSeason();
    const seasonYear = parseInt(req.body.seasonYear) || season.seasonYear;

    // Find eligible clients: effective_date between cohortStart and cohortEnd
    const cohortStart = new Date(seasonYear - 1, 4, 1); // May 1 prev year
    const cohortEnd = new Date(seasonYear, 0, 1); // Jan 1 of season

    const eligibleClients = await db.query(`
      SELECT id FROM clients
      WHERE owner_id = $1
        AND effective_date >= $2
        AND effective_date <= $3
        AND id NOT IN (
          SELECT client_id FROM oep_cohort WHERE season_year = $4
        )
    `, [userId, cohortStart.toISOString(), cohortEnd.toISOString(), seasonYear]);

    let added = 0;
    for (const client of eligibleClients.rows) {
      await db.query(`
        INSERT INTO oep_cohort (user_id, client_id, season_year, first_with_agent)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (client_id, season_year) DO NOTHING
      `, [userId, client.id, seasonYear]);
      added++;
    }

    return res.json({ ok: true, added, message: `Added ${added} clients to OEP cohort` });
  } catch (error) {
    console.error('Auto-populate OEP cohort error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /oep/cohort - Add client to OEP cohort
router.post('/cohort', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId, seasonYear, firstWithAgent = true, newsletter = false, outreachPlan } = req.body;

    if (!clientId) {
      return res.status(400).json({ ok: false, error: 'clientId is required' });
    }

    const season = getOEPSeason();
    const year = seasonYear || season.seasonYear;

    // Verify client belongs to user
    const clientCheck = await db.query(`
      SELECT id FROM clients WHERE id = $1 AND owner_id = $2
    `, [clientId, userId]);

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    const result = await db.query(`
      INSERT INTO oep_cohort (user_id, client_id, season_year, first_with_agent, newsletter,
        plan_jan_1, plan_feb_1, plan_mar_1)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (client_id, season_year) DO UPDATE SET
        first_with_agent = EXCLUDED.first_with_agent,
        newsletter = EXCLUDED.newsletter,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userId, clientId, year, firstWithAgent, newsletter,
      outreachPlan?.jan1 ?? true,
      outreachPlan?.feb1 ?? true,
      outreachPlan?.mar1 ?? true,
    ]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Add to OEP cohort error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PUT /oep/cohort/:id - Update cohort member
router.put('/cohort/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;
    const updates = req.body;

    const existing = await db.query(`
      SELECT * FROM oep_cohort WHERE id = $1 AND user_id = $2
    `, [cohortId, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Cohort member not found' });
    }

    const result = await db.query(`
      UPDATE oep_cohort SET
        status = COALESCE($1, status),
        newsletter = COALESCE($2, newsletter),
        first_with_agent = COALESCE($3, first_with_agent),
        plan_jan_1 = COALESCE($4, plan_jan_1),
        plan_feb_1 = COALESCE($5, plan_feb_1),
        plan_mar_1 = COALESCE($6, plan_mar_1),
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      updates.status,
      updates.newsletter,
      updates.firstWithAgent,
      updates.outreachPlan?.jan1,
      updates.outreachPlan?.feb1,
      updates.outreachPlan?.mar1,
      updates.notes,
      cohortId
    ]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update OEP cohort error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// DELETE /oep/cohort/:id - Remove from cohort
router.delete('/cohort/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    const result = await db.query(`
      DELETE FROM oep_cohort
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [cohortId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Cohort member not found' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete OEP cohort member error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /oep/cohort/:id/send - Send follow-up to cohort member
router.post('/cohort/:id/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;
    const { automationType, templateId, channel } = req.body; // automationType: 'jan1', 'feb1', 'mar1', 'manual'

    // Get cohort member with client info
    const cohortResult = await db.query(`
      SELECT oc.*, c.first_name, c.last_name, c.email, c.phone, c.carrier, c.plan
      FROM oep_cohort oc
      JOIN clients c ON c.id = oc.client_id
      WHERE oc.id = $1 AND oc.user_id = $2
    `, [cohortId, userId]);

    if (cohortResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Cohort member not found' });
    }

    const member = cohortResult.rows[0];

    // Get template if provided
    let template = null;
    if (templateId) {
      const templateResult = await db.query(`
        SELECT * FROM oep_templates WHERE id = $1
      `, [templateId]);
      template = templateResult.rows[0];
    }

    // Get agent info for merge tags
    const agentResult = await db.query(`
      SELECT name, email, phone FROM users WHERE id = $1
    `, [userId]);
    const agent = agentResult.rows[0] || {};

    // Personalize content
    let messageContent = template?.content || req.body.message || 'OEP follow-up';
    let subject = template?.subject || req.body.subject || 'OEP Follow-up';

    const replacements = {
      '{ClientName}': `${member.first_name} ${member.last_name}`,
      '{FirstName}': member.first_name,
      '{AgentName}': agent.name || 'Your Agent',
      '{AgentPhone}': agent.phone || '',
      '{AgentEmail}': agent.email || '',
      '{PolicyYear}': member.season_year.toString(),
      '{CurrentPlan}': member.plan || '',
      '{CurrentCarrier}': member.carrier || '',
    };

    for (const [tag, value] of Object.entries(replacements)) {
      messageContent = messageContent.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
      subject = subject.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Log the send attempt
    const historyResult = await db.query(`
      INSERT INTO oep_contact_history (cohort_id, user_id, channel, subject, message, status, template_id, automation_type)
      VALUES ($1, $2, $3, $4, $5, 'queued', $6, $7)
      RETURNING *
    `, [cohortId, userId, channel || 'email', subject, messageContent, templateId || null, automationType || 'manual']);

    // Actually send via comms if we have contact info
    let sendResult = null;
    const sendChannel = channel || 'email';
    try {
      if (sendChannel === 'sms' && member.phone) {
        const { sendSMS } = require('../utils/twilio');
        sendResult = await sendSMS({
          to: member.phone,
          body: messageContent,
          userId: userId
        });

        await db.query(`
          UPDATE oep_contact_history SET status = 'sent' WHERE id = $1
        `, [historyResult.rows[0].id]);
      } else if (sendChannel === 'email' && member.email) {
        const { sendEmail } = require('../utils/agent-email');
        sendResult = await sendEmail({
          userId: userId,
          to: member.email,
          subject: subject,
          text: messageContent,
          html: `<div style="font-family: Arial, sans-serif;">${messageContent.replace(/\n/g, '<br>')}</div>`
        });

        await db.query(`
          UPDATE oep_contact_history SET status = 'sent' WHERE id = $1
        `, [historyResult.rows[0].id]);
      }
    } catch (sendError) {
      console.error('Send error:', sendError);
      await db.query(`
        UPDATE oep_contact_history SET status = 'failed', error_message = $1 WHERE id = $2
      `, [sendError.message, historyResult.rows[0].id]);
    }

    // Update cohort tracking
    if (automationType && ['jan1', 'feb1', 'mar1'].includes(automationType)) {
      const colMap = { jan1: 'jan_1', feb1: 'feb_1', mar1: 'mar_1' };
      await db.query(`
        UPDATE oep_cohort
        SET ${colMap[automationType]}_sent = true, ${colMap[automationType]}_sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [cohortId]);
    }

    // Log activity
    const automationNames = {
      jan1: 'Jan 1 Congratulatory',
      feb1: 'Feb 1 First Full Month',
      mar1: 'Mar 1 Follow-up',
      manual: 'Manual Send',
    };

    await db.query(`
      INSERT INTO oep_activity (user_id, activity_type, automation_name, recipient_type, recipient_id,
        recipient_email, recipient_phone, subject, status)
      VALUES ($1, $2, $3, 'client', $4, $5, $6, $7, 'sent')
    `, [
      userId,
      sendChannel === 'sms' ? 'sms_sent' : 'email_sent',
      automationNames[automationType] || template?.title || 'Manual Send',
      member.client_id,
      member.email,
      member.phone,
      subject
    ]);

    return res.json({ ok: true, data: historyResult.rows[0], sendResult });
  } catch (error) {
    console.error('Send OEP follow-up error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ACTIVITY FEED
// ============================================================================

// GET /oep/activity - Get activity feed
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const result = await db.query(`
      SELECT * FROM oep_activity
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    // Transform for frontend
    const activities = result.rows.map(row => ({
      id: row.id,
      time: row.created_at,
      type: row.activity_type.includes('sms') ? 'SMS' : 'Email',
      to: row.recipient_email || row.recipient_phone || 'Unknown',
      subject: row.subject || '—',
      status: row.status,
      automation: row.automation_name,
      error: row.error_message,
    }));

    return res.json({ ok: true, data: activities });
  } catch (error) {
    console.error('Get OEP activity error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /oep/activity/:id/resend - Resend a failed activity
router.post('/activity/:id/resend', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const activityResult = await db.query(`
      SELECT * FROM oep_activity WHERE id = $1 AND user_id = $2
    `, [activityId, userId]);

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Activity not found' });
    }

    // Mark as resent
    await db.query(`
      UPDATE oep_activity SET status = 'resent', error_message = NULL WHERE id = $1
    `, [activityId]);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Resend OEP error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ANALYTICS / KPIs
// ============================================================================

// GET /oep/analytics - Get OEP analytics/KPIs
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const season = getOEPSeason();
    const seasonYear = parseInt(req.query.seasonYear) || season.seasonYear;

    // Get cohort stats
    const cohortStats = await db.query(`
      SELECT
        COUNT(*) as cohort_size,
        COUNT(*) FILTER (WHERE status = 'Switched' OR status = 'Cancelled') as churn_count,
        COUNT(*) FILTER (WHERE status = 'Active') as active_count,
        COUNT(*) FILTER (WHERE jan_1_sent = true) as jan1_sent,
        COUNT(*) FILTER (WHERE feb_1_sent = true) as feb1_sent,
        COUNT(*) FILTER (WHERE mar_1_sent = true) as mar1_sent
      FROM oep_cohort
      WHERE user_id = $1 AND season_year = $2
    `, [userId, seasonYear]);

    const stats = cohortStats.rows[0] || {};
    const cohortSize = parseInt(stats.cohort_size) || 0;
    const churnCount = parseInt(stats.churn_count) || 0;
    const retentionPct = cohortSize > 0 ? Math.round(((cohortSize - churnCount) / cohortSize) * 100) : 0;

    // Count activity for follow-ups sent
    const activityStats = await db.query(`
      SELECT COUNT(*) as followups_sent
      FROM oep_activity
      WHERE user_id = $1
        AND activity_type IN ('email_sent', 'sms_sent')
        AND status != 'failed'
        AND created_at >= $2
    `, [userId, new Date(seasonYear, 0, 1)]);

    const followupsSent = parseInt(activityStats.rows[0]?.followups_sent) || 0;

    const analytics = {
      cohortSize,
      followupsSent,
      churnCount,
      retentionPct: `${retentionPct}%`,
      jan1Sent: parseInt(stats.jan1_sent) || 0,
      feb1Sent: parseInt(stats.feb1_sent) || 0,
      mar1Sent: parseInt(stats.mar1_sent) || 0,
      activeCount: parseInt(stats.active_count) || 0,
    };

    return res.json({ ok: true, data: analytics });
  } catch (error) {
    console.error('Get OEP analytics error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// BLAST SEND
// ============================================================================

// POST /oep/blast - Send to all cohort members or filtered subset
router.post('/blast', async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, automationType, channel, cohortIds } = req.body;

    if (!templateId) {
      return res.status(400).json({ ok: false, error: 'templateId is required' });
    }

    const season = getOEPSeason();

    // Get template
    const templateResult = await db.query(`
      SELECT * FROM oep_templates WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
    `, [templateId, userId]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Get cohort members to send to
    let query = `
      SELECT oc.id FROM oep_cohort oc
      WHERE oc.user_id = $1 AND oc.season_year = $2
    `;
    const params = [userId, season.seasonYear];

    if (cohortIds?.length) {
      query += ` AND oc.id = ANY($3)`;
      params.push(cohortIds);
    }

    const cohortResult = await db.query(query, params);

    let queued = 0;
    for (const row of cohortResult.rows) {
      // Queue each send (in production, this would be a job queue)
      await db.query(`
        INSERT INTO oep_activity (user_id, activity_type, automation_name, recipient_type, recipient_id, subject, status)
        VALUES ($1, $2, $3, 'client', $4, $5, 'queued')
      `, [
        userId,
        channel === 'sms' ? 'sms_queued' : 'email_queued',
        template.title,
        row.id,
        template.subject
      ]);
      queued++;
    }

    return res.json({ ok: true, queued, message: `Queued ${queued} messages for sending` });
  } catch (error) {
    console.error('OEP blast send error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /oep/eligible-clients - Get clients eligible for OEP cohort
router.get('/eligible-clients', async (req, res) => {
  try {
    const userId = req.user.id;
    const season = getOEPSeason();
    const seasonYear = parseInt(req.query.seasonYear) || season.seasonYear;

    const cohortStart = new Date(seasonYear - 1, 4, 1); // May 1 prev year
    const cohortEnd = new Date(seasonYear, 0, 1); // Jan 1 of season

    const result = await db.query(`
      SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.effective_date, c.carrier, c.plan,
             EXISTS(SELECT 1 FROM oep_cohort oc WHERE oc.client_id = c.id AND oc.season_year = $4) as in_cohort
      FROM clients c
      WHERE c.owner_id = $1
        AND c.effective_date >= $2
        AND c.effective_date <= $3
      ORDER BY c.effective_date DESC, c.last_name
    `, [userId, cohortStart.toISOString(), cohortEnd.toISOString(), seasonYear]);

    return res.json({ ok: true, data: result.rows, cohortWindow: { start: cohortStart, end: cohortEnd } });
  } catch (error) {
    console.error('Get eligible clients error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = router;
