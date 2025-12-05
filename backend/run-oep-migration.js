// Run the OEP Hub migration
require('dotenv').config();

const migration = require('./migrations/010-oep-hub');

async function run() {
  try {
    console.log('Running OEP Hub migration...');
    await migration.up();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
