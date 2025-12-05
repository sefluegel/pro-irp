// backend/migrations/014-crm-integrations.js
// Database schema for CRM integrations (Go High Level, Salesforce, etc.)
// Supports both one-time imports and real-time sync via MCP

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function runMigration() {
  console.log('='.repeat(60));
  console.log('CRM INTEGRATIONS MIGRATION');
  console.log('='.repeat(60));
  console.log('');

  try {
    await db.query('BEGIN');

    // ========================================================================
    // 1. CRM INTEGRATIONS TABLE - Stores connection info for each user's CRM
    // ========================================================================
    console.log('1. Creating crm_integrations table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS crm_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- CRM type and connection info
        crm_type VARCHAR(50) NOT NULL, -- 'gohighlevel', 'salesforce', 'hubspot', etc.
        crm_name VARCHAR(100), -- User-friendly name like "My GHL Account"

        -- Authentication (encrypted in production)
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP WITH TIME ZONE,

        -- For Go High Level
        location_id VARCHAR(100), -- GHL sub-account/location ID

        -- For Salesforce
        instance_url VARCHAR(255), -- e.g., https://na1.salesforce.com
        org_id VARCHAR(50),

        -- Sync settings
        sync_enabled BOOLEAN DEFAULT false,
        sync_direction VARCHAR(20) DEFAULT 'import', -- 'import', 'export', 'bidirectional'
        sync_frequency VARCHAR(20) DEFAULT 'manual', -- 'manual', 'hourly', 'daily', 'realtime'
        last_sync_at TIMESTAMP WITH TIME ZONE,
        last_sync_status VARCHAR(20), -- 'success', 'partial', 'failed'
        last_sync_error TEXT,

        -- Field mapping (JSON object mapping CRM fields to PRO IRP fields)
        field_mapping JSONB DEFAULT '{}',

        -- What to sync
        sync_contacts BOOLEAN DEFAULT true,
        sync_opportunities BOOLEAN DEFAULT false,
        sync_notes BOOLEAN DEFAULT true,
        sync_tags BOOLEAN DEFAULT true,
        sync_custom_fields BOOLEAN DEFAULT false,

        -- Filters (only sync contacts matching these criteria)
        sync_filters JSONB DEFAULT '{}',

        -- Webhook info for real-time sync
        webhook_id VARCHAR(100),
        webhook_secret VARCHAR(255),

        -- Metadata
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        -- Ensure one integration per CRM type per user
        UNIQUE(user_id, crm_type, location_id)
      )
    `);
    console.log('   + Created crm_integrations table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_int_user ON crm_integrations(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_int_type ON crm_integrations(crm_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_crm_int_active ON crm_integrations(is_active) WHERE is_active = true`);
    console.log('   + Created indexes');

    // ========================================================================
    // 2. CRM SYNC HISTORY TABLE - Logs each sync operation
    // ========================================================================
    console.log('\n2. Creating crm_sync_history table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS crm_sync_history (
        id SERIAL PRIMARY KEY,
        integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Sync details
        sync_type VARCHAR(20) NOT NULL, -- 'manual', 'scheduled', 'webhook', 'initial'
        direction VARCHAR(20) NOT NULL, -- 'import', 'export'

        -- Results
        status VARCHAR(20) NOT NULL, -- 'started', 'in_progress', 'completed', 'failed', 'partial'

        -- Counts
        total_records INTEGER DEFAULT 0,
        records_created INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        records_skipped INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,

        -- Error tracking
        errors JSONB DEFAULT '[]',

        -- Timing
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER,

        -- For incremental sync
        sync_cursor TEXT, -- Last record ID or timestamp for pagination

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created crm_sync_history table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_sync_hist_integration ON crm_sync_history(integration_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_sync_hist_user ON crm_sync_history(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_sync_hist_date ON crm_sync_history(started_at DESC)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 3. CRM CONTACT MAPPING TABLE - Maps CRM contacts to PRO IRP clients
    // ========================================================================
    console.log('\n3. Creating crm_contact_mapping table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS crm_contact_mapping (
        id SERIAL PRIMARY KEY,
        integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

        -- External CRM reference
        crm_contact_id VARCHAR(255) NOT NULL,
        crm_contact_email VARCHAR(255),

        -- Internal PRO IRP reference
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

        -- Sync metadata
        first_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_sync_direction VARCHAR(20), -- 'import', 'export'

        -- Version tracking for conflict resolution
        crm_version VARCHAR(100), -- CRM's version/etag if available
        local_version INTEGER DEFAULT 1,

        -- For handling conflicts
        has_conflict BOOLEAN DEFAULT false,
        conflict_data JSONB,

        -- Raw data from last sync (for debugging/auditing)
        last_crm_data JSONB,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        -- Ensure one mapping per CRM contact per integration
        UNIQUE(integration_id, crm_contact_id)
      )
    `);
    console.log('   + Created crm_contact_mapping table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_contact_map_integration ON crm_contact_mapping(integration_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contact_map_client ON crm_contact_mapping(client_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contact_map_crm_id ON crm_contact_mapping(crm_contact_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contact_map_email ON crm_contact_mapping(crm_contact_email)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 4. ADD CRM SOURCE TRACKING TO CLIENTS TABLE
    // ========================================================================
    console.log('\n4. Adding CRM tracking columns to clients table...');

    const clientColumns = [
      { name: 'crm_source', type: 'VARCHAR(50)' },
      { name: 'crm_id', type: 'VARCHAR(255)' },
      { name: 'crm_last_synced_at', type: 'TIMESTAMP WITH TIME ZONE' }
    ];

    for (const col of clientColumns) {
      try {
        await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`   + Added clients.${col.name}`);
      } catch (e) {
        if (e.code === '42701') {
          console.log(`   - clients.${col.name} already exists`);
        } else {
          throw e;
        }
      }
    }

    // Update source_type for CRM imports
    await db.query(`
      UPDATE clients
      SET source_type = 'crm_import'
      WHERE crm_source IS NOT NULL AND source_type = 'manual'
    `);

    // ========================================================================
    // 5. CRM WEBHOOK EVENTS TABLE - For real-time sync
    // ========================================================================
    console.log('\n5. Creating crm_webhook_events table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS crm_webhook_events (
        id SERIAL PRIMARY KEY,
        integration_id UUID REFERENCES crm_integrations(id) ON DELETE SET NULL,

        -- Event info
        crm_type VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL, -- 'contact.created', 'contact.updated', etc.
        event_id VARCHAR(255), -- CRM's event ID for deduplication

        -- Payload
        payload JSONB NOT NULL,

        -- Processing status
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
        processed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,

        -- For idempotency
        received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   + Created crm_webhook_events table');

    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhook_status ON crm_webhook_events(status) WHERE status = 'pending'`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON crm_webhook_events(event_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_webhook_integration ON crm_webhook_events(integration_id)`);
    console.log('   + Created indexes');

    // ========================================================================
    // 6. DEFAULT FIELD MAPPINGS
    // ========================================================================
    console.log('\n6. Creating default field mapping functions...');

    // Store default mappings as a reference (will be used by the sync service)
    await db.query(`
      CREATE TABLE IF NOT EXISTS crm_field_mapping_templates (
        id SERIAL PRIMARY KEY,
        crm_type VARCHAR(50) NOT NULL UNIQUE,
        default_mapping JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default mappings for Go High Level
    await db.query(`
      INSERT INTO crm_field_mapping_templates (crm_type, default_mapping, description)
      VALUES ('gohighlevel', $1, 'Default field mapping for Go High Level contacts')
      ON CONFLICT (crm_type) DO UPDATE SET default_mapping = EXCLUDED.default_mapping
    `, [JSON.stringify({
      // GHL field -> PRO IRP field
      "firstName": "first_name",
      "lastName": "last_name",
      "email": "email",
      "phone": "phone",
      "address1": "address",
      "city": "city",
      "state": "state",
      "postalCode": "zip",
      "dateOfBirth": "dob",
      "tags": "tags",
      "customFields": {
        "carrier": "carrier",
        "plan_type": "plan_type",
        "plan": "plan",
        "effective_date": "effective_date"
      }
    })]);

    // Insert default mappings for Salesforce
    await db.query(`
      INSERT INTO crm_field_mapping_templates (crm_type, default_mapping, description)
      VALUES ('salesforce', $1, 'Default field mapping for Salesforce contacts')
      ON CONFLICT (crm_type) DO UPDATE SET default_mapping = EXCLUDED.default_mapping
    `, [JSON.stringify({
      // Salesforce field -> PRO IRP field
      "FirstName": "first_name",
      "LastName": "last_name",
      "Email": "email",
      "Phone": "phone",
      "MailingStreet": "address",
      "MailingCity": "city",
      "MailingState": "state",
      "MailingPostalCode": "zip",
      "Birthdate": "dob",
      "Description": "notes"
    })]);

    console.log('   + Created field mapping templates');

    await db.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nNew tables created:');
    console.log('  - crm_integrations (stores CRM connections)');
    console.log('  - crm_sync_history (logs sync operations)');
    console.log('  - crm_contact_mapping (maps CRM contacts to clients)');
    console.log('  - crm_webhook_events (real-time sync events)');
    console.log('  - crm_field_mapping_templates (default field mappings)');
    console.log('\nNew columns added to clients:');
    console.log('  - crm_source, crm_id, crm_last_synced_at');

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
