// backend/jobs/scheduler.js
// Job scheduler using node-cron
// Run with: node jobs/scheduler.js
// This keeps running and executes jobs on schedule

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const cron = require('node-cron');
const { runNightlyProcessor } = require('./nightly-processor');
const churnPredictionEngine = require('./churn-prediction-engine');
const mlTrainingService = require('../services/ml-training');
const automationWorkflows = require('../services/automation-workflows');
const cmsApiService = require('../services/cms-api');

// ============================================================================
// SCHEDULE CONFIGURATION
// ============================================================================

const SCHEDULES = {
  // Nightly churn prediction scoring
  // Runs at 2:00 AM EST every day
  nightly: {
    name: 'Nightly Churn Prediction Scoring',
    schedule: '0 2 * * *', // 2:00 AM every day
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Starting nightly churn prediction scoring...');
      const results = await churnPredictionEngine.scoreAllClients({
        batchSize: 100,
        onProgress: (p) => {
          if (parseInt(p.percentComplete) % 10 === 0) {
            console.log(`[scheduler] Progress: ${p.percentComplete}% (${p.processed}/${p.total})`);
          }
        }
      });
      console.log('[scheduler] Nightly scoring complete:', results);
      return results;
    }
  },

  // Legacy nightly processor (Blue Button sync)
  nightlyBlueButton: {
    name: 'Nightly Blue Button Sync',
    schedule: '30 2 * * *', // 2:30 AM every day (after scoring)
    timezone: 'America/New_York',
    enabled: true,
    handler: runNightlyProcessor
  },

  // Daily automation (checkpoints, reviews, briefings)
  // Runs at 5:00 AM EST every day (before agents start)
  dailyAutomation: {
    name: 'Daily Automation Workflows',
    schedule: '0 5 * * *', // 5:00 AM every day
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Running daily automation...');
      await automationWorkflows.initialize();
      const results = await automationWorkflows.runDailyAutomation();
      console.log('[scheduler] Daily automation complete:', results);
      return results;
    }
  },

  // Morning briefing generation
  // Runs at 6:00 AM EST every day
  morningBriefings: {
    name: 'Morning Briefings',
    schedule: '0 6 * * *', // 6:00 AM every day
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Generating morning briefings...');
      const count = await automationWorkflows.generateAllMorningBriefings();
      console.log(`[scheduler] Generated ${count} briefings`);
      return { briefingsGenerated: count };
    }
  },

  // Weekly ML analysis and recommendations
  // Runs every Sunday at 4:00 AM
  weeklyMLAnalysis: {
    name: 'Weekly ML Analysis',
    schedule: '0 4 * * 0', // 4:00 AM every Sunday
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Running weekly ML analysis...');
      await mlTrainingService.initialize();
      await mlTrainingService.updatePredictionOutcomes();
      const metrics = await mlTrainingService.calculatePerformanceMetrics({ period: '7_days' });
      console.log('[scheduler] Weekly ML analysis complete:', metrics);
      return metrics;
    }
  },

  // Quarterly ML recalibration
  // Runs on the 1st of Jan, Apr, Jul, Oct at 3:00 AM
  quarterlyRecalibration: {
    name: 'Quarterly ML Recalibration',
    schedule: '0 3 1 1,4,7,10 *', // 3:00 AM on 1st of quarter months
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Running quarterly ML recalibration...');
      await mlTrainingService.initialize();
      const results = await mlTrainingService.runQuarterlyAnalysis();
      console.log('[scheduler] Quarterly recalibration complete:', results);
      return results;
    }
  },

  // Annual ML recalibration (post-AEP)
  // Runs January 15th at 3:00 AM
  annualRecalibration: {
    name: 'Annual ML Recalibration',
    schedule: '0 3 15 1 *', // 3:00 AM on January 15th
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Running annual ML recalibration...');
      await mlTrainingService.initialize();
      const results = await mlTrainingService.runAnnualRecalibration();
      console.log('[scheduler] Annual recalibration complete:', results);
      return results;
    }
  },

  // ANOC auto-scan (October 1st)
  anocAutoScan: {
    name: 'ANOC Auto-Scan',
    schedule: '0 6 1 10 *', // 6:00 AM on October 1st
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Running ANOC auto-scan...');
      await cmsApiService.initialize();
      const results = await cmsApiService.runAnocAutoScan();
      console.log('[scheduler] ANOC auto-scan complete:', results);
      return results;
    }
  },

  // Annual CMS data refresh (September)
  annualCmsRefresh: {
    name: 'Annual CMS Data Refresh',
    schedule: '0 3 15 9 *', // 3:00 AM on September 15th
    timezone: 'America/New_York',
    enabled: true,
    handler: async () => {
      console.log('[scheduler] Running annual CMS data refresh...');
      await cmsApiService.initialize();
      const nextYear = new Date().getFullYear() + 1;
      const results = await cmsApiService.triggerAnnualDataRefresh(nextYear);
      console.log('[scheduler] CMS data refresh complete:', results);
      return results;
    }
  }
};

// ============================================================================
// SCHEDULER
// ============================================================================

class JobScheduler {
  constructor() {
    this.jobs = new Map();
  }

  start() {
    console.log('='.repeat(60));
    console.log('🕐 JOB SCHEDULER STARTED');
    console.log('='.repeat(60));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');

    for (const [key, config] of Object.entries(SCHEDULES)) {
      if (config.enabled) {
        this.scheduleJob(key, config);
      } else {
        console.log(`⏸️  ${config.name}: DISABLED`);
      }
    }

    console.log('');
    console.log('Scheduler is running. Press Ctrl+C to stop.');
    console.log('='.repeat(60));
  }

  scheduleJob(key, config) {
    const job = cron.schedule(config.schedule, async () => {
      console.log(`\n[${new Date().toISOString()}] Running: ${config.name}`);

      try {
        await config.handler();
        console.log(`[${new Date().toISOString()}] Completed: ${config.name}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed: ${config.name}`, error.message);
      }
    }, {
      timezone: config.timezone,
      scheduled: true
    });

    this.jobs.set(key, job);

    // Calculate next run time
    const nextRun = this.getNextRunTime(config.schedule, config.timezone);
    console.log(`✅ ${config.name}: Scheduled (${config.schedule})`);
    console.log(`   Next run: ${nextRun}`);
  }

  getNextRunTime(cronExpression, timezone) {
    // Simple approximation - in production use a proper cron parser
    const parts = cronExpression.split(' ');
    const [minute, hour] = parts;

    const now = new Date();
    const next = new Date();

    if (hour !== '*') next.setHours(parseInt(hour));
    if (minute !== '*') next.setMinutes(parseInt(minute));
    next.setSeconds(0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString('en-US', { timeZone: timezone });
  }

  stop() {
    for (const [key, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${key}`);
    }
  }

  // Run a specific job immediately (for testing)
  async runNow(jobKey) {
    const config = SCHEDULES[jobKey];
    if (!config) {
      console.error(`Unknown job: ${jobKey}`);
      return;
    }

    console.log(`\n[MANUAL RUN] ${config.name}`);
    await config.handler();
  }
}

// ============================================================================
// MAIN
// ============================================================================

const scheduler = new JobScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down scheduler...');
  scheduler.stop();
  process.exit(0);
});

// Check for command line arguments
const args = process.argv.slice(2);

if (args[0] === '--run-now') {
  // Run a specific job immediately
  const jobKey = args[1] || 'nightly';
  scheduler.runNow(jobKey).then(() => {
    console.log('Manual run completed');
    process.exit(0);
  }).catch(error => {
    console.error('Manual run failed:', error);
    process.exit(1);
  });
} else {
  // Start the scheduler
  scheduler.start();
}

module.exports = scheduler;
