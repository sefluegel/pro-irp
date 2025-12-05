// backend/routes/crm.js
// CRM Integration API Routes
// Supports Go High Level and Salesforce via MCP

const express = require('express');
const router = express.Router();
const db = require('../db');
const crmSync = require('../services/crm-sync');

// ============================================================================
// MIDDLEWARE - Require Authentication
// ============================================================================
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

// Apply auth middleware to all routes
router.use(requireAuth);

// ============================================================================
// INTEGRATION MANAGEMENT
// ============================================================================

/**
 * GET /crm/integrations
 * List all CRM integrations for the current user
 */
router.get('/integrations', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, crm_type, crm_name, location_id, instance_url,
        sync_enabled, sync_direction, sync_frequency,
        last_sync_at, last_sync_status, last_sync_error,
        sync_contacts, sync_opportunities, sync_notes, sync_tags,
        is_active, created_at, updated_at,
        -- Check if tokens exist without exposing them
        CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_access_token,
        CASE WHEN refresh_token IS NOT NULL THEN true ELSE false END as has_refresh_token,
        token_expires_at
      FROM crm_integrations
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({
      ok: true,
      integrations: result.rows
    });
  } catch (error) {
    console.error('Error fetching CRM integrations:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch integrations' });
  }
});

/**
 * GET /crm/integrations/:id
 * Get a specific integration with sync history
 */
router.get('/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get integration
    const integrationResult = await db.query(`
      SELECT
        id, crm_type, crm_name, location_id, instance_url,
        sync_enabled, sync_direction, sync_frequency,
        last_sync_at, last_sync_status, last_sync_error,
        field_mapping, sync_contacts, sync_opportunities, sync_notes, sync_tags, sync_custom_fields,
        sync_filters, is_active, created_at, updated_at,
        CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_access_token,
        token_expires_at
      FROM crm_integrations
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Integration not found' });
    }

    // Get recent sync history
    const historyResult = await db.query(`
      SELECT
        id, sync_type, direction, status,
        total_records, records_created, records_updated, records_skipped, records_failed,
        errors, started_at, completed_at, duration_ms
      FROM crm_sync_history
      WHERE integration_id = $1
      ORDER BY started_at DESC
      LIMIT 10
    `, [id]);

    // Get contact mapping stats
    const mappingStats = await db.query(`
      SELECT
        COUNT(*) as total_mapped,
        COUNT(*) FILTER (WHERE has_conflict = true) as conflicts,
        MAX(last_synced_at) as last_contact_sync
      FROM crm_contact_mapping
      WHERE integration_id = $1
    `, [id]);

    res.json({
      ok: true,
      integration: integrationResult.rows[0],
      syncHistory: historyResult.rows,
      mappingStats: mappingStats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching integration details:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch integration details' });
  }
});

/**
 * POST /crm/integrations
 * Create a new CRM integration (before OAuth)
 */
router.post('/integrations', async (req, res) => {
  try {
    const { crm_type, crm_name, location_id } = req.body;

    if (!crm_type || !['gohighlevel', 'salesforce', 'hubspot'].includes(crm_type)) {
      return res.status(400).json({ ok: false, error: 'Invalid CRM type' });
    }

    // Check if integration already exists
    const existing = await db.query(`
      SELECT id FROM crm_integrations
      WHERE user_id = $1 AND crm_type = $2 AND (location_id = $3 OR (location_id IS NULL AND $3 IS NULL))
    `, [req.user.id, crm_type, location_id || null]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Integration already exists',
        existing_id: existing.rows[0].id
      });
    }

    const result = await db.query(`
      INSERT INTO crm_integrations (user_id, crm_type, crm_name, location_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, crm_type, crm_name, location_id, created_at
    `, [req.user.id, crm_type, crm_name || `My ${crm_type} Account`, location_id || null]);

    res.status(201).json({
      ok: true,
      integration: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ ok: false, error: 'Failed to create integration' });
  }
});

/**
 * PATCH /crm/integrations/:id
 * Update integration settings
 */
router.patch('/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      crm_name, sync_enabled, sync_direction, sync_frequency,
      field_mapping, sync_contacts, sync_opportunities, sync_notes, sync_tags, sync_custom_fields,
      sync_filters, is_active
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [id, req.user.id];
    let paramIndex = 3;

    const addUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    addUpdate('crm_name', crm_name);
    addUpdate('sync_enabled', sync_enabled);
    addUpdate('sync_direction', sync_direction);
    addUpdate('sync_frequency', sync_frequency);
    addUpdate('field_mapping', field_mapping ? JSON.stringify(field_mapping) : undefined);
    addUpdate('sync_contacts', sync_contacts);
    addUpdate('sync_opportunities', sync_opportunities);
    addUpdate('sync_notes', sync_notes);
    addUpdate('sync_tags', sync_tags);
    addUpdate('sync_custom_fields', sync_custom_fields);
    addUpdate('sync_filters', sync_filters ? JSON.stringify(sync_filters) : undefined);
    addUpdate('is_active', is_active);

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(`
      UPDATE crm_integrations
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING id, crm_type, crm_name, sync_enabled, sync_frequency, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Integration not found' });
    }

    res.json({
      ok: true,
      integration: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ ok: false, error: 'Failed to update integration' });
  }
});

/**
 * DELETE /crm/integrations/:id
 * Delete an integration and all related data
 */
router.delete('/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM crm_integrations
      WHERE id = $1 AND user_id = $2
      RETURNING id, crm_type
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Integration not found' });
    }

    res.json({
      ok: true,
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete integration' });
  }
});

// ============================================================================
// OAUTH FLOWS
// ============================================================================

/**
 * GET /crm/oauth/:crm_type/authorize
 * Get OAuth authorization URL for a CRM
 */
router.get('/oauth/:crm_type/authorize', async (req, res) => {
  try {
    const { crm_type } = req.params;
    const { integration_id, location_id } = req.query;

    // Get OAuth credentials from environment
    const clientId = process.env[`${crm_type.toUpperCase()}_CLIENT_ID`];
    // Go High Level doesn't allow their name in redirect URIs, so we use generic "hl"
    const crmPath = crm_type === 'gohighlevel' ? 'hl' : crm_type;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:8080'}/crm/oauth/${crmPath}/callback`;

    if (!clientId) {
      return res.status(500).json({
        ok: false,
        error: `${crm_type} OAuth not configured. Contact administrator.`
      });
    }

    let authUrl;

    if (crm_type === 'gohighlevel') {
      const scopes = ['contacts.readonly', 'contacts.write', 'opportunities.readonly', 'conversations.readonly'];
      authUrl = crmSync.getGHLOAuthUrl(clientId, redirectUri, scopes);
    } else if (crm_type === 'salesforce') {
      authUrl = crmSync.getSalesforceOAuthUrl(clientId, redirectUri);
    } else {
      return res.status(400).json({ ok: false, error: 'Unsupported CRM type' });
    }

    // Store state for callback verification
    const state = Buffer.from(JSON.stringify({
      user_id: req.user.id,
      integration_id,
      crm_type,
      location_id,
      timestamp: Date.now()
    })).toString('base64');

    authUrl += `&state=${encodeURIComponent(state)}`;

    res.json({
      ok: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /crm/oauth/:crm_path/callback
 * OAuth callback handler - exchanges code for tokens
 * Note: crm_path is 'hl' for Go High Level (they don't allow their name in URLs)
 */
router.get('/oauth/:crm_path/callback', async (req, res) => {
  try {
    const { crm_path } = req.params;
    // Map 'hl' back to 'gohighlevel' for internal use
    const crm_type = crm_path === 'hl' ? 'gohighlevel' : crm_path;
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?crm_error=${encodeURIComponent(error_description || oauthError)}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?crm_error=missing_code`);
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?crm_error=invalid_state`);
    }

    // Verify state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?crm_error=expired_state`);
    }

    // Get OAuth credentials
    const clientId = process.env[`${crm_type.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${crm_type.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:8080'}/crm/oauth/${crm_path}/callback`;

    let tokens;
    let locationId = stateData.location_id;
    let instanceUrl;

    if (crm_type === 'gohighlevel') {
      tokens = await crmSync.exchangeGHLCode(code, clientId, clientSecret, redirectUri);
      locationId = tokens.locationId || locationId;
    } else if (crm_type === 'salesforce') {
      tokens = await crmSync.exchangeSalesforceCode(code, clientId, clientSecret, redirectUri);
      instanceUrl = tokens.instance_url;
    }

    // Update or create integration with tokens
    let integrationId = stateData.integration_id;

    if (integrationId) {
      // Update existing integration
      await db.query(`
        UPDATE crm_integrations
        SET
          access_token = $1,
          refresh_token = $2,
          token_expires_at = $3,
          location_id = COALESCE($4, location_id),
          instance_url = COALESCE($5, instance_url),
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND user_id = $7
      `, [
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_at ? new Date(tokens.expires_at) : null,
        locationId,
        instanceUrl,
        integrationId,
        stateData.user_id
      ]);
    } else {
      // Create new integration
      const result = await db.query(`
        INSERT INTO crm_integrations (
          user_id, crm_type, crm_name,
          access_token, refresh_token, token_expires_at,
          location_id, instance_url, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING id
      `, [
        stateData.user_id,
        crm_type,
        `My ${crm_type === 'gohighlevel' ? 'Go High Level' : 'Salesforce'} Account`,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_at ? new Date(tokens.expires_at) : null,
        locationId,
        instanceUrl
      ]);
      integrationId = result.rows[0].id;
    }

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?crm_connected=${crm_type}&integration_id=${integrationId}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?crm_error=${encodeURIComponent(error.message)}`);
  }
});

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * POST /crm/integrations/:id/sync
 * Trigger a manual sync for an integration
 */
router.post('/integrations/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_sync = false } = req.body;

    // Verify ownership
    const integration = await db.query(`
      SELECT id, crm_type, access_token, is_active
      FROM crm_integrations
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (integration.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Integration not found' });
    }

    if (!integration.rows[0].access_token) {
      return res.status(400).json({ ok: false, error: 'Integration not authenticated. Please reconnect.' });
    }

    if (!integration.rows[0].is_active) {
      return res.status(400).json({ ok: false, error: 'Integration is disabled' });
    }

    // Start sync (async - returns immediately)
    const syncResult = await crmSync.syncContactsFromCRM(id, {
      fullSync: full_sync,
      userId: req.user.id
    });

    res.json({
      ok: true,
      sync: syncResult
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Sync failed' });
  }
});

/**
 * GET /crm/integrations/:id/sync-history
 * Get sync history for an integration
 */
router.get('/integrations/:id/sync-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Verify ownership
    const ownership = await db.query(`
      SELECT id FROM crm_integrations WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (ownership.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Integration not found' });
    }

    const result = await db.query(`
      SELECT
        id, sync_type, direction, status,
        total_records, records_created, records_updated, records_skipped, records_failed,
        errors, started_at, completed_at, duration_ms
      FROM crm_sync_history
      WHERE integration_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset)]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM crm_sync_history WHERE integration_id = $1
    `, [id]);

    res.json({
      ok: true,
      history: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching sync history:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch sync history' });
  }
});

/**
 * GET /crm/integrations/:id/contacts
 * Get mapped contacts for an integration
 */
router.get('/integrations/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, has_conflict } = req.query;

    // Verify ownership
    const ownership = await db.query(`
      SELECT id FROM crm_integrations WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (ownership.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Integration not found' });
    }

    let whereClause = 'WHERE cm.integration_id = $1';
    const params = [id, parseInt(limit), parseInt(offset)];

    if (has_conflict === 'true') {
      whereClause += ' AND cm.has_conflict = true';
    }

    const result = await db.query(`
      SELECT
        cm.id, cm.crm_contact_id, cm.crm_contact_email,
        cm.client_id, cm.last_synced_at, cm.last_sync_direction,
        cm.has_conflict, cm.conflict_data,
        c.first_name, c.last_name, c.email as client_email
      FROM crm_contact_mapping cm
      LEFT JOIN clients c ON cm.client_id = c.id
      ${whereClause}
      ORDER BY cm.last_synced_at DESC
      LIMIT $2 OFFSET $3
    `, params);

    res.json({
      ok: true,
      contacts: result.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching mapped contacts:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch contacts' });
  }
});

// ============================================================================
// FIELD MAPPING TEMPLATES
// ============================================================================

/**
 * GET /crm/field-mappings/:crm_type
 * Get default field mapping template for a CRM type
 */
router.get('/field-mappings/:crm_type', async (req, res) => {
  try {
    const { crm_type } = req.params;

    const result = await db.query(`
      SELECT default_mapping, description
      FROM crm_field_mapping_templates
      WHERE crm_type = $1
    `, [crm_type]);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'No template found for this CRM type' });
    }

    res.json({
      ok: true,
      crm_type,
      mapping: result.rows[0].default_mapping,
      description: result.rows[0].description
    });
  } catch (error) {
    console.error('Error fetching field mapping:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch field mapping' });
  }
});

// ============================================================================
// WEBHOOK HANDLERS (for real-time sync)
// ============================================================================

/**
 * POST /crm/webhooks/gohighlevel
 * Handle Go High Level webhooks
 */
router.post('/webhooks/gohighlevel', express.json(), async (req, res) => {
  try {
    const { event_type, location_id, contact } = req.body;

    console.log(`GHL webhook: ${event_type} for location ${location_id}`);

    // Find integration for this location
    const integration = await db.query(`
      SELECT id, user_id, sync_enabled
      FROM crm_integrations
      WHERE crm_type = 'gohighlevel' AND location_id = $1 AND is_active = true
    `, [location_id]);

    if (integration.rows.length === 0) {
      return res.status(200).json({ ok: true, message: 'No matching integration' });
    }

    if (!integration.rows[0].sync_enabled) {
      return res.status(200).json({ ok: true, message: 'Sync disabled' });
    }

    // Store webhook event for processing
    await db.query(`
      INSERT INTO crm_webhook_events (
        integration_id, crm_type, event_type, payload
      ) VALUES ($1, 'gohighlevel', $2, $3)
    `, [integration.rows[0].id, event_type, JSON.stringify(req.body)]);

    // Process immediately for contact events
    if (event_type.startsWith('contact.')) {
      // TODO: Process contact webhook asynchronously
      // For now, just acknowledge receipt
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('GHL webhook error:', error);
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

/**
 * POST /crm/webhooks/salesforce
 * Handle Salesforce webhooks (Platform Events)
 */
router.post('/webhooks/salesforce', express.json(), async (req, res) => {
  try {
    const { event_type, org_id, record } = req.body;

    console.log(`Salesforce webhook: ${event_type} for org ${org_id}`);

    // Find integration for this org
    const integration = await db.query(`
      SELECT id, user_id, sync_enabled
      FROM crm_integrations
      WHERE crm_type = 'salesforce' AND org_id = $1 AND is_active = true
    `, [org_id]);

    if (integration.rows.length === 0) {
      return res.status(200).json({ ok: true, message: 'No matching integration' });
    }

    if (!integration.rows[0].sync_enabled) {
      return res.status(200).json({ ok: true, message: 'Sync disabled' });
    }

    // Store webhook event
    await db.query(`
      INSERT INTO crm_webhook_events (
        integration_id, crm_type, event_type, payload
      ) VALUES ($1, 'salesforce', $2, $3)
    `, [integration.rows[0].id, event_type, JSON.stringify(req.body)]);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Salesforce webhook error:', error);
    res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

module.exports = router;
