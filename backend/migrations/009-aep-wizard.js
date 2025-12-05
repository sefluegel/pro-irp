// backend/migrations/009-aep-wizard.js
// AEP Wizard tables: templates, campaigns, countdown contacts, activity, analytics

const db = require('../db');

async function up() {
  console.log('[migration] Creating AEP Wizard tables...');

  // ==========================================================================
  // AEP TEMPLATES - Editable email/SMS templates for AEP outreach
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS aep_templates (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      title_key VARCHAR(100), -- For i18n lookup (optional)
      type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms')),
      subject VARCHAR(500), -- For emails
      content TEXT NOT NULL,
      tags TEXT[] DEFAULT '{}',
      is_featured BOOLEAN DEFAULT false,
      is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_aep_templates_user ON aep_templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_aep_templates_type ON aep_templates(type);
  `);

  // ==========================================================================
  // AEP AUTOMATIONS - User's automation settings
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS aep_automations (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      pre_aep_60 BOOLEAN DEFAULT true,
      pre_aep_30 BOOLEAN DEFAULT true,
      pre_aep_14 BOOLEAN DEFAULT true,
      pre_aep_7 BOOLEAN DEFAULT true,
      pre_aep_3 BOOLEAN DEFAULT true,
      pre_aep_1 BOOLEAN DEFAULT true,
      anoc_explainer BOOLEAN DEFAULT true,
      booking_nudges BOOLEAN DEFAULT true,
      voicemail_drop_ui BOOLEAN DEFAULT false,
      require_approval BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==========================================================================
  // AEP COUNTDOWN CONTACTS - Pre-AEP prospect tracking
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS aep_countdown_contacts (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      email VARCHAR(255),
      zip VARCHAR(10),
      county VARCHAR(100),
      dob DATE,
      language VARCHAR(20) DEFAULT 'English',
      source VARCHAR(50) DEFAULT 'Other',
      notes TEXT,
      permission_to_contact BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Warm', 'Scheduled', 'Enrolled', 'Not Interested')),
      newsletter BOOLEAN DEFAULT false,
      -- Outreach plan checkboxes
      plan_two_months BOOLEAN DEFAULT true,
      plan_one_month BOOLEAN DEFAULT true,
      plan_two_weeks BOOLEAN DEFAULT true,
      plan_one_week BOOLEAN DEFAULT true,
      plan_aep_live BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_aep_countdown_user ON aep_countdown_contacts(user_id);
    CREATE INDEX IF NOT EXISTS idx_aep_countdown_status ON aep_countdown_contacts(status);
  `);

  // ==========================================================================
  // AEP CONTACT HISTORY - Outreach history for countdown contacts
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS aep_contact_history (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES aep_countdown_contacts(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'other')),
      subject VARCHAR(500),
      message TEXT,
      status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
      template_id INTEGER REFERENCES aep_templates(id) ON DELETE SET NULL,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_aep_history_contact ON aep_contact_history(contact_id);
  `);

  // ==========================================================================
  // AEP ACTIVITY LOG - All AEP-related activity feed
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS aep_activity (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL, -- 'email_sent', 'sms_sent', 'template_created', etc.
      automation_name VARCHAR(255),
      recipient_type VARCHAR(20), -- 'client' or 'countdown_contact'
      recipient_id INTEGER,
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(20),
      subject VARCHAR(500),
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_aep_activity_user ON aep_activity(user_id);
    CREATE INDEX IF NOT EXISTS idx_aep_activity_created ON aep_activity(created_at DESC);
  `);

  // ==========================================================================
  // AEP ANALYTICS - Aggregated stats (can be regenerated)
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS aep_analytics (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      emails_sent INTEGER DEFAULT 0,
      sms_sent INTEGER DEFAULT 0,
      opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      appointments_booked INTEGER DEFAULT 0,
      enrollments INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_aep_analytics_user_date ON aep_analytics(user_id, date);
  `);

  // ==========================================================================
  // INSERT DEFAULT SYSTEM TEMPLATES
  // ==========================================================================
  await db.query(`
    INSERT INTO aep_templates (user_id, title, title_key, type, subject, content, tags, is_featured, is_system)
    VALUES
      (NULL, 'Pre-AEP Check-in', 'preAepCheckin', 'email',
       'AEP is coming — let''s prepare!',
       'Hi {ClientName},

The Medicare Annual Enrollment Period starts on October 15. If you''d like a review or have questions, let''s get a time on the calendar.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Pre-AEP', 'Email'], true, true),

      (NULL, 'ANOC Explainer', 'anocExplainer', 'email',
       'Your ANOC — what it means',
       'Hi {ClientName},

You''ll receive the Annual Notice of Change (ANOC) from your plan. It explains any updates for {PolicyYear}. If anything looks unclear, reply here and I''ll help review it.

Best,
{AgentName}',
       ARRAY['ANOC', 'Education'], false, true),

      (NULL, 'Booking Nudge', 'bookingNudges', 'sms',
       NULL,
       'Hi {ClientName}, AEP starts Oct 15. Want to book your plan review now? Reply YES and I''ll send times. —{AgentName}',
       ARRAY['Booking', 'SMS'], false, true),

      (NULL, 'AEP Reminder', 'aepReminder', 'email',
       'AEP starts tomorrow — ready to review?',
       'Hi {ClientName},

AEP begins tomorrow. If you want to look over options, let''s lock in a time.

Best,
{AgentName}',
       ARRAY['Reminder'], false, true),

      (NULL, '60-Day Pre-AEP', 'preAep60Days', 'email',
       'Medicare AEP is 60 days away',
       'Hi {ClientName},

Just a heads up — the Medicare Annual Enrollment Period is about 60 days away. This is a great time to start thinking about your coverage needs for {PolicyYear}.

I''ll be reaching out again as we get closer, but if you want to get ahead of things, just reply and we can set up a call.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Pre-AEP', '60-Day'], false, true),

      (NULL, '30-Day Pre-AEP', 'preAep30Days', 'email',
       'AEP is one month away — let''s plan',
       'Hi {ClientName},

AEP is just one month away (October 15). Now''s a good time to review your current plan and see if there are better options for {PolicyYear}.

Would you like to schedule a quick review call? I can walk you through what''s changing and help you make the best decision.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Pre-AEP', '30-Day'], false, true),

      (NULL, 'AEP Week SMS', 'aepWeekSms', 'sms',
       NULL,
       '{ClientName}, AEP starts in 7 days! Let me know if you want to schedule your plan review. —{AgentName}',
       ARRAY['Pre-AEP', 'SMS', '7-Day'], false, true),

      (NULL, 'AEP Live Notification', 'aepLiveEmail', 'email',
       'AEP is NOW OPEN — Schedule Your Review',
       'Hi {ClientName},

The Medicare Annual Enrollment Period is officially open! From now until December 7, you can make changes to your Medicare coverage.

Don''t wait until the last minute — let''s schedule your review this week so you have plenty of time to make the right decision.

Click here to book: {BookingLink}

Best,
{AgentName}
{AgentPhone}',
       ARRAY['AEP', 'Urgency'], true, true)

    ON CONFLICT DO NOTHING;
  `);

  console.log('[migration] AEP Wizard tables created successfully');
}

async function down() {
  console.log('[migration] Dropping AEP Wizard tables...');

  await db.query(`
    DROP TABLE IF EXISTS aep_analytics CASCADE;
    DROP TABLE IF EXISTS aep_activity CASCADE;
    DROP TABLE IF EXISTS aep_contact_history CASCADE;
    DROP TABLE IF EXISTS aep_countdown_contacts CASCADE;
    DROP TABLE IF EXISTS aep_automations CASCADE;
    DROP TABLE IF EXISTS aep_templates CASCADE;
  `);

  console.log('[migration] AEP Wizard tables dropped');
}

module.exports = { up, down };
