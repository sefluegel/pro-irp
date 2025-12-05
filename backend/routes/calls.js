// backend/routes/calls.js - Twilio Voice API for click-to-call
const express = require("express");
const router = express.Router();
const db = require("../db");
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// ============================================================================
// POST /calls/initiate - Start a click-to-call
// ============================================================================
/**
 * Initiates a call from agent to client
 * Flow:
 * 1. Twilio calls the agent's phone
 * 2. When agent answers, Twilio calls the client
 * 3. Both are connected in a call
 */
router.post("/initiate", async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId, clientPhone } = req.body;

    if (!clientPhone) {
      return res.status(400).json({ ok: false, error: "Client phone number is required" });
    }

    // Get agent's phone number from user profile
    const userResult = await db.query(
      'SELECT email, name, phone FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const agent = userResult.rows[0];
    const agentPhone = agent.phone || process.env.TEST_PHONE_NUMBER; // Fallback to test number

    if (!agentPhone) {
      return res.status(400).json({
        ok: false,
        error: "No phone number on file. Please add your phone number in Settings."
      });
    }

    // Get client info
    let clientName = "Client";
    if (clientId) {
      const clientResult = await db.query(
        'SELECT first_name, last_name FROM clients WHERE id = $1',
        [clientId]
      );
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
      }
    }

    console.log(`📞 Initiating call: Agent ${agentPhone} → Client ${clientPhone}`);

    // Create the call
    // Twilio will call the agent first, then when they answer, call the client
    const call = await client.calls.create({
      to: agentPhone,
      from: twilioNumber,
      url: `${process.env.APP_URL || 'http://localhost:8080'}/calls/connect?clientPhone=${encodeURIComponent(clientPhone)}&clientName=${encodeURIComponent(clientName)}`,
      statusCallback: `${process.env.APP_URL || 'http://localhost:8080'}/calls/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    // Log the call attempt in communications
    if (clientId) {
      await db.query(
        `INSERT INTO communications (client_id, user_id, type, direction, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          userId,
          'call',
          'outbound',
          'Outbound Call',
          `Click-to-call initiated to ${clientPhone}`,
          JSON.stringify({
            call_sid: call.sid,
            to: clientPhone,
            from: agentPhone,
            status: 'initiated'
          })
        ]
      );
    }

    // HIPAA audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, details)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          'CALL_INITIATED',
          'call',
          JSON.stringify({
            client_id: clientId,
            call_sid: call.sid,
            to: clientPhone
          })
        ]
      );
    } catch (auditError) {
      console.warn('⚠️  Audit log skipped:', auditError.message);
    }

    res.json({
      ok: true,
      callSid: call.sid,
      message: `Calling your phone (${agentPhone})... Answer to connect to ${clientName}`
    });

  } catch (error) {
    console.error('❌ Call initiation error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to initiate call"
    });
  }
});

// ============================================================================
// GET /calls/connect - TwiML to connect agent to client
// ============================================================================
/**
 * TwiML endpoint that executes when the agent answers
 * This dials the client and bridges the calls
 */
router.get("/connect", async (req, res) => {
  const { clientPhone, clientName } = req.query;

  const twiml = new twilio.twiml.VoiceResponse();

  // Say hello to the agent
  twiml.say({ voice: 'alice' }, `Connecting you to ${clientName || 'your client'}. Please wait.`);

  // Dial the client
  const dial = twiml.dial({
    callerId: twilioNumber,
    timeout: 30,
    record: 'record-from-answer', // Optional: record the call
    recordingStatusCallback: `${process.env.APP_URL || 'http://localhost:8080'}/calls/recording`
  });

  dial.number(clientPhone);

  // If client doesn't answer
  twiml.say({ voice: 'alice' }, 'The client did not answer. Goodbye.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// ============================================================================
// POST /calls/status - Call status webhook
// ============================================================================
/**
 * Receives call status updates from Twilio
 */
router.post("/status", async (req, res) => {
  const { CallSid, CallStatus, Duration, From, To } = req.body;

  console.log(`📞 Call ${CallSid} status: ${CallStatus}`);

  // Update communication record if exists
  try {
    await db.query(
      `UPDATE communications
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{status}',
         to_jsonb($1::text)
       ),
       metadata = jsonb_set(
         metadata,
         '{duration}',
         to_jsonb($2::text)
       ),
       completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE metadata->>'call_sid' = $3`,
      [CallStatus, Duration || '0', CallSid]
    );
  } catch (error) {
    console.error('Error updating call status:', error);
  }

  res.sendStatus(200);
});

// ============================================================================
// POST /calls/recording - Recording status webhook (optional)
// ============================================================================
/**
 * Receives recording status updates
 */
router.post("/recording", async (req, res) => {
  const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body;

  console.log(`🎙️  Recording available for call ${CallSid}: ${RecordingUrl}`);

  // Update communication with recording URL
  try {
    await db.query(
      `UPDATE communications
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{recording_url}',
         to_jsonb($1::text)
       ),
       metadata = jsonb_set(
         metadata,
         '{recording_sid}',
         to_jsonb($2::text)
       ),
       metadata = jsonb_set(
         metadata,
         '{recording_duration}',
         to_jsonb($3::text)
       )
       WHERE metadata->>'call_sid' = $4`,
      [RecordingUrl, RecordingSid, RecordingDuration, CallSid]
    );
  } catch (error) {
    console.error('Error updating recording:', error);
  }

  res.sendStatus(200);
});

module.exports = router;
