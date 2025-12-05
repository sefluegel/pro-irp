// backend/run-migration.js
// Script to run database migrations
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
    const migrationPath = path.join(__dirname, 'migrations', '002-auth-upgrade-fixed.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!');
      console.error('Looking for:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running auth upgrade migration...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying new tables...');

    const promoCheck = await pool.query("SELECT code, description, max_uses FROM promo_codes WHERE code = 'PILOT2025'");
    if (promoCheck.rows.length > 0) {
      const promo = promoCheck.rows[0];
      console.log('  ✓ promo_codes table created');
      console.log(`    → PILOT2025: ${promo.description}`);
      console.log(`    → Max uses: ${promo.max_uses}`);
    }

    const tablesCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('subscriptions', 'subscription_plans', 'agent_invitations')
      ORDER BY table_name
    `);

    tablesCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name} table created`);
    });

    console.log('');
    console.log('🎉 Auth system upgrade complete!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Next step: Run this command to make your account admin:');
    console.log('');
    console.log('  node setup-admin.js your-email@example.com');
    console.log('');
    console.log('Replace your-email@example.com with YOUR actual email!');
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
