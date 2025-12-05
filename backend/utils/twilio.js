// backend/utils/twilio.js - Twilio SMS utility (HIPAA-compliant)

const twilio = require('twilio');
const db = require('../db');

// Initialize Twilio client
let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }

    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

/**
 * Send SMS via Twilio
 * @param {Object} options - SMS options
 * @param {string} options.to - Recipient phone number (+15551234567)
 * @param {string} options.body - Message body
 * @param {string} options.clientId - Client ID (for audit logging)
 * @param {string} options.userId - User ID (for audit logging)
 * @returns {Promise<Object>} - Twilio response
 */
async function sendSMS({ to, body, clientId, userId }) {
  try {
    // Check if HIPAA-enabled (BAA must be signed)
    const hipaaEnabled = process.env.TWILIO_HIPAA_ENABLED === 'true';

    if (!hipaaEnabled) {
      console.warn('⚠️  WARNING: TWILIO_HIPAA_ENABLED is false. Do not send PHI until BAA is signed!');
    }

    // Validate phone number format
    if (!to.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +15551234567)');
    }

    // Get Twilio phone number
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured in .env');
    }

    // Send SMS
    const client = getTwilioClient();
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to
    });

    console.log(`✅ SMS sent to ${to}: ${message.sid}`);

    // Log to communications table
    if (clientId && userId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          clientId,
          userId,
          'sms',
          'outbound',
          body,
          JSON.stringify({
            twilioSid: message.sid,
            to,
            status: message.status,
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
          'SMS_SENT',
          'communication',
          JSON.stringify({
            to,
            twilioSid: message.sid,
            bodyLength: body.length
          })
        ]
      );
    }

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: message.to
    };

  } catch (error) {
    console.error('❌ Twilio SMS error:', error);

    // Log failed attempt
    if (clientId && userId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          clientId,
          userId,
          'sms',
          'outbound',
          body,
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
 * Send bulk SMS (for campaigns)
 * @param {Array} recipients - Array of {to, body, clientId}
 * @param {string} userId - User ID sending the messages
 * @returns {Promise<Object>} - Results summary
 */
async function sendBulkSMS(recipients, userId) {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const recipient of recipients) {
    try {
      await sendSMS({
        to: recipient.to,
        body: recipient.body,
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

    // Rate limiting: Wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Get SMS delivery status
 * @param {string} sid - Twilio message SID
 * @returns {Promise<Object>} - Message status
 */
async function getSMSStatus(sid) {
  try {
    const client = getTwilioClient();
    const message = await client.messages(sid).fetch();

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateSent: message.dateSent,
      price: message.price,
      priceUnit: message.priceUnit
    };
  } catch (error) {
    console.error('❌ Error fetching SMS status:', error);
    throw error;
  }
}

module.exports = {
  sendSMS,
  sendBulkSMS,
  getSMSStatus
};
