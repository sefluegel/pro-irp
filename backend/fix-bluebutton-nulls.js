// Quick fix: Allow NULL values in blue_button_authorizations tokens
require('dotenv').config();
const db = require('./db');

async function fix() {
  try {
    console.log('Fixing blue_button_authorizations constraints...');

    // Allow NULL for access_token and refresh_token (needed for disconnect)
    await db.query(`
      ALTER TABLE blue_button_authorizations
      ALTER COLUMN access_token DROP NOT NULL
    `);
    console.log('- access_token can now be NULL');

    await db.query(`
      ALTER TABLE blue_button_authorizations
      ALTER COLUMN refresh_token DROP NOT NULL
    `);
    console.log('- refresh_token can now be NULL');

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fix();
