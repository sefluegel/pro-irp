// Quick script to check users table schema
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Users Table Schema:');
    console.log('─'.repeat(60));
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(30)} ${row.data_type}`);
    });
    console.log('─'.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
