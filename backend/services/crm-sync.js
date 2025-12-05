// backend/services/crm-sync.js
// CRM Synchronization Service using MCP (Model Context Protocol)
// Supports: Go High Level, Salesforce

const db = require('../db');

// ============================================================================
// MCP CLIENT SETUP
// ============================================================================

/**
 * Creates an MCP client connection based on CRM type
 * Uses the official MCP endpoints for each CRM
 */
async function createMCPClient(integration) {
  const { crm_type, access_token, location_id, instance_url } = integration;

  switch (crm_type) {
    case 'gohighlevel':
      return {
        type: 'gohighlevel',
        baseUrl: 'https://services.leadconnectorhq.com/mcp',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        locationId: location_id
      };

    case 'salesforce':
      return {
        type: 'salesforce',
        baseUrl: `${instance_url}/services/data/v59.0`,
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      };

    default:
      throw new Error(`Unsupported CRM type: ${crm_type}`);
  }
}

// ============================================================================
// GO HIGH LEVEL SYNC
// ============================================================================

/**
 * Fetch contacts from Go High Level using MCP
 */
async function fetchGHLContacts(client, options = {}) {
  const { limit = 100, startAfterId = null, query = '' } = options;

  try {
    const params = new URLSearchParams({
      locationId: client.locationId,
      limit: limit.toString()
    });

    if (startAfterId) {
      params.append('startAfterId', startAfterId);
    }
    if (query) {
      params.append('query', query);
    }

    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/?${params}`,
      { headers: client.headers }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      contacts: data.contacts || [],
      meta: data.meta || {},
      nextPageToken: data.meta?.nextPageToken
    };
  } catch (error) {
    console.error('[GHL] Fetch contacts error:', error);
    throw error;
  }
}

/**
 * Map Go High Level contact to PRO IRP client format
 */
function mapGHLContactToClient(ghlContact, fieldMapping = {}) {
  const defaultMapping = {
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    address1: 'address',
    city: 'city',
    state: 'state',
    postalCode: 'zip',
    dateOfBirth: 'dob',
    tags: 'tags'
  };

  const mapping = { ...defaultMapping, ...fieldMapping };
  const client = {
    crm_source: 'gohighlevel',
    crm_id: ghlContact.id,
    source_type: 'crm_import'
  };

  // Map standard fields
  for (const [ghlField, irpField] of Object.entries(mapping)) {
    if (ghlField === 'customFields') continue; // Handle separately
    if (ghlContact[ghlField] !== undefined && ghlContact[ghlField] !== null) {
      // Handle special cases
      if (irpField === 'dob' && ghlContact[ghlField]) {
        client[irpField] = new Date(ghlContact[ghlField]).toISOString().split('T')[0];
      } else if (irpField === 'tags' && Array.isArray(ghlContact[ghlField])) {
        client[irpField] = ghlContact[ghlField];
      } else {
        client[irpField] = ghlContact[ghlField];
      }
    }
  }

  // Map custom fields (insurance-specific)
  if (mapping.customFields && ghlContact.customFields) {
    for (const [customKey, irpField] of Object.entries(mapping.customFields)) {
      const customField = ghlContact.customFields.find(cf =>
        cf.key === customKey || cf.name === customKey
      );
      if (customField && customField.value) {
        client[irpField] = customField.value;
      }
    }
  }

  return client;
}

// ============================================================================
// SALESFORCE SYNC
// ============================================================================

/**
 * Fetch contacts from Salesforce using SOQL
 */
async function fetchSalesforceContacts(client, options = {}) {
  const { limit = 200, offset = 0 } = options;

  try {
    // SOQL query for contacts
    const soql = `
      SELECT Id, FirstName, LastName, Email, Phone, MobilePhone,
             MailingStreet, MailingCity, MailingState, MailingPostalCode,
             Birthdate, Description, CreatedDate, LastModifiedDate
      FROM Contact
      ORDER BY LastModifiedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `.trim().replace(/\s+/g, ' ');

    const response = await fetch(
      `${client.baseUrl}/query?q=${encodeURIComponent(soql)}`,
      { headers: client.headers }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      contacts: data.records || [],
      totalSize: data.totalSize,
      done: data.done,
      nextRecordsUrl: data.nextRecordsUrl
    };
  } catch (error) {
    console.error('[Salesforce] Fetch contacts error:', error);
    throw error;
  }
}

/**
 * Map Salesforce contact to PRO IRP client format
 */
function mapSalesforceContactToClient(sfContact, fieldMapping = {}) {
  const defaultMapping = {
    FirstName: 'first_name',
    LastName: 'last_name',
    Email: 'email',
    Phone: 'phone',
    MobilePhone: 'phone', // Fallback
    MailingStreet: 'address',
    MailingCity: 'city',
    MailingState: 'state',
    MailingPostalCode: 'zip',
    Birthdate: 'dob',
    Description: 'notes'
  };

  const mapping = { ...defaultMapping, ...fieldMapping };
  const client = {
    crm_source: 'salesforce',
    crm_id: sfContact.Id,
    source_type: 'crm_import'
  };

  for (const [sfField, irpField] of Object.entries(mapping)) {
    if (sfContact[sfField] !== undefined && sfContact[sfField] !== null) {
      if (irpField === 'dob' && sfContact[sfField]) {
        client[irpField] = sfContact[sfField]; // Already in YYYY-MM-DD format
      } else if (irpField === 'phone' && !client.phone) {
        // Only set phone if not already set (prefer Phone over MobilePhone)
        client[irpField] = sfContact[sfField];
      } else if (irpField !== 'phone') {
        client[irpField] = sfContact[sfField];
      }
    }
  }

  return client;
}

// ============================================================================
// UNIFIED SYNC FUNCTIONS
// ============================================================================

/**
 * Sync contacts from CRM to PRO IRP
 * @param {string} integrationId - The integration UUID
 * @param {Object} options - Sync options
 * @returns {Object} Sync results
 */
async function syncContactsFromCRM(integrationId, options = {}) {
  const { fullSync = false, userId } = options;

  // Get integration details
  const intResult = await db.query(
    `SELECT * FROM crm_integrations WHERE id = $1 AND is_active = true`,
    [integrationId]
  );

  if (intResult.rows.length === 0) {
    throw new Error('Integration not found or inactive');
  }

  const integration = intResult.rows[0];

  // Create sync history record
  const syncResult = await db.query(`
    INSERT INTO crm_sync_history (integration_id, user_id, sync_type, direction, status)
    VALUES ($1, $2, $3, 'import', 'started')
    RETURNING id
  `, [integrationId, userId || integration.user_id, fullSync ? 'initial' : 'manual']);

  const syncId = syncResult.rows[0].id;
  const startTime = Date.now();

  let results = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Create MCP client
    const client = await createMCPClient(integration);

    // Fetch contacts based on CRM type
    let contacts = [];
    let hasMore = true;
    let cursor = null;

    while (hasMore) {
      let fetchResult;

      if (integration.crm_type === 'gohighlevel') {
        fetchResult = await fetchGHLContacts(client, {
          limit: 100,
          startAfterId: cursor
        });
        contacts = contacts.concat(fetchResult.contacts);
        cursor = fetchResult.nextPageToken;
        hasMore = !!cursor;
      } else if (integration.crm_type === 'salesforce') {
        fetchResult = await fetchSalesforceContacts(client, {
          limit: 200,
          offset: contacts.length
        });
        contacts = contacts.concat(fetchResult.contacts);
        hasMore = !fetchResult.done && contacts.length < fetchResult.totalSize;
      } else {
        hasMore = false;
      }

      // Update progress
      await db.query(`
        UPDATE crm_sync_history
        SET status = 'in_progress', total_records = $1
        WHERE id = $2
      `, [contacts.length, syncId]);

      // Limit for safety (can be removed in production)
      if (contacts.length >= 10000) {
        hasMore = false;
      }
    }

    results.total = contacts.length;

    // Process each contact
    for (const crmContact of contacts) {
      try {
        const processed = await processContact(integration, crmContact);
        if (processed.action === 'created') results.created++;
        else if (processed.action === 'updated') results.updated++;
        else if (processed.action === 'skipped') results.skipped++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          crmId: crmContact.id || crmContact.Id,
          error: error.message
        });
      }
    }

    // Update integration last sync
    await db.query(`
      UPDATE crm_integrations
      SET last_sync_at = CURRENT_TIMESTAMP,
          last_sync_status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [results.failed === 0 ? 'success' : 'partial', integrationId]);

    // Complete sync history
    const duration = Date.now() - startTime;
    await db.query(`
      UPDATE crm_sync_history
      SET status = $1,
          records_created = $2,
          records_updated = $3,
          records_skipped = $4,
          records_failed = $5,
          errors = $6,
          completed_at = CURRENT_TIMESTAMP,
          duration_ms = $7
      WHERE id = $8
    `, [
      results.failed === 0 ? 'completed' : 'partial',
      results.created,
      results.updated,
      results.skipped,
      results.failed,
      JSON.stringify(results.errors.slice(0, 100)), // Limit stored errors
      duration,
      syncId
    ]);

    return results;

  } catch (error) {
    // Record failure
    await db.query(`
      UPDATE crm_sync_history
      SET status = 'failed',
          errors = $1,
          completed_at = CURRENT_TIMESTAMP,
          duration_ms = $2
      WHERE id = $3
    `, [
      JSON.stringify([{ error: error.message }]),
      Date.now() - startTime,
      syncId
    ]);

    await db.query(`
      UPDATE crm_integrations
      SET last_sync_status = 'failed',
          last_sync_error = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [error.message, integrationId]);

    throw error;
  }
}

/**
 * Process a single contact from CRM
 */
async function processContact(integration, crmContact) {
  const crmId = crmContact.id || crmContact.Id;
  const fieldMapping = integration.field_mapping || {};

  // Map CRM contact to client format
  let clientData;
  if (integration.crm_type === 'gohighlevel') {
    clientData = mapGHLContactToClient(crmContact, fieldMapping);
  } else if (integration.crm_type === 'salesforce') {
    clientData = mapSalesforceContactToClient(crmContact, fieldMapping);
  } else {
    throw new Error(`Unsupported CRM type: ${integration.crm_type}`);
  }

  // Check if mapping exists
  const mappingResult = await db.query(`
    SELECT * FROM crm_contact_mapping
    WHERE integration_id = $1 AND crm_contact_id = $2
  `, [integration.id, crmId]);

  if (mappingResult.rows.length > 0) {
    // Update existing client
    const mapping = mappingResult.rows[0];

    if (mapping.client_id) {
      // Update the client
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      for (const [field, value] of Object.entries(clientData)) {
        if (field !== 'crm_source' && field !== 'crm_id' && field !== 'source_type') {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length > 0) {
        updateFields.push(`crm_last_synced_at = CURRENT_TIMESTAMP`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(mapping.client_id);

        await db.query(`
          UPDATE clients
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `, updateValues);
      }

      // Update mapping
      await db.query(`
        UPDATE crm_contact_mapping
        SET last_synced_at = CURRENT_TIMESTAMP,
            last_sync_direction = 'import',
            last_crm_data = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(crmContact), mapping.id]);

      return { action: 'updated', clientId: mapping.client_id };
    }
  }

  // Check for existing client by email (merge instead of duplicate)
  if (clientData.email) {
    const existingResult = await db.query(`
      SELECT id FROM clients
      WHERE owner_id = $1 AND LOWER(email) = LOWER($2)
    `, [integration.user_id, clientData.email]);

    if (existingResult.rows.length > 0) {
      const existingClientId = existingResult.rows[0].id;

      // Update existing client with CRM data
      const updateFields = ['crm_source = $1', 'crm_id = $2', 'crm_last_synced_at = CURRENT_TIMESTAMP'];
      const updateValues = [integration.crm_type, crmId];
      let paramIndex = 3;

      for (const [field, value] of Object.entries(clientData)) {
        if (!['crm_source', 'crm_id', 'source_type', 'email'].includes(field)) {
          updateFields.push(`${field} = COALESCE(${field}, $${paramIndex})`);
          updateValues.push(value);
          paramIndex++;
        }
      }

      updateValues.push(existingClientId);
      await db.query(`
        UPDATE clients
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `, updateValues);

      // Create mapping
      await db.query(`
        INSERT INTO crm_contact_mapping (integration_id, crm_contact_id, crm_contact_email, client_id, last_crm_data)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (integration_id, crm_contact_id) DO UPDATE
        SET client_id = EXCLUDED.client_id, last_synced_at = CURRENT_TIMESTAMP
      `, [integration.id, crmId, clientData.email, existingClientId, JSON.stringify(crmContact)]);

      return { action: 'updated', clientId: existingClientId };
    }
  }

  // Create new client
  const insertFields = ['owner_id'];
  const insertValues = [integration.user_id];
  const placeholders = ['$1'];
  let paramIndex = 2;

  for (const [field, value] of Object.entries(clientData)) {
    if (value !== undefined && value !== null) {
      insertFields.push(field);
      insertValues.push(field === 'tags' ? JSON.stringify(value) : value);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }
  }

  const insertResult = await db.query(`
    INSERT INTO clients (${insertFields.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING id
  `, insertValues);

  const newClientId = insertResult.rows[0].id;

  // Create mapping
  await db.query(`
    INSERT INTO crm_contact_mapping (integration_id, crm_contact_id, crm_contact_email, client_id, last_crm_data)
    VALUES ($1, $2, $3, $4, $5)
  `, [integration.id, crmId, clientData.email, newClientId, JSON.stringify(crmContact)]);

  return { action: 'created', clientId: newClientId };
}

// ============================================================================
// OAUTH HELPERS
// ============================================================================

/**
 * Generate OAuth URL for Go High Level
 */
function getGHLOAuthUrl(clientId, redirectUri, scopes = []) {
  const defaultScopes = [
    'contacts.readonly',
    'contacts.write',
    'locations.readonly',
    'opportunities.readonly'
  ];

  const allScopes = [...new Set([...defaultScopes, ...scopes])];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: allScopes.join(' '),
    response_type: 'code'
  });

  return `https://marketplace.gohighlevel.com/oauth/chooselocation?${params}`;
}

/**
 * Exchange GHL auth code for tokens
 */
async function exchangeGHLCode(code, clientId, clientSecret, redirectUri) {
  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GHL token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Generate OAuth URL for Salesforce
 */
function getSalesforceOAuthUrl(clientId, redirectUri) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'api refresh_token'
  });

  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}

/**
 * Exchange Salesforce auth code for tokens
 */
async function exchangeSalesforceCode(code, clientId, clientSecret, redirectUri) {
  const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce token exchange failed: ${error}`);
  }

  return response.json();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main sync function
  syncContactsFromCRM,

  // CRM-specific functions
  fetchGHLContacts,
  fetchSalesforceContacts,
  mapGHLContactToClient,
  mapSalesforceContactToClient,

  // OAuth helpers
  getGHLOAuthUrl,
  exchangeGHLCode,
  getSalesforceOAuthUrl,
  exchangeSalesforceCode,

  // MCP client
  createMCPClient
};
