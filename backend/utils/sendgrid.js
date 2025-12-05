// backend/utils/sendgrid.js - SendGrid email utility (HIPAA-compliant)

const sgMail = require('@sendgrid/mail');
const db = require('../db');

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send email via SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {string} options.clientId - Client ID (for audit logging)
 * @param {string} options.userId - User ID (for audit logging)
 * @returns {Promise<Object>} - SendGrid response
 */
async function sendEmail({ to, subject, text, html, clientId, userId }) {
  try {
    // Check if API key is configured
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured. Set SENDGRID_API_KEY in .env');
    }

    // Check if HIPAA-enabled (BAA must be signed)
    const hipaaEnabled = process.env.SENDGRID_HIPAA_ENABLED === 'true';

    if (!hipaaEnabled) {
      console.warn('⚠️  WARNING: SENDGRID_HIPAA_ENABLED is false. Do not send PHI until BAA is signed!');
    }

    // Get from email/name
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Pro IRP';

    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL not configured in .env');
    }

    // Prepare email
    const msg = {
      to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'), // Simple HTML fallback
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    // Send email
    const response = await sgMail.send(msg);

    console.log(`✅ Email sent to ${to}: ${subject}`);

    // Log to communications table
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
            messageId: response[0].headers['x-message-id'],
            status: 'sent',
            sentAt: new Date().toISOString()
          })
        ]
      );
    }

    // HIPAA audit log
    if (clientId) {
      await db.query(
        `INSERT INTO audit_logs (user_id, client_id, action, resource_type, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          clientId,
          'EMAIL_SENT',
          'communication',
          JSON.stringify({
            to,
            subject,
            messageId: response[0].headers['x-message-id'],
            bodyLength: text.length
          })
        ]
      );
    }

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      to,
      subject
    };

  } catch (error) {
    console.error('❌ SendGrid email error:', error);

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

/**
 * Send email from template
 * @param {Object} options - Template options
 * @param {string} options.to - Recipient email
 * @param {string} options.templateId - SendGrid template ID
 * @param {Object} options.dynamicData - Template merge data
 * @param {string} options.clientId - Client ID
 * @param {string} options.userId - User ID
 * @returns {Promise<Object>} - SendGrid response
 */
async function sendTemplateEmail({ to, templateId, dynamicData, clientId, userId }) {
  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Pro IRP';

    const msg = {
      to,
      from: {
        email: fromEmail,
        name: fromName
      },
      templateId,
      dynamicTemplateData: dynamicData
    };

    const response = await sgMail.send(msg);

    console.log(`✅ Template email sent to ${to}: Template ${templateId}`);

    // Log to communications table
    if (clientId && userId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          userId,
          'email',
          'outbound',
          `Template: ${templateId}`,
          JSON.stringify(dynamicData),
          JSON.stringify({
            to,
            templateId,
            messageId: response[0].headers['x-message-id'],
            status: 'sent',
            sentAt: new Date().toISOString()
          })
        ]
      );
    }

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      to,
      templateId
    };

  } catch (error) {
    console.error('❌ SendGrid template email error:', error);
    throw error;
  }
}

/**
 * Send bulk emails (for campaigns)
 * @param {Array} recipients - Array of {to, subject, text, html, clientId}
 * @param {string} userId - User ID sending the emails
 * @returns {Promise<Object>} - Results summary
 */
async function sendBulkEmails(recipients, userId) {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.to,
        subject: recipient.subject,
        text: recipient.text,
        html: recipient.html,
        clientId: recipient.clientId,
        userId
      });
      results.sent++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        to: recipient.to,
        error: error.message
      });
    }

    // Rate limiting: Wait 100ms between emails
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendBulkEmails
};
