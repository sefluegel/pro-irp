// Migration: Add calendar_id column to calendar_integrations table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    console.log('🔄 Adding calendar_id column to calendar_integrations table...\n');

    await pool.query(`
      ALTER TABLE calendar_integrations
      ADD COLUMN IF NOT EXISTS calendar_id VARCHAR(255) DEFAULT 'primary';
    `);

    console.log('✅ Successfully added calendar_id column');
    console.log('   Default value: "primary" (user\'s primary calendar)\n');
    console.log('✨ Migration complete!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
