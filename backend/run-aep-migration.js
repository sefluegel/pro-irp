// Run the AEP Wizard migration
require('dotenv').config();

const migration = require('./migrations/009-aep-wizard');

async function run() {
  try {
    console.log('Running AEP Wizard migration...');
    await migration.up();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
