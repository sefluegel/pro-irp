// backend/migrations/add-assistant-name.js
// Adds assistant_name column to users table for personalized AI assistant

require('dotenv').config();
const db = require('../db');

async function migrate() {
  console.log('Running migration: add-assistant-name');

  try {
    // Add assistant_name column to users table
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS assistant_name VARCHAR(50) DEFAULT 'Alex'
    `);
    console.log('Added assistant_name column to users table');

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
