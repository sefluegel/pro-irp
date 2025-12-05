// Simple script to add phone column to users table
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function addPhoneColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const sql = fs.readFileSync(path.join(__dirname, 'add-phone-column.sql'), 'utf8');

    console.log('Adding phone column...');
    await client.query(sql);

    console.log('✅ Phone column added successfully!');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'phone'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: phone column exists');
      console.log(`   Type: ${result.rows[0].data_type}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

addPhoneColumn();
