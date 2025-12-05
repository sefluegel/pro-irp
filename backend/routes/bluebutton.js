// backend/routes/bluebutton.js - CMS Blue Button 2.0 Integration
// Handles Medicare beneficiary authorization and prescription data fetching
const express = require("express");
const router = express.Router();
const db = require("../db");
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BLUEBUTTON_CONFIG = {
  clientId: process.env.BLUEBUTTON_CLIENT_ID,
  clientSecret: process.env.BLUEBUTTON_CLIENT_SECRET,
  callbackUrl: process.env.BLUEBUTTON_CALLBACK_URL || 'http://localhost:8080/bluebutton/callback',
  authUrl: process.env.BLUEBUTTON_AUTH_URL || 'https://sandbox.bluebutton.cms.gov/v2/o/authorize/',
  tokenUrl: process.env.BLUEBUTTON_TOKEN_URL || 'https://sandbox.bluebutton.cms.gov/v2/o/token/',
  apiUrl: process.env.BLUEBUTTON_API_URL || 'https://sandbox.bluebutton.cms.gov/v2/fhir'
};

// Config loaded - URLs only logged in development
if (process.env.NODE_ENV !== 'production') {
  console.log('[bluebutton] Config loaded (dev mode)');
}

// Store PKCE verifiers temporarily (in production, use Redis or database)
const pkceStore = new Map();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate PKCE code verifier and challenge
 * Blue Button 2.0 requires PKCE for security
 */
function generatePKCE() {
  // Generate a random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');

  // Create SHA256 hash of verifier for challenge
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Refresh Blue Button access token
 */
async function refreshAccessToken(authorization) {
  if (!authorization.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(BLUEBUTTON_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: authorization.refresh_token,
      client_id: BLUEBUTTON_CONFIG.clientId,
      client_secret: BLUEBUTTON_CONFIG.clientSecret,
    })
  });

  const tokens = await response.json();

  if (tokens.error) {
    throw new Error(tokens.error_description || tokens.error);
  }

  // Update tokens in database
  await db.query(
    `UPDATE blue_button_authorizations
     SET access_token = $1,
         refresh_token = COALESCE($2, refresh_token),
         expires_at = $3,
         status = 'active',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [
      tokens.access_token,
      tokens.refresh_token,
      new Date(Date.now() + tokens.expires_in * 1000),
      authorization.id
    ]
  );

  return tokens.access_token;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(authorization) {
  const now = new Date();
  const expiresAt = new Date(authorization.expires_at);

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt - now < 5 * 60 * 1000) {
    // Token expiring soon, refreshing
    return await refreshAccessToken(authorization);
  }

  return authorization.access_token;
}

/**
 * Make authenticated API call to Blue Button
 */
async function blueButtonApiCall(authorization, endpoint, options = {}) {
  const accessToken = await getValidAccessToken(authorization);

  // API call in progress

  const response = await fetch(`${BLUEBUTTON_CONFIG.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/fhir+json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    // API error occurred - details not logged for security
    throw new Error(`Blue Button API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// ============================================================================
// OAUTH ROUTES
// ============================================================================

/**
 * GET /bluebutton/connect/:clientId
 * Generate authorization URL for a specific client
 * Agent initiates this to connect a client's Medicare data
 */
router.get("/connect/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    // Starting OAuth flow

    // Verify agent has access to this client (admins/fmos/managers can access all)
    const isPrivileged = ['admin', 'fmo', 'manager'].includes(userRole);
    const clientCheck = await db.query(
      `SELECT id, first_name, last_name FROM clients WHERE id = $1 AND (owner_id = $2 OR $3 = true)`,
      [clientId, userId, isPrivileged]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    // Check if already authorized
    const existingAuth = await db.query(
      `SELECT id, status FROM blue_button_authorizations WHERE client_id = $1`,
      [clientId]
    );

    if (existingAuth.rows.length > 0 && existingAuth.rows[0].status === 'active') {
      return res.status(400).json({
        ok: false,
        error: 'Client already has an active Blue Button connection',
        existingAuthId: existingAuth.rows[0].id
      });
    }

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Create state parameter (includes client ID and user ID for callback)
    const state = Buffer.from(JSON.stringify({
      clientId,
      userId,
      timestamp: Date.now()
    })).toString('base64url');

    // Store PKCE verifier (keyed by state)
    pkceStore.set(state, {
      codeVerifier,
      clientId,
      userId,
      createdAt: Date.now()
    });

    // Clean up old PKCE entries (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of pkceStore.entries()) {
      if (value.createdAt < tenMinutesAgo) {
        pkceStore.delete(key);
      }
    }

    // Build authorization URL
    const authUrl = new URL(BLUEBUTTON_CONFIG.authUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', BLUEBUTTON_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', BLUEBUTTON_CONFIG.callbackUrl);
    authUrl.searchParams.set('scope', 'patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Auth URL generated successfully

    res.json({
      ok: true,
      authUrl: authUrl.toString(),
      clientName: `${clientCheck.rows[0].first_name} ${clientCheck.rows[0].last_name}`
    });
  } catch (error) {
    console.error('[bluebutton] Connect error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /bluebutton/callback
 * OAuth callback from CMS Blue Button
 * Patient is redirected here after authorizing on Medicare.gov
 */
router.get("/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // OAuth callback received

    // Handle errors from Blue Button
    if (error) {
      console.error('[bluebutton] OAuth error:', error, error_description);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clients?bluebutton=error&message=${encodeURIComponent(error_description || error)}`
      );
    }

    if (!code || !state) {
      console.error('[bluebutton] Missing code or state');
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clients?bluebutton=error&message=Missing%20authorization%20code`
      );
    }

    // Retrieve PKCE verifier
    const pkceData = pkceStore.get(state);
    if (!pkceData) {
      console.error('[bluebutton] PKCE data not found for state');
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clients?bluebutton=error&message=Session%20expired`
      );
    }

    const { codeVerifier, clientId, userId } = pkceData;
    pkceStore.delete(state); // Clean up

    console.log('[bluebutton] Exchanging code for tokens, client:', clientId);

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(BLUEBUTTON_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: BLUEBUTTON_CONFIG.callbackUrl,
        client_id: BLUEBUTTON_CONFIG.clientId,
        client_secret: BLUEBUTTON_CONFIG.clientSecret,
        code_verifier: codeVerifier
      })
    });

    const tokens = await tokenResponse.json();

    console.log('[bluebutton] Token response received:', {
      has_access_token: !!tokens.access_token,
      access_token_length: tokens.access_token?.length,
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      error: tokens.error
    });

    if (tokens.error) {
      console.error('[bluebutton] Token exchange error:', tokens);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clients?bluebutton=error&message=${encodeURIComponent(tokens.error_description || tokens.error)}`
      );
    }

    console.log('[bluebutton] Got tokens, fetching patient info...');

    // Fetch patient info to get Medicare Beneficiary ID
    const patientResponse = await fetch(`${BLUEBUTTON_CONFIG.apiUrl}/Patient`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/fhir+json'
      }
    });

    const patientData = await patientResponse.json();
    let medicareBeneficiaryId = null;

    // Extract Medicare Beneficiary ID from Patient resource
    if (patientData.entry && patientData.entry.length > 0) {
      const patient = patientData.entry[0].resource;
      const mbiIdentifier = patient.identifier?.find(id =>
        id.system === 'http://hl7.org/fhir/sid/us-mbi'
      );
      medicareBeneficiaryId = mbiIdentifier?.value;
    }

    // Store authorization in database
    const result = await db.query(
      `INSERT INTO blue_button_authorizations
       (client_id, medicare_beneficiary_id, access_token, refresh_token, token_type, expires_at, scope, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       ON CONFLICT (client_id)
       DO UPDATE SET
         medicare_beneficiary_id = EXCLUDED.medicare_beneficiary_id,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_type = EXCLUDED.token_type,
         expires_at = EXCLUDED.expires_at,
         scope = EXCLUDED.scope,
         status = 'active',
         last_error = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        clientId,
        medicareBeneficiaryId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.token_type || 'Bearer',
        new Date(Date.now() + tokens.expires_in * 1000),
        tokens.scope
      ]
    );

    console.log('[bluebutton] Authorization saved, id:', result.rows[0].id);

    // HIPAA audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, client_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          clientId,
          'BLUEBUTTON_CONNECTED',
          'blue_button_authorization',
          result.rows[0].id,
          JSON.stringify({ scope: tokens.scope, medicare_beneficiary_id: medicareBeneficiaryId ? '[REDACTED]' : null })
        ]
      );
    } catch (auditError) {
      console.warn('[bluebutton] Audit log error:', auditError.message);
    }

    // Redirect to client profile with success message
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clients/${clientId}?bluebutton=connected`
    );
  } catch (error) {
    console.error('[bluebutton] Callback error:', error);
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clients?bluebutton=error&message=${encodeURIComponent(error.message)}`
    );
  }
});

// ============================================================================
// AUTHORIZATION MANAGEMENT
// ============================================================================

/**
 * GET /bluebutton/status/:clientId
 * Check Blue Button authorization status for a client
 */
router.get("/status/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    // Verify agent has access to this client (admins/fmos/managers can access all)
    const isPrivileged = ['admin', 'fmo', 'manager'].includes(userRole);
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND (owner_id = $2 OR $3 = true)`,
      [clientId, userId, isPrivileged]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    const auth = await db.query(
      `SELECT id, status, last_sync_at, last_sync_status, last_error, created_at, updated_at
       FROM blue_button_authorizations
       WHERE client_id = $1`,
      [clientId]
    );

    if (auth.rows.length === 0) {
      return res.json({
        ok: true,
        connected: false,
        status: 'not_connected'
      });
    }

    res.json({
      ok: true,
      connected: auth.rows[0].status === 'active',
      status: auth.rows[0].status,
      lastSync: auth.rows[0].last_sync_at,
      lastSyncStatus: auth.rows[0].last_sync_status,
      lastError: auth.rows[0].last_error,
      connectedAt: auth.rows[0].created_at
    });
  } catch (error) {
    console.error('[bluebutton] Status check error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /bluebutton/disconnect/:clientId
 * Disconnect Blue Button for a client
 */
router.delete("/disconnect/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    console.log('[bluebutton] Disconnect request - clientId:', clientId, 'userId:', userId, 'role:', userRole);

    // Verify agent has access to this client (admins/fmos/managers can access all)
    const isPrivileged = ['admin', 'fmo', 'manager'].includes(userRole);
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND (owner_id = $2 OR $3 = true)`,
      [clientId, userId, isPrivileged]
    );

    console.log('[bluebutton] Client check result:', clientCheck.rows.length, 'rows, isPrivileged:', isPrivileged);

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    // Update status to revoked (keep data for audit purposes)
    await db.query(
      `UPDATE blue_button_authorizations
       SET status = 'revoked',
           access_token = NULL,
           refresh_token = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE client_id = $1`,
      [clientId]
    );

    // HIPAA audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, client_id, action, resource_type, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, clientId, 'BLUEBUTTON_DISCONNECTED', 'blue_button_authorization', '{}']
      );
    } catch (auditError) {
      console.warn('[bluebutton] Audit log error:', auditError.message);
    }

    res.json({ ok: true, message: 'Blue Button disconnected successfully' });
  } catch (error) {
    console.error('[bluebutton] Disconnect error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * POST /bluebutton/sync/:clientId
 * Trigger immediate sync of prescription data for a client
 */
router.post("/sync/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';

    console.log('[bluebutton] Sync request - clientId:', clientId, 'userId:', userId, 'role:', userRole);

    // Verify agent has access to this client (admins/fmos/managers can access all)
    const isPrivileged = ['admin', 'fmo', 'manager'].includes(userRole);
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND (owner_id = $2 OR $3 = true)`,
      [clientId, userId, isPrivileged]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    // Get authorization
    const auth = await db.query(
      `SELECT * FROM blue_button_authorizations WHERE client_id = $1 AND status = 'active'`,
      [clientId]
    );

    if (auth.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Blue Button not connected for this client' });
    }

    const authorization = auth.rows[0];

    // Create sync log entry
    const syncLog = await db.query(
      `INSERT INTO blue_button_sync_log (authorization_id, client_id, sync_type)
       VALUES ($1, $2, 'manual')
       RETURNING id`,
      [authorization.id, clientId]
    );

    const syncId = syncLog.rows[0].id;

    console.log('[bluebutton] Starting sync for client:', clientId, 'sync_id:', syncId);

    try {
      let claimsFetched = 0;
      let newClaims = 0;
      let changesDetected = 0;
      let clientUpdates = {};

      // =========================================================================
      // 1. FETCH PATIENT DATA - Demographics
      // =========================================================================
      console.log('[bluebutton] Fetching Patient data...');
      try {
        const patientData = await blueButtonApiCall(authorization, '/Patient');
        if (patientData.entry && patientData.entry.length > 0) {
          const patient = patientData.entry[0].resource;
          console.log('[bluebutton] Patient data received');

          // Extract name
          const name = patient.name?.find(n => n.use === 'usual') || patient.name?.[0];
          if (name) {
            if (name.given?.[0]) clientUpdates.first_name = name.given[0];
            if (name.family) clientUpdates.last_name = name.family;
          }

          // Extract DOB
          if (patient.birthDate) {
            clientUpdates.dob = patient.birthDate;
          }

          // Extract address
          const address = patient.address?.find(a => a.use === 'home') || patient.address?.[0];
          if (address) {
            if (address.line?.length > 0) clientUpdates.address = address.line.join(', ');
            if (address.city) clientUpdates.city = address.city;
            if (address.state) clientUpdates.state = address.state;
            if (address.postalCode) clientUpdates.zip = address.postalCode;
          }

          // Extract phone
          const phone = patient.telecom?.find(t => t.system === 'phone');
          if (phone?.value) clientUpdates.phone = phone.value;

          // Extract email
          const email = patient.telecom?.find(t => t.system === 'email');
          if (email?.value) clientUpdates.email = email.value;
        }
      } catch (patientErr) {
        console.log('[bluebutton] Patient fetch error (non-fatal):', patientErr.message);
      }

      // =========================================================================
      // 2. FETCH COVERAGE DATA - Plan Information
      // =========================================================================
      console.log('[bluebutton] Fetching Coverage data...');
      try {
        const coverageData = await blueButtonApiCall(authorization, '/Coverage');
        if (coverageData.entry && coverageData.entry.length > 0) {
          console.log('[bluebutton] Found', coverageData.entry.length, 'coverage records');

          // Find the most recent/active Part D coverage
          let partDCoverage = null;
          let partCCoverage = null;

          for (const entry of coverageData.entry) {
            const coverage = entry.resource;
            const typeCode = coverage.type?.coding?.[0]?.code;

            // Part D (prescription drug)
            if (typeCode === 'DRUGPOL' || typeCode === 'Part D' || coverage.class?.some(c => c.type?.coding?.[0]?.code === 'rxid')) {
              partDCoverage = coverage;
            }
            // Part C (Medicare Advantage)
            if (typeCode === 'MCPOL' || typeCode === 'Part C' || typeCode === 'HMO' || typeCode === 'PPO') {
              partCCoverage = coverage;
            }
          }

          // Use Part C if available, otherwise Part D
          const primaryCoverage = partCCoverage || partDCoverage || coverageData.entry[0].resource;

          if (primaryCoverage) {
            // Extract plan name from class
            const planClass = primaryCoverage.class?.find(c =>
              c.type?.coding?.[0]?.code === 'plan' || c.type?.coding?.[0]?.code === 'group'
            );
            if (planClass?.name) clientUpdates.plan = planClass.name;
            if (planClass?.value) clientUpdates.plan = planClass.value;

            // Extract carrier/payor
            if (primaryCoverage.payor?.[0]?.display) {
              clientUpdates.carrier = primaryCoverage.payor[0].display;
            }

            // Extract contract info for plan type detection
            const contractClass = primaryCoverage.class?.find(c =>
              c.type?.coding?.[0]?.code === 'subgroup' || c.type?.coding?.[0]?.code === 'subplan'
            );

            // Try to determine plan type from coverage type
            const coverageType = primaryCoverage.type?.coding?.[0]?.code;
            if (coverageType) {
              if (coverageType === 'MCPOL' || coverageType.includes('HMO') || coverageType.includes('PPO')) {
                clientUpdates.plan_type = 'MA'; // Medicare Advantage
              } else if (coverageType === 'DRUGPOL') {
                clientUpdates.plan_type = 'PDP'; // Part D only
              }
            }

            // Extract effective date
            if (primaryCoverage.period?.start) {
              clientUpdates.effective_date = primaryCoverage.period.start;
            }

            // Check for DSNP indicators (dual eligible)
            const extensions = primaryCoverage.extension || [];
            const dualEligible = extensions.some(ext =>
              ext.url?.includes('dual') || ext.valueBoolean === true
            );
            if (dualEligible) {
              clientUpdates.plan_type = 'DSNP';
            }
          }
        }
      } catch (coverageErr) {
        console.log('[bluebutton] Coverage fetch error (non-fatal):', coverageErr.message);
      }

      // =========================================================================
      // 3. FETCH ALL EOB DATA - Claims (Part D, Part A, Part B)
      // =========================================================================
      console.log('[bluebutton] Fetching ExplanationOfBenefit data...');

      // Fetch Part D (pharmacy) claims
      try {
        const eobData = await blueButtonApiCall(authorization, '/ExplanationOfBenefit');

        if (eobData.entry) {
          console.log('[bluebutton] Found', eobData.entry.length, 'total claims');

          for (const entry of eobData.entry) {
            const eob = entry.resource;
            const claimType = eob.type?.coding?.[0]?.code;

            // Process Part D (pharmacy) claims
            if (claimType === 'PDE' || claimType === 'pharmacy' ||
                eob.type?.coding?.some(c => c.code === 'PDE' || c.code === 'pharmacy')) {
              claimsFetched++;
              const claimResult = await processPartDClaim(clientId, eob);
              if (claimResult.isNew) newClaims++;
              if (claimResult.changeDetected) changesDetected++;
            }
          }
        }
      } catch (eobErr) {
        console.log('[bluebutton] EOB fetch error:', eobErr.message);
        throw eobErr;
      }

      // =========================================================================
      // 4. UPDATE CLIENT RECORD with all gathered data
      // =========================================================================
      if (Object.keys(clientUpdates).length > 0) {
        console.log('[bluebutton] Updating client with:', Object.keys(clientUpdates));

        // Build dynamic update query (only update fields that have values)
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        for (const [field, value] of Object.entries(clientUpdates)) {
          if (value !== null && value !== undefined && value !== '') {
            updateFields.push(`${field} = $${paramIndex}`);
            updateValues.push(value);
            paramIndex++;
          }
        }

        if (updateFields.length > 0) {
          updateValues.push(clientId); // For WHERE clause
          await db.query(
            `UPDATE clients SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
            updateValues
          );
          console.log('[bluebutton] Client record updated with Blue Button data');
        }
      }

      // Update sync log
      await db.query(
        `UPDATE blue_button_sync_log
         SET completed_at = CURRENT_TIMESTAMP,
             status = 'completed',
             claims_fetched = $1,
             new_claims = $2,
             changes_detected = $3
         WHERE id = $4`,
        [claimsFetched, newClaims, changesDetected, syncId]
      );

      // Update authorization last sync
      await db.query(
        `UPDATE blue_button_authorizations
         SET last_sync_at = CURRENT_TIMESTAMP,
             last_sync_status = 'success'
         WHERE id = $1`,
        [authorization.id]
      );

      console.log('[bluebutton] Sync completed:', { claimsFetched, newClaims, changesDetected, clientFieldsUpdated: Object.keys(clientUpdates) });

      res.json({
        ok: true,
        syncId,
        claimsFetched,
        newClaims,
        changesDetected,
        clientFieldsUpdated: Object.keys(clientUpdates)
      });
    } catch (syncError) {
      // Update sync log with error
      await db.query(
        `UPDATE blue_button_sync_log
         SET completed_at = CURRENT_TIMESTAMP,
             status = 'failed',
             error_message = $1
         WHERE id = $2`,
        [syncError.message, syncId]
      );

      // Update authorization with error
      await db.query(
        `UPDATE blue_button_authorizations
         SET last_sync_status = 'error',
             last_error = $1
         WHERE id = $2`,
        [syncError.message, authorization.id]
      );

      throw syncError;
    }
  } catch (error) {
    console.error('[bluebutton] Sync error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Process a Part D claim from FHIR ExplanationOfBenefit
 */
async function processPartDClaim(clientId, eob) {
  const result = { isNew: false, changeDetected: false };

  // Extract claim ID
  const claimId = eob.id || eob.identifier?.[0]?.value;
  if (!claimId) return result;

  // Check if we already have this claim
  const existing = await db.query(
    `SELECT id FROM prescription_claims WHERE client_id = $1 AND claim_id = $2`,
    [clientId, claimId]
  );

  if (existing.rows.length > 0) {
    return result; // Already processed
  }

  result.isNew = true;

  // Extract drug info from item
  const item = eob.item?.[0];
  const drugCode = item?.productOrService?.coding?.[0];
  const ndcCode = drugCode?.system?.includes('ndc') ? drugCode.code : null;

  // Extract fill date
  let fillDate = null;
  if (eob.billablePeriod?.start) {
    fillDate = eob.billablePeriod.start.split('T')[0];
  } else if (item?.servicedDate) {
    fillDate = item.servicedDate;
  }

  // Extract quantity and days supply
  const quantity = item?.quantity?.value;
  const daysSupply = item?.quantity?.extension?.find(e =>
    e.url?.includes('daysSupply')
  )?.valueQuantity?.value;

  // Extract cost info
  const totalCost = eob.total?.find(t => t.category?.coding?.[0]?.code === 'submitted')?.amount?.value;
  const patientPay = eob.total?.find(t => t.category?.coding?.[0]?.code === 'benefit')?.amount?.value;

  // Extract pharmacy info
  const pharmacy = eob.facility?.display;
  const pharmacyNpi = eob.facility?.identifier?.value;

  // Extract prescriber info
  const prescriber = eob.careTeam?.find(ct => ct.role?.coding?.[0]?.code === 'prescriber');
  const prescriberNpi = prescriber?.provider?.identifier?.value;
  const prescriberName = prescriber?.provider?.display;

  // Get drug name (would typically need to look up NDC in a database)
  const drugName = drugCode?.display || `NDC: ${ndcCode}`;

  // Insert claim
  await db.query(
    `INSERT INTO prescription_claims (
      client_id, claim_id, drug_name, ndc_code, fill_date,
      quantity, days_supply, pharmacy_name, pharmacy_npi,
      prescriber_npi, prescriber_name, total_cost_cents, patient_pay_cents,
      fhir_resource_id, fhir_raw
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      clientId,
      claimId,
      drugName,
      ndcCode,
      fillDate,
      quantity,
      daysSupply,
      pharmacy,
      pharmacyNpi,
      prescriberNpi,
      prescriberName,
      totalCost ? Math.round(totalCost * 100) : null,
      patientPay ? Math.round(patientPay * 100) : null,
      eob.id,
      JSON.stringify(eob)
    ]
  );

  // Check for prescription changes (new medication detection)
  const previousClaim = await db.query(
    `SELECT id, drug_name, ndc_code, prescriber_npi
     FROM prescription_claims
     WHERE client_id = $1 AND ndc_code = $2 AND id != (
       SELECT id FROM prescription_claims WHERE client_id = $1 AND claim_id = $3
     )
     ORDER BY fill_date DESC
     LIMIT 1`,
    [clientId, ndcCode, claimId]
  );

  if (previousClaim.rows.length === 0 && ndcCode) {
    // This is a new medication!
    result.changeDetected = true;

    await db.query(
      `INSERT INTO prescription_changes (
        client_id, change_type, drug_name, ndc_code, new_value, risk_weight
      ) VALUES ($1, 'new_medication', $2, $3, $4, $5)`,
      [
        clientId,
        drugName,
        ndcCode,
        fillDate,
        5 // Base weight for new medication
      ]
    );
  } else if (previousClaim.rows.length > 0) {
    // Check for prescriber change
    if (previousClaim.rows[0].prescriber_npi !== prescriberNpi && prescriberNpi) {
      result.changeDetected = true;

      await db.query(
        `INSERT INTO prescription_changes (
          client_id, change_type, drug_name, ndc_code, previous_value, new_value, risk_weight
        ) VALUES ($1, 'new_prescriber', $2, $3, $4, $5, $6)`,
        [
          clientId,
          drugName,
          ndcCode,
          previousClaim.rows[0].prescriber_npi,
          prescriberNpi,
          10 // Higher weight for prescriber change
        ]
      );
    }
  }

  return result;
}

/**
 * GET /bluebutton/claims/:clientId
 * Get prescription claims for a client
 */
router.get("/claims/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const { limit = 50, offset = 0 } = req.query;

    // Verify agent has access to this client (admins/fmos/managers can access all)
    const isPrivileged = ['admin', 'fmo', 'manager'].includes(userRole);
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND (owner_id = $2 OR $3 = true)`,
      [clientId, userId, isPrivileged]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    const claims = await db.query(
      `SELECT
        id, drug_name, generic_name, ndc_code, fill_date,
        quantity, days_supply, pharmacy_name, prescriber_name,
        total_cost_cents, patient_pay_cents, coverage_phase,
        created_at
       FROM prescription_claims
       WHERE client_id = $1
       ORDER BY fill_date DESC
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM prescription_claims WHERE client_id = $1`,
      [clientId]
    );

    res.json({
      ok: true,
      claims: claims.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[bluebutton] Claims fetch error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /bluebutton/changes/:clientId
 * Get prescription changes (for risk scoring) for a client
 */
router.get("/changes/:clientId", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { clientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const { limit = 20, unreviewed_only = 'false' } = req.query;

    // Verify agent has access to this client (admins/fmos/managers can access all)
    const isPrivileged = ['admin', 'fmo', 'manager'].includes(userRole);
    const clientCheck = await db.query(
      `SELECT id FROM clients WHERE id = $1 AND (owner_id = $2 OR $3 = true)`,
      [clientId, userId, isPrivileged]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found or access denied' });
    }

    let query = `
      SELECT
        id, change_type, drug_name, ndc_code, drug_class,
        previous_value, new_value, risk_weight,
        detected_at, reviewed_at
       FROM prescription_changes
       WHERE client_id = $1
    `;

    if (unreviewed_only === 'true') {
      query += ` AND reviewed_at IS NULL`;
    }

    query += ` ORDER BY detected_at DESC LIMIT $2`;

    const changes = await db.query(query, [clientId, limit]);

    res.json({
      ok: true,
      changes: changes.rows
    });
  } catch (error) {
    console.error('[bluebutton] Changes fetch error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /bluebutton/changes/:changeId/review
 * Mark a prescription change as reviewed
 */
router.post("/changes/:changeId/review", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    const { changeId } = req.params;
    const userId = req.user.id;

    await db.query(
      `UPDATE prescription_changes
       SET reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
       WHERE id = $2`,
      [userId, changeId]
    );

    res.json({ ok: true, message: 'Change marked as reviewed' });
  } catch (error) {
    console.error('[bluebutton] Review error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
