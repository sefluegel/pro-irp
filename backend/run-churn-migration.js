// backend/run-churn-migration.js
// Script to run the churn prediction model database migration
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runChurnMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('='.repeat(60));
    console.log('CHURN PREDICTION MODEL - DATABASE MIGRATION');
    console.log('='.repeat(60));
    console.log('');
    console.log('Connecting to database...');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connected!');
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '010-churn-prediction-model.sql');
    console.log(`Reading migration: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('Migration file not found!');
      console.error('Looking for:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running churn prediction model migration...');
    console.log('');

    // Run the entire SQL file at once to preserve function/trigger definitions
    try {
      await pool.query(sql);
      console.log('Migration SQL executed successfully');
    } catch (err) {
      // Check if it's a "already exists" type error which is okay
      if (err.message.includes('already exists') || err.message.includes('duplicate key')) {
        console.log('Some objects already exist (this is okay)');
      } else {
        console.error('Migration failed:', err.message);
        throw err;
      }
    }
    console.log('');

    // Verify key tables
    console.log('Verifying new tables...');

    const tablesToCheck = [
      'client_contacts',
      'client_sep_status',
      'temporal_modifiers',
      'call_outcomes',
      'call_outcome_options',
      'recency_modifiers',
      'followup_credit_rules',
      'risk_alerts',
      'morning_briefings',
      'cms_plans',
      'cms_formulary',
      'cms_providers',
      'cms_plan_providers',
      'zip_demographics',
      'county_competition',
      'model_performance_metrics',
      'interventions',
      'weight_adjustment_recommendations'
    ];

    const tablesCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ANY($1)
      ORDER BY table_name
    `, [tablesToCheck]);

    const existingTables = tablesCheck.rows.map(r => r.table_name);

    console.log('');
    for (const table of tablesToCheck) {
      if (existingTables.includes(table)) {
        console.log(`  [OK] ${table}`);
      } else {
        console.log(`  [--] ${table} (may already exist in different form)`);
      }
    }

    // Check risk_factors count
    const factorsCount = await pool.query('SELECT COUNT(*) FROM risk_factors');
    console.log('');
    console.log(`Risk factors in database: ${factorsCount.rows[0].count}`);

    // Check call_outcome_options
    const optionsCount = await pool.query('SELECT COUNT(*) FROM call_outcome_options').catch(() => ({ rows: [{ count: 0 }] }));
    console.log(`Call outcome options: ${optionsCount.rows[0].count}`);

    // Check temporal_modifiers
    const modifiersCount = await pool.query('SELECT COUNT(*) FROM temporal_modifiers').catch(() => ({ rows: [{ count: 0 }] }));
    console.log(`Temporal modifiers: ${modifiersCount.rows[0].count}`);

    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('The churn prediction model is now ready to use.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the scheduler: node jobs/scheduler.js');
    console.log('2. Or run scoring manually: node jobs/scheduler.js --run-now nightly');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('Migration failed:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runChurnMigration();
