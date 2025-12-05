// backend/routes/aep.js - AEP Wizard API routes
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
  { key: 'PolicyYear', tag: '{PolicyYear}', description: 'Next policy year (e.g., 2026)' },
  { key: 'BookingLink', tag: '{BookingLink}', description: 'Your calendar booking link' },
  { key: 'CurrentPlan', tag: '{CurrentPlan}', description: 'Client current plan name' },
  { key: 'CurrentCarrier', tag: '{CurrentCarrier}', description: 'Client current carrier' },
];

// ============================================================================
// TEMPLATES
// ============================================================================

// GET /aep/templates - List all templates (system + user's custom)
router.get('/templates', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT * FROM aep_templates
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY is_featured DESC, is_system DESC, title ASC
    `, [userId]);

    return res.json({ ok: true, data: result.rows });
  } catch (error) {
    console.error('Get templates error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /aep/templates/:id - Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const result = await db.query(`
      SELECT * FROM aep_templates
      WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
    `, [templateId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /aep/templates - Create new template
router.post('/templates', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, type, subject, content, tags = [] } = req.body;

    if (!title || !type || !content) {
      return res.status(400).json({ ok: false, error: 'title, type, and content are required' });
    }

    const result = await db.query(`
      INSERT INTO aep_templates (user_id, title, type, subject, content, tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, title, type.toLowerCase(), subject || null, content, tags]);

    // Log activity
    await db.query(`
      INSERT INTO aep_activity (user_id, activity_type, metadata)
      VALUES ($1, 'template_created', $2)
    `, [userId, JSON.stringify({ templateId: result.rows[0].id, title })]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PUT /aep/templates/:id - Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;
    const { title, type, subject, content, tags, is_featured } = req.body;

    // Check ownership (can't edit system templates directly, but can copy)
    const existing = await db.query(`
      SELECT * FROM aep_templates WHERE id = $1
    `, [templateId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    const template = existing.rows[0];

    // System templates can only be edited by creating a user copy
    if (template.is_system && template.user_id === null) {
      // Create a user copy instead
      const copyResult = await db.query(`
        INSERT INTO aep_templates (user_id, title, type, subject, content, tags, is_featured)
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

    // User's own template - update it
    if (template.user_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Cannot edit another user\'s template' });
    }

    const result = await db.query(`
      UPDATE aep_templates
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
    console.error('Update template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// DELETE /aep/templates/:id - Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const existing = await db.query(`
      SELECT * FROM aep_templates WHERE id = $1
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

    await db.query('DELETE FROM aep_templates WHERE id = $1', [templateId]);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /aep/merge-tags - Get available merge tags
router.get('/merge-tags', (req, res) => {
  res.json({ ok: true, data: MERGE_TAGS });
});

// ============================================================================
// AUTOMATIONS
// ============================================================================

// GET /aep/automations - Get user's automation settings
router.get('/automations', async (req, res) => {
  try {
    const userId = req.user.id;

    let result = await db.query(`
      SELECT * FROM aep_automations WHERE user_id = $1
    `, [userId]);

    // Create default settings if none exist
    if (result.rows.length === 0) {
      result = await db.query(`
        INSERT INTO aep_automations (user_id)
        VALUES ($1)
        RETURNING *
      `, [userId]);
    }

    const row = result.rows[0];

    // Transform to camelCase for frontend
    const automations = {
      preAEP60: row.pre_aep_60,
      preAEP30: row.pre_aep_30,
      preAEP14: row.pre_aep_14,
      preAEP7: row.pre_aep_7,
      preAEP3: row.pre_aep_3,
      preAEP1: row.pre_aep_1,
      anocExplainer: row.anoc_explainer,
      bookingNudges: row.booking_nudges,
      voicemailDropUI: row.voicemail_drop_ui,
      requireApproval: row.require_approval,
    };

    return res.json({ ok: true, data: automations });
  } catch (error) {
    console.error('Get automations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PUT /aep/automations - Update automation settings
router.put('/automations', async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    await db.query(`
      INSERT INTO aep_automations (user_id, pre_aep_60, pre_aep_30, pre_aep_14, pre_aep_7,
        pre_aep_3, pre_aep_1, anoc_explainer, booking_nudges, voicemail_drop_ui, require_approval)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        pre_aep_60 = COALESCE($2, aep_automations.pre_aep_60),
        pre_aep_30 = COALESCE($3, aep_automations.pre_aep_30),
        pre_aep_14 = COALESCE($4, aep_automations.pre_aep_14),
        pre_aep_7 = COALESCE($5, aep_automations.pre_aep_7),
        pre_aep_3 = COALESCE($6, aep_automations.pre_aep_3),
        pre_aep_1 = COALESCE($7, aep_automations.pre_aep_1),
        anoc_explainer = COALESCE($8, aep_automations.anoc_explainer),
        booking_nudges = COALESCE($9, aep_automations.booking_nudges),
        voicemail_drop_ui = COALESCE($10, aep_automations.voicemail_drop_ui),
        require_approval = COALESCE($11, aep_automations.require_approval),
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      settings.preAEP60,
      settings.preAEP30,
      settings.preAEP14,
      settings.preAEP7,
      settings.preAEP3,
      settings.preAEP1,
      settings.anocExplainer,
      settings.bookingNudges,
      settings.voicemailDropUI,
      settings.requireApproval,
    ]);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Update automations error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// COUNTDOWN CONTACTS
// ============================================================================

// GET /aep/countdown - List countdown contacts
router.get('/countdown', async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status;

    let query = `
      SELECT c.*,
        (SELECT json_agg(h ORDER BY h.created_at DESC)
         FROM aep_contact_history h WHERE h.contact_id = c.id) as history
      FROM aep_countdown_contacts c
      WHERE c.user_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ' AND c.status = $2';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await db.query(query, params);

    // Transform to frontend format
    const contacts = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      zip: row.zip,
      county: row.county,
      dob: row.dob,
      language: row.language,
      source: row.source,
      notes: row.notes,
      permissionToContact: row.permission_to_contact,
      status: row.status,
      newsletter: row.newsletter,
      outreachPlan: {
        twoMonths: row.plan_two_months,
        oneMonth: row.plan_one_month,
        twoWeeks: row.plan_two_weeks,
        oneWeek: row.plan_one_week,
        aepLive: row.plan_aep_live,
      },
      history: row.history || [],
      createdAt: row.created_at,
    }));

    return res.json({ ok: true, data: contacts });
  } catch (error) {
    console.error('Get countdown contacts error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /aep/countdown - Add countdown contact
router.post('/countdown', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName, lastName, phone, email, zip, county, dob,
      language, source, notes, permissionToContact, status,
      newsletter, outreachPlan
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ ok: false, error: 'firstName and lastName are required' });
    }

    const result = await db.query(`
      INSERT INTO aep_countdown_contacts (
        user_id, first_name, last_name, phone, email, zip, county, dob,
        language, source, notes, permission_to_contact, status, newsletter,
        plan_two_months, plan_one_month, plan_two_weeks, plan_one_week, plan_aep_live
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      userId, firstName, lastName, phone || null, email || null,
      zip || null, county || null, dob || null,
      language || 'English', source || 'Other', notes || null,
      permissionToContact || false, status || 'New', newsletter || false,
      outreachPlan?.twoMonths ?? true,
      outreachPlan?.oneMonth ?? true,
      outreachPlan?.twoWeeks ?? true,
      outreachPlan?.oneWeek ?? true,
      outreachPlan?.aepLive ?? true,
    ]);

    // Log activity
    await db.query(`
      INSERT INTO aep_activity (user_id, activity_type, recipient_type, recipient_id, metadata)
      VALUES ($1, 'contact_added', 'countdown_contact', $2, $3)
    `, [userId, result.rows[0].id, JSON.stringify({ firstName, lastName })]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Add countdown contact error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PUT /aep/countdown/:id - Update countdown contact
router.put('/countdown/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const updates = req.body;

    // Verify ownership
    const existing = await db.query(`
      SELECT * FROM aep_countdown_contacts WHERE id = $1 AND user_id = $2
    `, [contactId, userId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Contact not found' });
    }

    const result = await db.query(`
      UPDATE aep_countdown_contacts SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        zip = COALESCE($5, zip),
        county = COALESCE($6, county),
        dob = COALESCE($7, dob),
        language = COALESCE($8, language),
        source = COALESCE($9, source),
        notes = COALESCE($10, notes),
        permission_to_contact = COALESCE($11, permission_to_contact),
        status = COALESCE($12, status),
        newsletter = COALESCE($13, newsletter),
        plan_two_months = COALESCE($14, plan_two_months),
        plan_one_month = COALESCE($15, plan_one_month),
        plan_two_weeks = COALESCE($16, plan_two_weeks),
        plan_one_week = COALESCE($17, plan_one_week),
        plan_aep_live = COALESCE($18, plan_aep_live),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *
    `, [
      updates.firstName, updates.lastName, updates.phone, updates.email,
      updates.zip, updates.county, updates.dob, updates.language,
      updates.source, updates.notes, updates.permissionToContact,
      updates.status, updates.newsletter,
      updates.outreachPlan?.twoMonths,
      updates.outreachPlan?.oneMonth,
      updates.outreachPlan?.twoWeeks,
      updates.outreachPlan?.oneWeek,
      updates.outreachPlan?.aepLive,
      contactId
    ]);

    return res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update countdown contact error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// DELETE /aep/countdown/:id - Delete countdown contact
router.delete('/countdown/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    const result = await db.query(`
      DELETE FROM aep_countdown_contacts
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [contactId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Contact not found' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete countdown contact error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /aep/countdown/:id/send - Send drip to countdown contact
router.post('/countdown/:id/send', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { templateId, channel } = req.body;

    // Get contact
    const contactResult = await db.query(`
      SELECT * FROM aep_countdown_contacts WHERE id = $1 AND user_id = $2
    `, [contactId, userId]);

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Contact not found' });
    }

    const contact = contactResult.rows[0];

    // Get template if provided
    let template = null;
    if (templateId) {
      const templateResult = await db.query(`
        SELECT * FROM aep_templates WHERE id = $1
      `, [templateId]);
      template = templateResult.rows[0];
    }

    // Get agent info for merge tags
    const agentResult = await db.query(`
      SELECT name, email, phone FROM users WHERE id = $1
    `, [userId]);
    const agent = agentResult.rows[0] || {};

    // Personalize content
    const nextYear = new Date().getFullYear() + 1;
    let messageContent = template?.content || req.body.message || 'Pre-AEP reminder';
    let subject = template?.subject || req.body.subject || 'Pre-AEP Outreach';

    const replacements = {
      '{ClientName}': `${contact.first_name} ${contact.last_name}`,
      '{FirstName}': contact.first_name,
      '{AgentName}': agent.name || 'Your Agent',
      '{AgentPhone}': agent.phone || '',
      '{AgentEmail}': agent.email || '',
      '{PolicyYear}': nextYear.toString(),
    };

    for (const [tag, value] of Object.entries(replacements)) {
      messageContent = messageContent.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
      subject = subject.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Log the send attempt
    const historyResult = await db.query(`
      INSERT INTO aep_contact_history (contact_id, user_id, channel, subject, message, status, template_id)
      VALUES ($1, $2, $3, $4, $5, 'queued', $6)
      RETURNING *
    `, [contactId, userId, channel || 'email', subject, messageContent, templateId || null]);

    // Actually send via comms if we have contact info
    let sendResult = null;
    try {
      if (channel === 'sms' && contact.phone) {
        const { sendSMS } = require('../utils/twilio');
        sendResult = await sendSMS({
          to: contact.phone,
          body: messageContent,
          userId: userId
        });

        await db.query(`
          UPDATE aep_contact_history SET status = 'sent' WHERE id = $1
        `, [historyResult.rows[0].id]);
      } else if (channel === 'email' && contact.email) {
        const { sendEmail } = require('../utils/agent-email');
        sendResult = await sendEmail({
          userId: userId,
          to: contact.email,
          subject: subject,
          text: messageContent,
          html: `<div style="font-family: Arial, sans-serif;">${messageContent.replace(/\n/g, '<br>')}</div>`
        });

        await db.query(`
          UPDATE aep_contact_history SET status = 'sent' WHERE id = $1
        `, [historyResult.rows[0].id]);
      }
    } catch (sendError) {
      console.error('Send error:', sendError);
      await db.query(`
        UPDATE aep_contact_history SET status = 'failed', error_message = $1 WHERE id = $2
      `, [sendError.message, historyResult.rows[0].id]);
    }

    // Update contact status if needed
    if (contact.status === 'New') {
      await db.query(`
        UPDATE aep_countdown_contacts SET status = 'Warm' WHERE id = $1
      `, [contactId]);
    }

    // Log activity
    await db.query(`
      INSERT INTO aep_activity (user_id, activity_type, automation_name, recipient_type, recipient_id,
        recipient_email, recipient_phone, subject, status)
      VALUES ($1, $2, $3, 'countdown_contact', $4, $5, $6, $7, 'sent')
    `, [
      userId,
      channel === 'sms' ? 'sms_sent' : 'email_sent',
      template?.title || 'Manual Drip',
      contactId,
      contact.email,
      contact.phone,
      subject
    ]);

    return res.json({ ok: true, data: historyResult.rows[0], sendResult });
  } catch (error) {
    console.error('Send drip error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ACTIVITY FEED
// ============================================================================

// GET /aep/activity - Get activity feed
router.get('/activity', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const result = await db.query(`
      SELECT * FROM aep_activity
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
    console.error('Get activity error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /aep/activity/:id/resend - Resend a failed activity
router.post('/activity/:id/resend', async (req, res) => {
  try {
    const userId = req.user.id;
    const activityId = req.params.id;

    const activityResult = await db.query(`
      SELECT * FROM aep_activity WHERE id = $1 AND user_id = $2
    `, [activityId, userId]);

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Activity not found' });
    }

    const activity = activityResult.rows[0];

    // Mark as resent (actual resend would go through the send logic)
    await db.query(`
      UPDATE aep_activity SET status = 'resent', error_message = NULL WHERE id = $1
    `, [activityId]);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

// GET /aep/analytics - Get AEP analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    // Get aggregated stats
    const result = await db.query(`
      SELECT
        COALESCE(SUM(emails_sent), 0) + COALESCE(SUM(sms_sent), 0) as automations_sent,
        CASE WHEN COALESCE(SUM(emails_sent), 0) > 0
          THEN ROUND(COALESCE(SUM(opens), 0)::numeric / NULLIF(SUM(emails_sent), 0) * 100, 1)
          ELSE 0 END as open_rate,
        CASE WHEN COALESCE(SUM(opens), 0) > 0
          THEN ROUND(COALESCE(SUM(clicks), 0)::numeric / NULLIF(SUM(opens), 0) * 100, 1)
          ELSE 0 END as click_rate,
        CASE WHEN COALESCE(SUM(emails_sent), 0) > 0
          THEN ROUND(COALESCE(SUM(replies), 0)::numeric / NULLIF(SUM(emails_sent), 0) * 100, 1)
          ELSE 0 END as reply_rate,
        COALESCE(SUM(bounces), 0) as bounces,
        COALESCE(SUM(failed), 0) as failed_sends,
        COALESCE(SUM(appointments_booked), 0) as appointments,
        COALESCE(SUM(enrollments), 0) as enrollments
      FROM aep_analytics
      WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
    `, [userId, days]);

    const stats = result.rows[0] || {};

    // Also count from activity table for more real-time data
    const activityStats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE activity_type IN ('email_sent', 'sms_sent') AND status != 'failed') as total_sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM aep_activity
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $2
    `, [userId, days]);

    const actStats = activityStats.rows[0] || {};

    const analytics = [
      { labelKey: 'automationsSent', value: parseInt(stats.automations_sent) || parseInt(actStats.total_sent) || 0 },
      { labelKey: 'openRate', value: `${stats.open_rate || 0}%` },
      { labelKey: 'clickRate', value: `${stats.click_rate || 0}%` },
      { labelKey: 'replyRate', value: `${stats.reply_rate || 0}%` },
      { labelKey: 'bounces', value: parseInt(stats.bounces) || 0 },
      { labelKey: 'failedSends', value: parseInt(stats.failed_sends) || parseInt(actStats.failed) || 0 },
    ];

    return res.json({ ok: true, data: analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ============================================================================
// BULK SEND (to filtered clients or countdown contacts)
// ============================================================================

// POST /aep/blast - Send to multiple recipients
router.post('/blast', async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, recipientType, recipientIds, channel } = req.body;

    if (!templateId || !recipientType || !recipientIds?.length) {
      return res.status(400).json({ ok: false, error: 'templateId, recipientType, and recipientIds are required' });
    }

    // Get template
    const templateResult = await db.query(`
      SELECT * FROM aep_templates WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
    `, [templateId, userId]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    let queued = 0;

    // Get agent info
    const agentResult = await db.query(`
      SELECT name, email, phone FROM users WHERE id = $1
    `, [userId]);
    const agent = agentResult.rows[0] || {};

    if (recipientType === 'countdown') {
      // Send to countdown contacts
      const contacts = await db.query(`
        SELECT * FROM aep_countdown_contacts
        WHERE id = ANY($1) AND user_id = $2
      `, [recipientIds, userId]);

      for (const contact of contacts.rows) {
        // Queue send (in production, this would be a job queue)
        await db.query(`
          INSERT INTO aep_activity (user_id, activity_type, automation_name, recipient_type, recipient_id,
            recipient_email, recipient_phone, subject, status)
          VALUES ($1, $2, $3, 'countdown_contact', $4, $5, $6, $7, 'queued')
        `, [
          userId,
          channel === 'sms' ? 'sms_queued' : 'email_queued',
          template.title,
          contact.id,
          contact.email,
          contact.phone,
          template.subject
        ]);
        queued++;
      }
    } else if (recipientType === 'client') {
      // Send to existing clients
      const clients = await db.query(`
        SELECT * FROM clients
        WHERE id = ANY($1) AND owner_id = $2
      `, [recipientIds, userId]);

      for (const client of clients.rows) {
        await db.query(`
          INSERT INTO aep_activity (user_id, activity_type, automation_name, recipient_type, recipient_id,
            recipient_email, recipient_phone, subject, status)
          VALUES ($1, $2, $3, 'client', $4, $5, $6, $7, 'queued')
        `, [
          userId,
          channel === 'sms' ? 'sms_queued' : 'email_queued',
          template.title,
          client.id,
          client.email,
          client.phone,
          template.subject
        ]);
        queued++;
      }
    }

    return res.json({ ok: true, queued, message: `Queued ${queued} messages for sending` });
  } catch (error) {
    console.error('Blast send error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /aep/clients - Get clients filtered for AEP outreach
router.get('/clients', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, riskLevel, hasEmail, hasPhone, limit = 100 } = req.query;

    let query = `
      SELECT id, first_name, last_name, email, phone, carrier, plan, risk_score, status,
             effective_date, last_contact_date
      FROM clients
      WHERE owner_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (riskLevel) {
      paramCount++;
      if (riskLevel === 'high') {
        query += ` AND risk_score >= $${paramCount}`;
        params.push(65);
      } else if (riskLevel === 'medium') {
        query += ` AND risk_score >= $${paramCount} AND risk_score < $${paramCount + 1}`;
        params.push(35, 65);
        paramCount++;
      }
    }

    if (hasEmail === 'true') {
      query += ` AND email IS NOT NULL AND email != ''`;
    }

    if (hasPhone === 'true') {
      query += ` AND phone IS NOT NULL AND phone != ''`;
    }

    paramCount++;
    query += ` ORDER BY risk_score DESC, last_contact_date ASC NULLS FIRST LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);

    return res.json({ ok: true, data: result.rows });
  } catch (error) {
    console.error('Get AEP clients error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = router;
