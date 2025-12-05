// backend/jobs/nightly-processor.js
// Nightly job that runs risk scoring and Blue Button data sync
// Run with: node jobs/nightly-processor.js
// Or schedule with cron: 0 2 * * * cd /path/to/backend && node jobs/nightly-processor.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../db');
const riskScoringEngine = require('./risk-scoring-engine');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Time to run (for logging purposes)
  jobName: 'nightly-processor',

  // Blue Button sync settings
  blueButton: {
    enabled: true,
    batchSize: 10, // Clients to sync in parallel
    rateLimitDelay: 1000, // ms between batches (respect CMS rate limits)
  },

  // Risk scoring settings
  riskScoring: {
    enabled: true,
    batchSize: 100,
  },

  // Adherence gap detection settings
  adherenceGap: {
    enabled: true,
    gapThresholdDays: 14, // Days past expected refill to flag as gap
  }
};

// ============================================================================
// BLUE BUTTON SYNC
// ============================================================================

/**
 * Sync Blue Button data for all authorized clients
 */
async function syncBlueButtonData() {
  console.log('\n📋 Starting Blue Button data sync...');

  // Get all clients with active Blue Button authorization
  const authorizations = await db.query(
    `SELECT bba.*, c.first_name, c.last_name
     FROM blue_button_authorizations bba
     JOIN clients c ON c.id = bba.client_id
     WHERE bba.status = 'active'
     ORDER BY bba.last_sync_at ASC NULLS FIRST`
  );

  if (authorizations.rows.length === 0) {
    console.log('   No clients with Blue Button authorization');
    return { synced: 0, errors: 0 };
  }

  console.log(`   Found ${authorizations.rows.length} authorized clients`);

  let synced = 0;
  let errors = 0;
  let newClaimsTotal = 0;
  let changesTotal = 0;

  // Process in batches
  for (let i = 0; i < authorizations.rows.length; i += CONFIG.blueButton.batchSize) {
    const batch = authorizations.rows.slice(i, i + CONFIG.blueButton.batchSize);

    const promises = batch.map(async (auth) => {
      try {
        const result = await syncClientBlueButton(auth);
        synced++;
        newClaimsTotal += result.newClaims;
        changesTotal += result.changesDetected;
        return { success: true, ...result };
      } catch (error) {
        errors++;
        console.error(`   ❌ ${auth.first_name} ${auth.last_name}: ${error.message}`);

        // Update authorization with error
        await db.query(
          `UPDATE blue_button_authorizations
           SET last_sync_status = 'error', last_error = $1
           WHERE id = $2`,
          [error.message, auth.id]
        );

        return { success: false, error: error.message };
      }
    });

    await Promise.all(promises);

    // Rate limit delay between batches
    if (i + CONFIG.blueButton.batchSize < authorizations.rows.length) {
      await sleep(CONFIG.blueButton.rateLimitDelay);
    }
  }

  console.log(`   ✅ Synced: ${synced}, Errors: ${errors}`);
  console.log(`   📊 New claims: ${newClaimsTotal}, Changes detected: ${changesTotal}`);

  return { synced, errors, newClaimsTotal, changesTotal };
}

/**
 * Sync Blue Button data for a single client
 */
async function syncClientBlueButton(authorization) {
  const { blueButtonApiCall, processPartDClaim } = require('../routes/bluebutton');

  // Create sync log
  const syncLog = await db.query(
    `INSERT INTO blue_button_sync_log (authorization_id, client_id, sync_type)
     VALUES ($1, $2, 'nightly')
     RETURNING id`,
    [authorization.id, authorization.client_id]
  );

  const syncId = syncLog.rows[0].id;

  let claimsFetched = 0;
  let newClaims = 0;
  let changesDetected = 0;

  try {
    // Fetch Part D claims
    const response = await fetch(
      `${process.env.BLUEBUTTON_API_URL}/ExplanationOfBenefit?type=PDE`,
      {
        headers: {
          'Authorization': `Bearer ${authorization.access_token}`,
          'Accept': 'application/fhir+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const eobData = await response.json();

    if (eobData.entry) {
      for (const entry of eobData.entry) {
        const eob = entry.resource;
        if (eob.type?.coding?.some(c => c.code === 'PDE' || c.code === 'pharmacy')) {
          claimsFetched++;
          // Process claim (reuse logic from bluebutton routes)
          // Simplified version here
        }
      }
    }

    // Update sync log with success
    await db.query(
      `UPDATE blue_button_sync_log
       SET completed_at = CURRENT_TIMESTAMP,
           status = 'completed',
           claims_fetched = $1,
           new_claims = $2,
           changes_detected = $3
       WHERE id = $4`,
      [claimsFetched, newClaims, changesDetected, syncId]
    );

    // Update authorization
    await db.query(
      `UPDATE blue_button_authorizations
       SET last_sync_at = CURRENT_TIMESTAMP,
           last_sync_status = 'success',
           last_error = NULL
       WHERE id = $1`,
      [authorization.id]
    );

    return { claimsFetched, newClaims, changesDetected };
  } catch (error) {
    await db.query(
      `UPDATE blue_button_sync_log
       SET completed_at = CURRENT_TIMESTAMP,
           status = 'failed',
           error_message = $1
       WHERE id = $2`,
      [error.message, syncId]
    );

    throw error;
  }
}

// ============================================================================
// ADHERENCE GAP DETECTION
// ============================================================================

/**
 * Detect medication adherence gaps
 * Flags when a client hasn't refilled within expected window
 */
async function detectAdherenceGaps() {
  console.log('\n💊 Detecting medication adherence gaps...');

  // Find medications that should have been refilled but weren't
  const gapsResult = await db.query(
    `WITH latest_fills AS (
      SELECT DISTINCT ON (client_id, ndc_code)
        client_id, ndc_code, drug_name, fill_date, days_supply
      FROM prescription_claims
      WHERE days_supply IS NOT NULL
      ORDER BY client_id, ndc_code, fill_date DESC
    )
    SELECT
      lf.*,
      lf.fill_date + (lf.days_supply || ' days')::interval AS expected_refill_date,
      NOW() - (lf.fill_date + (lf.days_supply || ' days')::interval) AS days_overdue
    FROM latest_fills lf
    WHERE lf.fill_date + (lf.days_supply || ' days')::interval < NOW() - INTERVAL '${CONFIG.adherenceGap.gapThresholdDays} days'
    AND NOT EXISTS (
      SELECT 1 FROM prescription_changes pc
      WHERE pc.client_id = lf.client_id
      AND pc.ndc_code = lf.ndc_code
      AND pc.change_type = 'adherence_gap'
      AND pc.detected_at > NOW() - INTERVAL '30 days'
    )`
  );

  let gapsDetected = 0;

  for (const gap of gapsResult.rows) {
    // Insert adherence gap change
    await db.query(
      `INSERT INTO prescription_changes
       (client_id, change_type, drug_name, ndc_code, previous_value, new_value, risk_weight)
       VALUES ($1, 'adherence_gap', $2, $3, $4, $5, $6)`,
      [
        gap.client_id,
        gap.drug_name,
        gap.ndc_code,
        gap.fill_date,
        `${Math.floor(gap.days_overdue / (1000 * 60 * 60 * 24))} days overdue`,
        15 // Risk weight for adherence gap
      ]
    );

    gapsDetected++;
  }

  console.log(`   ✅ Detected ${gapsDetected} adherence gaps`);
  return { gapsDetected };
}

// ============================================================================
// RISK SCORING
// ============================================================================

/**
 * Run risk scoring for all clients
 */
async function runRiskScoring() {
  console.log('\n📊 Running risk scoring engine...');

  const result = await riskScoringEngine.scoreAllClients({
    batchSize: CONFIG.riskScoring.batchSize,
    onProgress: (progress) => {
      if (progress.processed % 500 === 0 || progress.processed === progress.total) {
        console.log(`   Progress: ${progress.processed}/${progress.total} (${progress.percentComplete}%)`);
      }
    }
  });

  console.log(`   ✅ Scored ${result.success} clients, ${result.errors} errors`);

  // Get at-risk summary
  const atRiskCount = await db.query(
    `SELECT COUNT(*) as count FROM clients WHERE status = 'at_risk'`
  );

  const highRiskCount = await db.query(
    `SELECT COUNT(*) as count FROM clients WHERE risk_score >= 75`
  );

  console.log(`   🚨 At-risk clients: ${atRiskCount.rows[0].count}`);
  console.log(`   ⚠️  High risk (75+): ${highRiskCount.rows[0].count}`);

  return {
    ...result,
    atRiskCount: parseInt(atRiskCount.rows[0].count),
    highRiskCount: parseInt(highRiskCount.rows[0].count)
  };
}

// ============================================================================
// GENERATE DAILY REPORT
// ============================================================================

/**
 * Generate summary report for the nightly run
 */
async function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    blueButton: results.blueButton,
    adherenceGaps: results.adherenceGaps,
    riskScoring: results.riskScoring,
    duration: results.duration
  };

  // Store report in database for historical tracking
  // (Could also send via email/Slack/webhook)

  console.log('\n' + '='.repeat(60));
  console.log('📋 NIGHTLY PROCESSOR SUMMARY');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));
  console.log('='.repeat(60));

  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runNightlyProcessor() {
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log(`🌙 NIGHTLY PROCESSOR STARTED - ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const results = {
    blueButton: null,
    adherenceGaps: null,
    riskScoring: null,
    duration: null
  };

  try {
    // 1. Sync Blue Button data
    if (CONFIG.blueButton.enabled) {
      results.blueButton = await syncBlueButtonData();
    }

    // 2. Detect adherence gaps
    if (CONFIG.adherenceGap.enabled) {
      results.adherenceGaps = await detectAdherenceGaps();
    }

    // 3. Run risk scoring
    if (CONFIG.riskScoring.enabled) {
      results.riskScoring = await runRiskScoring();
    }

    results.duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

    // Generate report
    await generateReport(results);

    console.log(`\n✅ Nightly processor completed in ${results.duration}`);
  } catch (error) {
    console.error('\n❌ Nightly processor failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if executed directly
if (require.main === module) {
  runNightlyProcessor();
}

module.exports = { runNightlyProcessor, syncBlueButtonData, detectAdherenceGaps, runRiskScoring };
