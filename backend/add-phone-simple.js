// Simple script to add phone column to users table
require('dotenv').config();
const { Pool } = require('pg');

async function addPhoneColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Adding phone column to users table...');

    // Try to add the column - if it exists, it will just skip
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    `);

    console.log('✅ Phone column added (or already exists)');

    // Verify
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'phone'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: phone column exists');
    } else {
      console.log('❌ Phone column not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addPhoneColumn();
