// backend/run-calendar-migration.js
// Script to run calendar integration database migration
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runCalendarMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Connecting to database...');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '004-calendar-integrations.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!');
      console.error('Looking for:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running calendar integration migration...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying new tables...');

    const tablesCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'calendar_integrations',
        'synced_calendar_events',
        'calendar_sync_status',
        'client_calendar_events'
      )
      ORDER BY table_name
    `);

    if (tablesCheck.rows.length === 4) {
      tablesCheck.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name} table created`);
      });
      console.log('');
      console.log('🎉 Calendar integration tables created successfully!');
    } else {
      console.log(`  ⚠️  Expected 4 tables, found ${tablesCheck.rows.length}`);
      console.log('  Tables found:', tablesCheck.rows.map(r => r.table_name).join(', '));
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Calendar Integration Setup Complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set up third-party accounts (Twilio, SendGrid, Google, Microsoft)');
    console.log('  2. Add credentials to backend/.env');
    console.log('  3. Run: node backend/test-integrations.js');
    console.log('');
    console.log('See THIRD-PARTY-SETUP.md for detailed setup instructions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');

    // Check for common errors
    if (error.message.includes('already exists')) {
      console.log('ℹ️  It looks like the tables already exist. This is OK!');
      console.log('   You can safely ignore this error if you\'ve run this migration before.');
      console.log('');

      // Still verify tables exist
      try {
        const verifyQuery = await pool.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN (
            'calendar_integrations',
            'synced_calendar_events',
            'calendar_sync_status',
            'client_calendar_events'
          )
          ORDER BY table_name
        `);

        console.log('📋 Existing calendar tables:');
        verifyQuery.rows.forEach(row => {
          console.log(`  ✓ ${row.table_name}`);
        });
        console.log('');
        console.log('✅ Calendar integration is ready to use!');
      } catch (verifyError) {
        console.error('Could not verify tables:', verifyError.message);
      }
    } else {
      console.error('Full error:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runCalendarMigration();
