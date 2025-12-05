// backend/run-user-phone-migration.js
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
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!');

    const migrationPath = path.join(__dirname, 'migrations', '006-add-user-phone.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!');
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running user phone migration...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify
    const verify = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'phone'
    `);

    if (verify.rows.length > 0) {
      console.log('  ✓ phone column added to users table');
      console.log(`    → Type: ${verify.rows[0].data_type}`);
    }

    console.log('\n🎉 Click-to-call ready!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Next steps:');
    console.log('  1. Add your phone number in Settings (coming soon)');
    console.log('  2. Click "Call" on any client profile');
    console.log('  3. Answer your phone when it rings');
    console.log('  4. You\'ll be connected to the client!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
