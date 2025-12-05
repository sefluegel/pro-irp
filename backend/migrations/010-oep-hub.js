// backend/migrations/010-oep-hub.js
// OEP Retention Hub tables: templates, automations, cohort tracking, activity, analytics

const db = require('../db');

async function up() {
  console.log('[migration] Creating OEP Hub tables...');

  // ==========================================================================
  // OEP TEMPLATES - Editable email/SMS templates for OEP retention outreach
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS oep_templates (
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

    CREATE INDEX IF NOT EXISTS idx_oep_templates_user ON oep_templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_oep_templates_type ON oep_templates(type);
  `);

  // ==========================================================================
  // OEP AUTOMATIONS - User's automation settings for OEP retention
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS oep_automations (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      jan_1 BOOLEAN DEFAULT true,
      feb_1 BOOLEAN DEFAULT true,
      mar_1 BOOLEAN DEFAULT true,
      newsletter BOOLEAN DEFAULT true,
      require_approval BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==========================================================================
  // OEP COHORT - Track clients in OEP retention cohort
  // This links to existing clients but adds OEP-specific tracking fields
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS oep_cohort (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      season_year INTEGER NOT NULL, -- e.g., 2026 for Jan-Mar 2026 OEP
      first_with_agent BOOLEAN DEFAULT true,
      status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Switched', 'Cancelled')),
      newsletter BOOLEAN DEFAULT false,
      -- Outreach plan checkboxes
      plan_jan_1 BOOLEAN DEFAULT true,
      plan_feb_1 BOOLEAN DEFAULT true,
      plan_mar_1 BOOLEAN DEFAULT true,
      -- Tracking
      jan_1_sent BOOLEAN DEFAULT false,
      jan_1_sent_at TIMESTAMP,
      feb_1_sent BOOLEAN DEFAULT false,
      feb_1_sent_at TIMESTAMP,
      mar_1_sent BOOLEAN DEFAULT false,
      mar_1_sent_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, season_year)
    );

    CREATE INDEX IF NOT EXISTS idx_oep_cohort_user ON oep_cohort(user_id);
    CREATE INDEX IF NOT EXISTS idx_oep_cohort_season ON oep_cohort(season_year);
    CREATE INDEX IF NOT EXISTS idx_oep_cohort_status ON oep_cohort(status);
  `);

  // ==========================================================================
  // OEP CONTACT HISTORY - Outreach history for OEP cohort members
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS oep_contact_history (
      id SERIAL PRIMARY KEY,
      cohort_id INTEGER REFERENCES oep_cohort(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'other')),
      subject VARCHAR(500),
      message TEXT,
      status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
      template_id INTEGER REFERENCES oep_templates(id) ON DELETE SET NULL,
      automation_type VARCHAR(20), -- 'jan1', 'feb1', 'mar1', 'newsletter', 'manual'
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_oep_history_cohort ON oep_contact_history(cohort_id);
    CREATE INDEX IF NOT EXISTS idx_oep_history_created ON oep_contact_history(created_at DESC);
  `);

  // ==========================================================================
  // OEP ACTIVITY LOG - All OEP-related activity feed
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS oep_activity (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL, -- 'email_sent', 'sms_sent', 'template_created', etc.
      automation_name VARCHAR(255),
      recipient_type VARCHAR(20), -- 'client'
      recipient_id INTEGER,
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(20),
      subject VARCHAR(500),
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_oep_activity_user ON oep_activity(user_id);
    CREATE INDEX IF NOT EXISTS idx_oep_activity_created ON oep_activity(created_at DESC);
  `);

  // ==========================================================================
  // OEP ANALYTICS - Aggregated stats (can be regenerated)
  // ==========================================================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS oep_analytics (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      season_year INTEGER NOT NULL,
      date DATE NOT NULL,
      emails_sent INTEGER DEFAULT 0,
      sms_sent INTEGER DEFAULT 0,
      opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      cohort_size INTEGER DEFAULT 0,
      churn_count INTEGER DEFAULT 0,
      retention_pct DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, season_year, date)
    );

    CREATE INDEX IF NOT EXISTS idx_oep_analytics_user_date ON oep_analytics(user_id, season_year, date);
  `);

  // ==========================================================================
  // INSERT DEFAULT SYSTEM TEMPLATES
  // ==========================================================================
  await db.query(`
    INSERT INTO oep_templates (user_id, title, title_key, type, subject, content, tags, is_featured, is_system)
    VALUES
      (NULL, 'Jan 1 Welcome', 'jan1Welcome', 'email',
       'Your new coverage is active — congrats!',
       'Hi {ClientName},

Today your new coverage is in effect. Have you received your plan ID cards? If you have any questions, I''m here to help.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Jan 1', 'Welcome'], true, true),

      (NULL, 'Feb 1 Check-in', 'benefitReminder', 'email',
       'One month in — how is your plan going?',
       'Hi {ClientName},

You''re in the first full month of your plan. Any issues with pharmacies, doctors, or billing I can help solve?

Best,
{AgentName}',
       ARRAY['Feb 1', 'Check-in'], false, true),

      (NULL, 'Mar 1 Follow-up + Referral', 'satisfactionCheck', 'sms',
       NULL,
       'Hi {ClientName}, we''re two months in—any issues I can fix? If you''re happy, referrals are appreciated. —{AgentName}',
       ARRAY['Mar 1', 'Referral', 'SMS'], false, true),

      (NULL, 'ID Cards Reminder', 'idCardsReminder', 'email',
       'Have your ID cards arrived?',
       'Hi {ClientName},

Just checking in — have your new Medicare ID cards arrived? If not, I can help expedite them with your carrier.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Jan', 'ID Cards'], false, true),

      (NULL, 'Pharmacy Check', 'pharmacyCheck', 'email',
       'Quick pharmacy check-in',
       'Hi {ClientName},

Have you had a chance to pick up any prescriptions with your new plan? Let me know if there were any surprises with copays or formulary changes.

Best,
{AgentName}',
       ARRAY['Feb', 'Pharmacy'], false, true),

      (NULL, 'Referral Ask', 'referralAsk', 'sms',
       NULL,
       'Hi {ClientName}, if you''re happy with your coverage, I''d appreciate any referrals to friends or family who might need help during Medicare enrollment. —{AgentName}',
       ARRAY['Mar', 'Referral', 'SMS'], false, true),

      (NULL, 'Save Attempt', 'saveAttempt', 'email',
       'Before you switch — can I help?',
       'Hi {ClientName},

I noticed a change on your plan. Before anything finalizes, can I fix any issues—copays, pharmacies, doctors—so you''re fully set?

I want to make sure you have the best coverage for your needs.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Retention', 'Save'], true, true),

      (NULL, 'Monthly Newsletter', 'monthlyNewsletter', 'email',
       '{PolicyYear} Medicare Updates',
       'Hi {ClientName},

Here''s your monthly Medicare update:

• Important dates to remember
• Tips for getting the most from your plan
• New benefits you might not know about

Questions? Reply to this email or call me anytime.

Best,
{AgentName}
{AgentPhone}',
       ARRAY['Newsletter', 'Monthly'], false, true)

    ON CONFLICT DO NOTHING;
  `);

  console.log('[migration] OEP Hub tables created successfully');
}

async function down() {
  console.log('[migration] Dropping OEP Hub tables...');

  await db.query(`
    DROP TABLE IF EXISTS oep_analytics CASCADE;
    DROP TABLE IF EXISTS oep_activity CASCADE;
    DROP TABLE IF EXISTS oep_contact_history CASCADE;
    DROP TABLE IF EXISTS oep_cohort CASCADE;
    DROP TABLE IF EXISTS oep_automations CASCADE;
    DROP TABLE IF EXISTS oep_templates CASCADE;
  `);

  console.log('[migration] OEP Hub tables dropped');
}

module.exports = { up, down };
