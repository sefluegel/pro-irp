// backend/run-language-migration.js
// Script to add preferred_language column to clients table
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
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
    const migrationPath = path.join(__dirname, 'migrations', '005-add-preferred-language.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!');
      console.error('Looking for:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running preferred_language migration...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying preferred_language column...');

    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'clients'
      AND column_name = 'preferred_language'
    `);

    if (columnCheck.rows.length > 0) {
      const col = columnCheck.rows[0];
      console.log('  ✓ preferred_language column created');
      console.log(`    → Type: ${col.data_type}`);
      console.log(`    → Default: ${col.column_default}`);
    } else {
      throw new Error('Column not found after migration!');
    }

    // Check how many clients exist
    const clientCount = await pool.query('SELECT COUNT(*) as count FROM clients');
    console.log(`  ✓ Updated ${clientCount.rows[0].count} existing client records`);

    console.log('');
    console.log('🎉 Language preference system is now ready!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('What this adds:');
    console.log('  • preferred_language column to clients table');
    console.log('  • Automatic translation of SMS/Email to Spanish');
    console.log('  • Supported languages: en (English), es (Spanish)');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set client language in the UI or via API');
    console.log('  2. Send communications - they\'ll auto-translate!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
