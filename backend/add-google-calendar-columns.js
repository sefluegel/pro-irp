// Migration: Add Google Calendar token columns to users table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    console.log('🔄 Adding Google Calendar columns to users table...\n');

    // Add columns for Google Calendar OAuth tokens
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_access_token TEXT,
      ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP;
    `);

    console.log('✅ Successfully added Google Calendar columns:');
    console.log('   - google_access_token (TEXT)');
    console.log('   - google_refresh_token (TEXT)');
    console.log('   - google_token_expiry (TIMESTAMP)');
    console.log('\n✨ Migration complete!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
