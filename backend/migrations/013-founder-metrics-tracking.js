// backend/migrations/013-founder-metrics-tracking.js
// Adds comprehensive tracking for founder pilot metrics
// Includes: agent onboarding, feature usage, client source tracking, PDF parse history

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function runMigration() {
  console.log('='.repeat(60));
  console.log('FOUNDER METRICS TRACKING MIGRATION');
  console.log('='.repeat(60));
  console.log('');

  try {
    await db.query('BEGIN');

    // ========================================================================
    // 1. ADD ONBOARDING TRACKING FIELDS TO USERS TABLE
    // ========================================================================
    console.log('1. Adding onboarding tracking fields to users table...');

    const userColumns = [
      { name: 'onboarding_completed_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'sms_connected_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'email_connected_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'calendar_connected_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'first_client_added_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'first_import_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'first_pdf_parsed_at', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'first_bluebutton_connected_at', type: 'TIMESTAMP WITH TIME ZONE' }
    ];

    for (const col of userColumns) {
      try {
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`   + Added users.${col.name}`);
      } catch (e) {
        if (e.code === '42701') {
          console.log(`   - users.${col.name} already exists`);
        } else {
          throw e;
        }
      }
    }

    // ========================================================================
    // 2. ADD SOURCE TRACKING TO CLIENTS TABLE
    // ========================================================================
    console.log('\n2. Adding source tracking to clients table...');

    try {
      await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'manual'`);
      console.log('   + Added clients.source_type');
    } catch (e) {
      if (e.code === '42701') console.log('   - clients.source_type already exists');
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0`);
      console.log('   + Added clients.profile_completeness');
    } catch (e) {
      if (e.code === '42701') console.log('   - clients.profile_completeness already exists');
      else throw e;
    }

    // Update existing clients with bulk_import_id to have source_type = 'csv_import'
    const updateResult = await db.query(`
      UPDATE clients
      SET source_type = 'csv_import'
      WHERE bulk_import_id IS NOT NULL AND source_type = 'manual'
    `);
    console.log(`   * Updated ${updateResult.rowCount} existing imported clients`);

    // ========================================================================
    // 3. CREATE PDF PARSE HISTORY TABLE
    // ========================================================================
    console.log('\n3. Creating pdf_parse_history table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS pdf_parse_history (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        filename VARCHAR(255),
        file_size INTEGER,
        success BOOLEAN NOT NULL,
        fields_extracted JSONB,
        client_created_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        error_message TEXT,
        parse_duration_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created pdf_parse_history table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_pdf_parse_user ON pdf_parse_history(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pdf_parse_date ON pdf_parse_history(created_at)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 4. CREATE FEATURE USAGE TABLE
    // ========================================================================
    console.log('\n4. Creating feature_usage table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS feature_usage (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        feature VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        metadata JSONB,
        session_id VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created feature_usage table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_date ON feature_usage(created_at)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_user_date ON feature_usage(user_id, created_at)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 5. CREATE RISK ALERT ACTIONS TABLE
    // ========================================================================
    console.log('\n5. Creating risk_alert_actions table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS risk_alert_actions (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        risk_score_at_alert INTEGER,
        generated_at TIMESTAMP WITH TIME ZONE,
        viewed_at TIMESTAMP WITH TIME ZONE,
        acted_on_at TIMESTAMP WITH TIME ZONE,
        action_type VARCHAR(30),
        action_details JSONB,
        outcome VARCHAR(30),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created risk_alert_actions table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_risk_alert_client ON risk_alert_actions(client_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_risk_alert_user ON risk_alert_actions(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_risk_alert_date ON risk_alert_actions(generated_at)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 6. CREATE SYSTEM HEALTH METRICS TABLE
    // ========================================================================
    console.log('\n6. Creating system_health_metrics table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS system_health_metrics (
        id SERIAL PRIMARY KEY,
        metric_type VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value NUMERIC,
        metadata JSONB,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created system_health_metrics table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_health_type ON system_health_metrics(metric_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_health_date ON system_health_metrics(recorded_at)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 7. CREATE DAILY METRICS SNAPSHOT TABLE (for trends)
    // ========================================================================
    console.log('\n7. Creating daily_metrics_snapshot table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_metrics_snapshot (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE NOT NULL UNIQUE,

        -- Agent metrics
        total_agents INTEGER DEFAULT 0,
        active_agents_day INTEGER DEFAULT 0,
        active_agents_week INTEGER DEFAULT 0,

        -- Onboarding funnel
        agents_onboarded INTEGER DEFAULT 0,
        agents_sms_connected INTEGER DEFAULT 0,
        agents_email_connected INTEGER DEFAULT 0,
        agents_calendar_connected INTEGER DEFAULT 0,
        agents_imported_clients INTEGER DEFAULT 0,
        agents_used_pdf_parser INTEGER DEFAULT 0,
        agents_bluebutton_connected INTEGER DEFAULT 0,

        -- Client metrics
        total_clients INTEGER DEFAULT 0,
        clients_added_today INTEGER DEFAULT 0,
        clients_via_import INTEGER DEFAULT 0,
        clients_via_manual INTEGER DEFAULT 0,
        clients_via_pdf INTEGER DEFAULT 0,
        clients_with_bluebutton INTEGER DEFAULT 0,
        clients_profile_complete INTEGER DEFAULT 0,
        clients_with_medications INTEGER DEFAULT 0,
        clients_with_plan_info INTEGER DEFAULT 0,
        clients_with_comms INTEGER DEFAULT 0,

        -- Risk metrics
        clients_at_risk INTEGER DEFAULT 0,
        risk_alerts_generated INTEGER DEFAULT 0,
        risk_alerts_acted_on INTEGER DEFAULT 0,
        avg_time_to_action_hours NUMERIC,

        -- Value metrics
        automations_sent INTEGER DEFAULT 0,
        automations_delivered INTEGER DEFAULT 0,
        clients_saved INTEGER DEFAULT 0,
        clients_churned INTEGER DEFAULT 0,
        estimated_revenue_saved NUMERIC DEFAULT 0,

        -- System metrics
        api_requests INTEGER DEFAULT 0,
        api_errors INTEGER DEFAULT 0,
        avg_response_time_ms INTEGER,
        sms_sent INTEGER DEFAULT 0,
        sms_delivered INTEGER DEFAULT 0,
        emails_sent INTEGER DEFAULT 0,
        emails_delivered INTEGER DEFAULT 0,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created daily_metrics_snapshot table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_snapshot_date ON daily_metrics_snapshot(snapshot_date)`);
    console.log('   + Created index');

    // ========================================================================
    // 8. ADD SAVED/CHURNED STATUS TO CLIENTS
    // ========================================================================
    console.log('\n8. Adding retention tracking to clients...');

    try {
      await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS retention_status VARCHAR(20) DEFAULT 'active'`);
      console.log('   + Added clients.retention_status');
    } catch (e) {
      if (e.code === '42701') console.log('   - clients.retention_status already exists');
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS retention_status_changed_at TIMESTAMP WITH TIME ZONE`);
      console.log('   + Added clients.retention_status_changed_at');
    } catch (e) {
      if (e.code === '42701') console.log('   - clients.retention_status_changed_at already exists');
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS saved_by UUID REFERENCES users(id)`);
      console.log('   + Added clients.saved_by');
    } catch (e) {
      if (e.code === '42701') console.log('   - clients.saved_by already exists');
      else throw e;
    }

    // ========================================================================
    // 9. CREATE FUNCTION TO CALCULATE PROFILE COMPLETENESS
    // ========================================================================
    console.log('\n9. Creating profile completeness function...');

    await db.query(`
      CREATE OR REPLACE FUNCTION calculate_profile_completeness(client_row clients)
      RETURNS INTEGER AS $$
      DECLARE
        score INTEGER := 0;
        max_score INTEGER := 10;
      BEGIN
        -- Core fields (1 point each)
        IF client_row.first_name IS NOT NULL AND client_row.first_name != '' THEN score := score + 1; END IF;
        IF client_row.last_name IS NOT NULL AND client_row.last_name != '' THEN score := score + 1; END IF;
        IF client_row.email IS NOT NULL AND client_row.email != '' THEN score := score + 1; END IF;
        IF client_row.phone IS NOT NULL AND client_row.phone != '' THEN score := score + 1; END IF;
        IF client_row.dob IS NOT NULL THEN score := score + 1; END IF;
        IF client_row.address IS NOT NULL AND client_row.address != '' THEN score := score + 1; END IF;

        -- Insurance fields (1 point each)
        IF client_row.plan_type IS NOT NULL AND client_row.plan_type != '' THEN score := score + 1; END IF;
        IF client_row.carrier IS NOT NULL AND client_row.carrier != '' THEN score := score + 1; END IF;
        IF client_row.effective_date IS NOT NULL THEN score := score + 1; END IF;
        IF client_row.plan IS NOT NULL AND client_row.plan != '' THEN score := score + 1; END IF;

        RETURN (score * 100) / max_score;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
    console.log('   + Created calculate_profile_completeness function');

    // Update existing clients' profile completeness
    await db.query(`
      UPDATE clients
      SET profile_completeness = calculate_profile_completeness(clients.*)
      WHERE profile_completeness = 0 OR profile_completeness IS NULL
    `);
    console.log('   * Updated profile completeness for existing clients');

    // ========================================================================
    // 10. BACKFILL EXISTING DATA WHERE POSSIBLE
    // ========================================================================
    console.log('\n10. Backfilling existing tracking data...');

    // Set first_import_at for users who have done imports
    await db.query(`
      UPDATE users u
      SET first_import_at = (
        SELECT MIN(created_at) FROM bulk_imports WHERE user_id = u.id
      )
      WHERE first_import_at IS NULL
      AND EXISTS (SELECT 1 FROM bulk_imports WHERE user_id = u.id)
    `);
    console.log('   * Backfilled first_import_at from bulk_imports');

    // Set calendar_connected_at for users with calendar integrations
    await db.query(`
      UPDATE users u
      SET calendar_connected_at = (
        SELECT MIN(created_at) FROM calendar_integrations WHERE user_id = u.id::uuid
      )
      WHERE calendar_connected_at IS NULL
      AND EXISTS (SELECT 1 FROM calendar_integrations WHERE user_id = u.id::uuid)
    `).catch(() => {
      console.log('   - Could not backfill calendar_connected_at (type mismatch or table missing)');
    });

    // Set first_bluebutton_connected_at for users who have connected clients
    await db.query(`
      UPDATE users u
      SET first_bluebutton_connected_at = (
        SELECT MIN(bba.created_at)
        FROM blue_button_authorizations bba
        JOIN clients c ON c.id = bba.client_id
        WHERE c.owner_id = u.id
      )
      WHERE first_bluebutton_connected_at IS NULL
      AND EXISTS (
        SELECT 1 FROM blue_button_authorizations bba
        JOIN clients c ON c.id = bba.client_id
        WHERE c.owner_id = u.id
      )
    `).catch(() => {
      console.log('   - Could not backfill first_bluebutton_connected_at (table missing)');
    });

    // Set first_client_added_at
    await db.query(`
      UPDATE users u
      SET first_client_added_at = (
        SELECT MIN(created_at) FROM clients WHERE owner_id = u.id
      )
      WHERE first_client_added_at IS NULL
      AND EXISTS (SELECT 1 FROM clients WHERE owner_id = u.id)
    `);
    console.log('   * Backfilled first_client_added_at from clients');

    await db.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nNew tables created:');
    console.log('  - pdf_parse_history');
    console.log('  - feature_usage');
    console.log('  - risk_alert_actions');
    console.log('  - system_health_metrics');
    console.log('  - daily_metrics_snapshot');
    console.log('\nNew columns added to users:');
    console.log('  - onboarding_completed_at, sms_connected_at, email_connected_at');
    console.log('  - calendar_connected_at, first_client_added_at, first_import_at');
    console.log('  - first_pdf_parsed_at, first_bluebutton_connected_at');
    console.log('\nNew columns added to clients:');
    console.log('  - source_type, profile_completeness, retention_status');
    console.log('  - retention_status_changed_at, saved_by');

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('\nMIGRATION FAILED:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
