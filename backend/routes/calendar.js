// backend/routes/calendar.js - Calendar integration (Google & Microsoft)
const express = require("express");
const router = express.Router();
const db = require("../db");
const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

// ============================================================================
// GOOGLE CALENDAR OAUTH
// ============================================================================

/**
 * Initialize Google OAuth2 client
 */
function getGoogleOAuthClient() {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/calendar/google/callback';

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/**
 * Get a valid OAuth2 client with refreshed tokens if needed
 */
async function getAuthenticatedGoogleClient(integration) {
  const oauth2Client = getGoogleOAuthClient();

  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : null
  });

  // Check if token is expired or will expire in the next 5 minutes
  const now = Date.now();
  const expiryDate = integration.token_expiry ? new Date(integration.token_expiry).getTime() : 0;
  const isExpired = expiryDate && (expiryDate - now < 5 * 60 * 1000);

  if (isExpired && integration.refresh_token) {
    // Access token expired, refreshing
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update tokens in database
      await db.query(
        `UPDATE calendar_integrations
         SET access_token = $1, token_expiry = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          credentials.access_token,
          credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          integration.id
        ]
      );

      oauth2Client.setCredentials(credentials);
    } catch (refreshError) {
      console.error('[calendar] Failed to refresh token:', refreshError.message);
      throw new Error('Failed to refresh Google access token. Please reconnect your Google Calendar.');
    }
  }

  return oauth2Client;
}

/**
 * GET /calendar/google/connect
 * Initiate Google Calendar OAuth flow
 */
router.get("/google/connect", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;

    const oauth2Client = getGoogleOAuthClient();

    // Generate authorization URL with full calendar access
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force re-consent to get fresh refresh token
      scope: [
        'https://www.googleapis.com/auth/calendar',  // Full read/write access to all calendars
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send' // Email sending
      ],
      state: userId // Pass user ID in state for callback
    });

    res.json({ ok: true, authUrl });
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /calendar/google/callback
 * Handle Google OAuth callback
 */
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;

    // Google OAuth callback received

    if (!code || !userId) {
      console.error('[calendar] Missing code or userId:', { code: !!code, userId: !!userId });
      return res.status(400).send('Missing authorization code or user ID');
    }

    const oauth2Client = getGoogleOAuthClient();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens in database
    const result = await db.query(
      `INSERT INTO calendar_integrations (user_id, provider, access_token, refresh_token, token_expiry, scope, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         scope = EXCLUDED.scope,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        userId,
        'google',
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        tokens.scope,
        JSON.stringify({ token_type: tokens.token_type })
      ]
    );
    console.log('[calendar] Integration saved successfully, id:', result.rows[0]?.id);

    // HIPAA audit log (optional - skip if table doesn't exist)
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          'CALENDAR_CONNECTED',
          'calendar_integration',
          JSON.stringify({ provider: 'google', scope: tokens.scope })
        ]
      );
    } catch (auditError) {
      console.warn('⚠️  Audit log skipped (table may not exist):', auditError.message);
    }

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar=connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar=error`);
  }
});

// ============================================================================
// MICROSOFT OUTLOOK OAUTH
// ============================================================================

/**
 * GET /calendar/microsoft/connect
 * Initiate Microsoft Outlook OAuth flow
 */
router.get("/microsoft/connect", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;
    console.log('[calendar] Starting Microsoft OAuth for user:', userId);

    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/calendar/microsoft/callback';
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const scope = 'openid profile offline_access Calendars.ReadWrite Mail.Send'; // Added Mail.Send for email

    // Generate Microsoft authorization URL
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${userId}` +
      `&response_mode=query`;

    res.json({ ok: true, authUrl });
  } catch (error) {
    console.error('Microsoft OAuth initiation error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /calendar/microsoft/callback
 * Handle Microsoft OAuth callback
 */
router.get("/microsoft/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;

    if (!code || !userId) {
      return res.status(400).send('Missing authorization code or user ID');
    }

    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/calendar/microsoft/callback';

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile offline_access Calendars.ReadWrite Mail.Send'
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    // Store tokens in database
    await db.query(
      `INSERT INTO calendar_integrations (user_id, provider, access_token, refresh_token, token_expiry, scope, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         scope = EXCLUDED.scope,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        'microsoft',
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        tokens.scope,
        JSON.stringify({ token_type: tokens.token_type })
      ]
    );

    // HIPAA audit log (optional - skip if table doesn't exist)
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          'CALENDAR_CONNECTED',
          'calendar_integration',
          JSON.stringify({ provider: 'microsoft', scope: tokens.scope })
        ]
      );
    } catch (auditError) {
      console.warn('⚠️  Audit log skipped (table may not exist):', auditError.message);
    }

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar=connected`);
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar=error`);
  }
});

// ============================================================================
// CALENDAR SYNC & MANAGEMENT
// ============================================================================

/**
 * GET /calendar/integrations
 * Get user's connected calendar integrations
 */
router.get("/integrations", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, provider, scope, calendar_id, created_at, updated_at
       FROM calendar_integrations
       WHERE user_id = $1`,
      [userId]
    );

    res.json({ ok: true, integrations: result.rows });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /calendar/google/calendars
 * Get list of user's Google Calendars
 */
router.get("/google/calendars", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;
    console.log('[calendar] Fetching Google calendars for user:', userId);

    // Get calendar integration
    const integration = await db.query(
      `SELECT * FROM calendar_integrations
       WHERE user_id = $1 AND provider = $2`,
      [userId, 'google']
    );

    if (integration.rows.length === 0) {
      console.log('[calendar] No Google integration found for user:', userId);
      return res.status(404).json({ ok: false, error: 'Google Calendar not connected. Please connect your Google account first in Settings.' });
    }
    console.log('[calendar] Found integration, fetching calendar list...');

    // Fetch calendar list from Google with auto-refresh
    const oauth2Client = await getAuthenticatedGoogleClient(integration.rows[0]);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.calendarList.list();

    const calendars = response.data.items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole
    }));

    res.json({ ok: true, calendars });
  } catch (error) {
    console.error('Get calendar list error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PUT /calendar/integrations/:provider/calendar
 * Update selected calendar for a provider
 */
router.put("/integrations/:provider/calendar", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;
    const { provider } = req.params;
    const { calendarId } = req.body;

    if (!calendarId) {
      return res.status(400).json({ ok: false, error: 'Calendar ID is required' });
    }

    await db.query(
      `UPDATE calendar_integrations
       SET calendar_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND provider = $3`,
      [calendarId, userId, provider]
    );

    res.json({ ok: true, message: 'Calendar updated successfully' });
  } catch (error) {
    console.error('Update calendar error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /calendar/events
 * Fetch events from connected calendar(s)
 */
router.get("/events", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;
    const { start, end, provider } = req.query;

    console.log('[calendar] Fetching events for user:', userId);

    // Get calendar integrations
    const integrations = await db.query(
      `SELECT * FROM calendar_integrations
       WHERE user_id = $1 ${provider ? 'AND provider = $2' : ''}`,
      provider ? [userId, provider] : [userId]
    );

    console.log('[calendar] Found', integrations.rows.length, 'integrations');

    if (integrations.rows.length === 0) {
      console.log('[calendar] No integrations found, returning empty events');
      return res.json({ ok: true, events: [] });
    }

    const allEvents = [];

    // Fetch events from each connected calendar
    for (const integration of integrations.rows) {
      try {
        console.log('[calendar] Fetching from provider:', integration.provider, 'calendar_id:', integration.calendar_id);
        let events;

        if (integration.provider === 'google') {
          events = await fetchGoogleCalendarEvents(integration, start, end);
        } else if (integration.provider === 'microsoft') {
          events = await fetchMicrosoftCalendarEvents(integration, start, end);
        }

        if (events) {
          console.log('[calendar] Got', events.length, 'events from', integration.provider);
          allEvents.push(...events);
        }
      } catch (error) {
        console.error(`[calendar] Error fetching ${integration.provider} events:`, error.message);
        // Continue with other calendars even if one fails
      }
    }

    res.json({ ok: true, events: allEvents });
  } catch (error) {
    console.error('Fetch calendar events error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /calendar/events
 * Create event in connected calendar
 */
router.post("/events", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;
    const { provider, summary, description, start, end, attendees, location } = req.body;

    // Get calendar integration
    const integration = await db.query(
      `SELECT * FROM calendar_integrations
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    if (integration.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Calendar not connected' });
    }

    let event;

    if (provider === 'google') {
      event = await createGoogleCalendarEvent(integration.rows[0], {
        summary, description, start, end, attendees, location
      });
    } else if (provider === 'microsoft') {
      event = await createMicrosoftCalendarEvent(integration.rows[0], {
        summary, description, start, end, attendees, location
      });
    }

    // HIPAA audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        'CALENDAR_EVENT_CREATED',
        'calendar_event',
        JSON.stringify({ provider, summary, start, end })
      ]
    );

    res.json({ ok: true, event });
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /calendar/integrations/:provider
 * Disconnect calendar integration
 */
router.delete("/integrations/:provider", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    const userId = req.user.id;
    const { provider } = req.params;

    await db.query(
      `DELETE FROM calendar_integrations
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    // HIPAA audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        'CALENDAR_DISCONNECTED',
        'calendar_integration',
        JSON.stringify({ provider })
      ]
    );

    res.json({ ok: true, message: `${provider} calendar disconnected` });
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// HELPER FUNCTIONS - GOOGLE CALENDAR
// ============================================================================

async function fetchGoogleCalendarEvents(integration, start, end) {
  // Get authenticated client with auto-refresh
  const oauth2Client = await getAuthenticatedGoogleClient(integration);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Use the selected calendar_id or default to 'primary'
  const calendarId = integration.calendar_id || 'primary';

  // Default to start of current year and 2 years ahead
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1); // January 1st of current year
  const defaultEnd = new Date(now);
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 2); // 2 years ahead

  const timeMin = start || defaultStart.toISOString();
  const timeMax = end || defaultEnd.toISOString();

  console.log('[calendar] Fetching Google events:', { calendarId, timeMin, timeMax });

  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500, // Maximum allowed by Google API
    showDeleted: false,
    showHiddenInvitations: false,
  });

  console.log('[calendar] API Response summary:', response.data.summary);
  console.log('[calendar] Found', response.data.items?.length || 0, 'events');
  console.log('[calendar] nextPageToken:', response.data.nextPageToken || 'none');

  // Log first event for debugging if any exist
  if (response.data.items?.length > 0) {
    console.log('[calendar] First event:', JSON.stringify(response.data.items[0], null, 2));
  } else {
    console.log('[calendar] No events returned. Full response keys:', Object.keys(response.data));
  }

  return response.data.items.map(event => ({
    id: event.id,
    provider: 'google',
    summary: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    location: event.location,
    attendees: event.attendees,
    htmlLink: event.htmlLink
  }));
}

async function createGoogleCalendarEvent(integration, eventData) {
  // Get authenticated client with auto-refresh
  const oauth2Client = await getAuthenticatedGoogleClient(integration);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Use the selected calendar_id or default to 'primary'
  const calendarId = integration.calendar_id || 'primary';

  const event = {
    summary: eventData.summary,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.start,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: eventData.end,
      timeZone: 'America/New_York',
    },
    attendees: eventData.attendees?.map(email => ({ email })),
  };

  const response = await calendar.events.insert({
    calendarId: calendarId,
    resource: event,
  });

  return response.data;
}

// ============================================================================
// HELPER FUNCTIONS - MICROSOFT CALENDAR
// ============================================================================

async function fetchMicrosoftCalendarEvents(integration, start, end) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, integration.access_token);
    }
  });

  let query = client.api('/me/calendar/events')
    .select('subject,body,start,end,location,attendees,webLink')
    .orderby('start/dateTime');

  if (start) {
    query = query.filter(`start/dateTime ge '${start}'`);
  }
  if (end) {
    query = query.filter(`end/dateTime le '${end}'`);
  }

  const response = await query.get();

  return response.value.map(event => ({
    id: event.id,
    provider: 'microsoft',
    summary: event.subject,
    description: event.body?.content,
    start: event.start.dateTime,
    end: event.end.dateTime,
    location: event.location?.displayName,
    attendees: event.attendees,
    htmlLink: event.webLink
  }));
}

async function createMicrosoftCalendarEvent(integration, eventData) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, integration.access_token);
    }
  });

  const event = {
    subject: eventData.summary,
    body: {
      contentType: 'HTML',
      content: eventData.description
    },
    start: {
      dateTime: eventData.start,
      timeZone: 'Eastern Standard Time'
    },
    end: {
      dateTime: eventData.end,
      timeZone: 'Eastern Standard Time'
    },
    location: {
      displayName: eventData.location
    },
    attendees: eventData.attendees?.map(email => ({
      emailAddress: { address: email },
      type: 'required'
    }))
  };

  const response = await client.api('/me/calendar/events').post(event);
  return response;
}

module.exports = router;
