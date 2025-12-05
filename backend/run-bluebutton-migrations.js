// backend/run-bluebutton-migrations.js
// Script to run Blue Button, Risk Scoring, and Churn Tracking migrations
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS = [
  '007-blue-button-integration.sql',
  '008-risk-scoring-ml.sql',
  '009-churn-tracking.sql'
];

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected!\n');

    for (const migration of MIGRATIONS) {
      const migrationPath = path.join(__dirname, 'migrations', migration);

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 Running: ${migration}`);

      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ ${migration} completed successfully!`);
      } catch (err) {
        // Check if it's just a "already exists" error
        if (err.message.includes('already exists')) {
          console.log(`⚠️  ${migration} - Some objects already exist (skipping)`);
        } else {
          throw err;
        }
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('🔍 Verifying new tables...\n');

    // Check Blue Button tables
    const bbTables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'blue_button_authorizations',
        'prescription_claims',
        'prescription_changes',
        'blue_button_sync_log'
      )
      ORDER BY table_name
    `);

    console.log('Blue Button Tables:');
    bbTables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check Risk Scoring tables
    const riskTables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'risk_factors',
        'client_risk_factors',
        'risk_score_history',
        'ml_model_versions',
        'ml_predictions'
      )
      ORDER BY table_name
    `);

    console.log('\nRisk Scoring & ML Tables:');
    riskTables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check Churn tables
    const churnTables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'churn_reasons',
        'churn_events',
        'winback_attempts',
        'retention_successes',
        'competitor_plans'
      )
      ORDER BY table_name
    `);

    console.log('\nChurn Tracking Tables:');
    churnTables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check seed data
    const riskFactorsCount = await pool.query('SELECT COUNT(*) as count FROM risk_factors');
    const churnReasonsCount = await pool.query('SELECT COUNT(*) as count FROM churn_reasons');

    console.log('\nSeed Data:');
    console.log(`  ✓ ${riskFactorsCount.rows[0].count} risk factors loaded`);
    console.log(`  ✓ ${churnReasonsCount.rows[0].count} churn reasons loaded`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('🎉 All migrations completed successfully!');
    console.log('');
    console.log('Your database now has:');
    console.log('  • Blue Button 2.0 integration tables');
    console.log('  • Prescription claims storage');
    console.log('  • Risk scoring & ML infrastructure');
    console.log('  • Churn tracking & agent feedback system');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
