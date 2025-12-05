// backend/utils/agent-email.js - Send emails via agent's connected Gmail/Outlook
const db = require('../db');
const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

// ============================================================================
// GMAIL SENDING
// ============================================================================

/**
 * Send email via agent's connected Gmail account
 * @param {Object} options - Email options
 * @param {string} options.userId - User ID (agent)
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {string} options.clientId - Client ID (for logging)
 * @returns {Promise<Object>} - Send result
 */
async function sendViaGmail({ userId, to, subject, text, html, clientId }) {
  try {
    // Get user's Gmail integration
    const integration = await db.query(
      `SELECT * FROM calendar_integrations
       WHERE user_id = $1 AND provider = 'google'`,
      [userId]
    );

    if (integration.rows.length === 0) {
      throw new Error('Gmail not connected. User must connect their Gmail account first.');
    }

    const tokens = integration.rows[0];

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });

    // Create email message in RFC 2822 format
    const emailBody = html || text;
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      emailBody
    ];
    const message = messageParts.join('\n');

    // Encode message in base64url format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`✅ Email sent via Gmail to ${to}: ${subject}`);

    // Log to communications table
    if (clientId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          userId,
          'email',
          'outbound',
          subject,
          text,
          JSON.stringify({
            to,
            provider: 'gmail',
            messageId: result.data.id,
            threadId: result.data.threadId,
            status: 'sent',
            sentAt: new Date().toISOString()
          })
        ]
      );
    }

    // HIPAA audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, client_id, action, resource_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        clientId,
        'EMAIL_SENT_GMAIL',
        'communication',
        JSON.stringify({
          to,
          subject,
          messageId: result.data.id,
          bodyLength: text.length
        })
      ]
    );

    return {
      success: true,
      provider: 'gmail',
      messageId: result.data.id,
      threadId: result.data.threadId,
      to,
      subject
    };

  } catch (error) {
    console.error('❌ Gmail send error:', error);

    // Log failed attempt
    if (clientId && userId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          userId,
          'email',
          'outbound',
          subject,
          text,
          JSON.stringify({
            to,
            provider: 'gmail',
            status: 'failed',
            error: error.message,
            sentAt: new Date().toISOString()
          })
        ]
      );
    }

    throw error;
  }
}

// ============================================================================
// OUTLOOK SENDING
// ============================================================================

/**
 * Send email via agent's connected Outlook account
 * @param {Object} options - Email options
 * @param {string} options.userId - User ID (agent)
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {string} options.clientId - Client ID (for logging)
 * @returns {Promise<Object>} - Send result
 */
async function sendViaOutlook({ userId, to, subject, text, html, clientId }) {
  try {
    // Get user's Outlook integration
    const integration = await db.query(
      `SELECT * FROM calendar_integrations
       WHERE user_id = $1 AND provider = 'microsoft'`,
      [userId]
    );

    if (integration.rows.length === 0) {
      throw new Error('Outlook not connected. User must connect their Outlook account first.');
    }

    const tokens = integration.rows[0];

    // Initialize Microsoft Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, tokens.access_token);
      }
    });

    // Create email message
    const message = {
      subject: subject,
      body: {
        contentType: html ? 'HTML' : 'Text',
        content: html || text
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    };

    // Send via Microsoft Graph API
    const result = await client.api('/me/sendMail').post({
      message: message,
      saveToSentItems: true
    });

    console.log(`✅ Email sent via Outlook to ${to}: ${subject}`);

    // Log to communications table
    if (clientId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          userId,
          'email',
          'outbound',
          subject,
          text,
          JSON.stringify({
            to,
            provider: 'outlook',
            status: 'sent',
            sentAt: new Date().toISOString()
          })
        ]
      );
    }

    // HIPAA audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, client_id, action, resource_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        clientId,
        'EMAIL_SENT_OUTLOOK',
        'communication',
        JSON.stringify({
          to,
          subject,
          bodyLength: text.length
        })
      ]
    );

    return {
      success: true,
      provider: 'outlook',
      to,
      subject
    };

  } catch (error) {
    console.error('❌ Outlook send error:', error);

    // Log failed attempt
    if (clientId && userId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          userId,
          'email',
          'outbound',
          subject,
          text,
          JSON.stringify({
            to,
            provider: 'outlook',
            status: 'failed',
            error: error.message,
            sentAt: new Date().toISOString()
          })
        ]
      );
    }

    throw error;
  }
}

// ============================================================================
// SMART EMAIL ROUTER
// ============================================================================

/**
 * Send email using agent's connected email (Gmail/Outlook) or fallback to SendGrid
 * @param {Object} options - Email options
 * @param {string} options.userId - User ID (agent)
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {string} options.clientId - Client ID (for logging)
 * @param {boolean} options.forceProvider - Force specific provider ('gmail', 'outlook', 'sendgrid')
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail({ userId, to, subject, text, html, clientId, forceProvider }) {
  try {
    // Check if user has connected email
    const integrations = await db.query(
      `SELECT provider FROM calendar_integrations
       WHERE user_id = $1 AND provider IN ('google', 'microsoft')
       ORDER BY created_at DESC`,
      [userId]
    );

    // If forceProvider is specified, use it
    if (forceProvider === 'sendgrid') {
      const { sendEmail: sendViaSendGrid } = require('./sendgrid');
      return await sendViaSendGrid({ to, subject, text, html, clientId, userId });
    }

    if (forceProvider === 'gmail') {
      return await sendViaGmail({ userId, to, subject, text, html, clientId });
    }

    if (forceProvider === 'outlook') {
      return await sendViaOutlook({ userId, to, subject, text, html, clientId });
    }

    // Auto-detect: Use agent's connected email if available
    if (integrations.rows.length > 0) {
      const provider = integrations.rows[0].provider;

      if (provider === 'google') {
        console.log('📧 Sending via agent\'s Gmail account...');
        return await sendViaGmail({ userId, to, subject, text, html, clientId });
      } else if (provider === 'microsoft') {
        console.log('📧 Sending via agent\'s Outlook account...');
        return await sendViaOutlook({ userId, to, subject, text, html, clientId });
      }
    }

    // Fallback to SendGrid if no connected email
    console.log('📧 No connected email. Falling back to SendGrid...');
    const { sendEmail: sendViaSendGrid } = require('./sendgrid');
    return await sendViaSendGrid({ to, subject, text, html, clientId, userId });

  } catch (error) {
    console.error('❌ Email send error:', error);

    // If agent email fails, try SendGrid as fallback
    if (error.message.includes('not connected') ||
        error.message.includes('invalid_grant') ||
        error.message.includes('invalid authentication') ||
        error.code === 401) {
      console.log('⚠️  Agent email failed. Trying SendGrid fallback...');
      const { sendEmail: sendViaSendGrid } = require('./sendgrid');
      return await sendViaSendGrid({ to, subject, text, html, clientId, userId });
    }

    throw error;
  }
}

/**
 * Check which email provider a user has connected
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Connected providers
 */
async function getConnectedEmailProviders(userId) {
  const integrations = await db.query(
    `SELECT provider, created_at FROM calendar_integrations
     WHERE user_id = $1 AND provider IN ('google', 'microsoft')
     ORDER BY created_at DESC`,
    [userId]
  );

  return {
    hasGmail: integrations.rows.some(r => r.provider === 'google'),
    hasOutlook: integrations.rows.some(r => r.provider === 'microsoft'),
    providers: integrations.rows.map(r => ({
      provider: r.provider,
      connectedAt: r.created_at
    }))
  };
}

module.exports = {
  sendViaGmail,
  sendViaOutlook,
  sendEmail,
  getConnectedEmailProviders
};
