// Check if calendar_integrations table exists
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTable() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'calendar_integrations'
      );
    `);

    console.log('calendar_integrations table exists:', result.rows[0].exists);

    if (result.rows[0].exists) {
      const schema = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'calendar_integrations'
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Table Schema:');
      schema.rows.forEach(row => {
        console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}`);
      });
    } else {
      console.log('\n⚠️  Table does not exist - needs to be created');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTable();
