// backend/middleware/feature-tracking.js
// Tracks feature usage for founder analytics

const db = require('../db');

// Map routes to feature names
const ROUTE_TO_FEATURE = {
  '/dashboard': 'dashboard',
  '/clients': 'clients',
  '/clients/bulk': 'import',
  '/clients/export': 'export',
  '/tasks': 'tasks',
  '/comms': 'communications',
  '/calendar': 'calendar',
  '/bluebutton': 'bluebutton',
  '/risk': 'risk',
  '/churn': 'churn',
  '/churn-prediction': 'churn_prediction',
  '/automations': 'automations',
  '/aep': 'aep_wizard',
  '/oep': 'oep_hub',
  '/enrollments': 'pdf_parser',
  '/settings': 'settings',
  '/metrics': 'metrics',
  '/founder-analytics': 'founder_analytics'
};

// Map HTTP methods to actions
const METHOD_TO_ACTION = {
  'GET': 'view',
  'POST': 'create',
  'PUT': 'update',
  'PATCH': 'update',
  'DELETE': 'delete'
};

/**
 * Middleware to track feature usage
 * Logs user interactions with different modules
 */
function featureTrackingMiddleware(req, res, next) {
  // Only track authenticated requests
  if (!req.user?.id) {
    return next();
  }

  // Skip health checks and static files
  if (req.path === '/health' || req.path === '/version' || req.path.startsWith('/public')) {
    return next();
  }

  // Determine feature from path
  const pathParts = req.path.split('/').filter(Boolean);
  const basePath = '/' + (pathParts[0] || '');
  const feature = ROUTE_TO_FEATURE[basePath];

  if (!feature) {
    return next();
  }

  // Determine action
  let action = METHOD_TO_ACTION[req.method] || 'unknown';

  // Special actions based on specific routes
  if (req.path.includes('/bulk')) action = 'import';
  if (req.path.includes('/export')) action = 'export';
  if (req.path.includes('/connect')) action = 'connect';
  if (req.path.includes('/sync')) action = 'sync';
  if (req.path.includes('/send')) action = 'send';
  if (req.path.includes('/parse')) action = 'parse';

  // Log asynchronously (don't block the request)
  setImmediate(async () => {
    try {
      await db.query(`
        INSERT INTO feature_usage (user_id, feature, action, metadata, session_id, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        req.user.id,
        feature,
        action,
        JSON.stringify({
          path: req.path,
          method: req.method,
          query: Object.keys(req.query).length > 0 ? req.query : undefined
        }),
        req.sessionID || req.headers['x-session-id'] || null
      ]);
    } catch (error) {
      // Don't fail the request if tracking fails
      console.warn('[feature-tracking] Failed to log:', error.message);
    }
  });

  next();
}

/**
 * Track specific events (called directly from routes)
 */
async function trackEvent(userId, feature, action, metadata = {}) {
  if (!userId) return;

  try {
    await db.query(`
      INSERT INTO feature_usage (user_id, feature, action, metadata, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [userId, feature, action, JSON.stringify(metadata)]);
  } catch (error) {
    console.warn('[feature-tracking] Failed to track event:', error.message);
  }
}

/**
 * Update user onboarding milestones
 */
async function updateOnboardingMilestone(userId, milestone) {
  if (!userId || !milestone) return;

  const columnMap = {
    'onboarding_completed': 'onboarding_completed_at',
    'sms_connected': 'sms_connected_at',
    'email_connected': 'email_connected_at',
    'calendar_connected': 'calendar_connected_at',
    'first_client_added': 'first_client_added_at',
    'first_import': 'first_import_at',
    'first_pdf_parsed': 'first_pdf_parsed_at',
    'first_bluebutton_connected': 'first_bluebutton_connected_at'
  };

  const column = columnMap[milestone];
  if (!column) return;

  try {
    // Only update if not already set
    await db.query(`
      UPDATE users
      SET ${column} = CURRENT_TIMESTAMP
      WHERE id = $1 AND ${column} IS NULL
    `, [userId]);
  } catch (error) {
    console.warn('[feature-tracking] Failed to update milestone:', error.message);
  }
}

/**
 * Log PDF parse attempt
 */
async function logPdfParse(userId, { filename, fileSize, success, fieldsExtracted, clientCreatedId, errorMessage, durationMs }) {
  try {
    await db.query(`
      INSERT INTO pdf_parse_history
      (user_id, filename, file_size, success, fields_extracted, client_created_id, error_message, parse_duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      filename,
      fileSize,
      success,
      fieldsExtracted ? JSON.stringify(fieldsExtracted) : null,
      clientCreatedId,
      errorMessage,
      durationMs
    ]);

    // Update milestone if first successful parse
    if (success) {
      await updateOnboardingMilestone(userId, 'first_pdf_parsed');
    }
  } catch (error) {
    console.warn('[feature-tracking] Failed to log PDF parse:', error.message);
  }
}

/**
 * Log risk alert action
 */
async function logRiskAlertAction(userId, { alertId, clientId, riskScoreAtAlert, actionType, actionDetails, outcome }) {
  try {
    // Check if we already have an entry for this alert
    const existing = await db.query(`
      SELECT id FROM risk_alert_actions WHERE alert_id = $1
    `, [alertId]);

    if (existing.rows.length > 0) {
      // Update existing entry
      await db.query(`
        UPDATE risk_alert_actions
        SET acted_on_at = CURRENT_TIMESTAMP,
            action_type = COALESCE($1, action_type),
            action_details = COALESCE($2, action_details),
            outcome = COALESCE($3, outcome)
        WHERE alert_id = $4
      `, [actionType, actionDetails ? JSON.stringify(actionDetails) : null, outcome, alertId]);
    } else {
      // Create new entry
      await db.query(`
        INSERT INTO risk_alert_actions
        (alert_id, client_id, user_id, risk_score_at_alert, generated_at, action_type, action_details, outcome)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7)
      `, [alertId, clientId, userId, riskScoreAtAlert, actionType, actionDetails ? JSON.stringify(actionDetails) : null, outcome]);
    }
  } catch (error) {
    console.warn('[feature-tracking] Failed to log risk alert action:', error.message);
  }
}

/**
 * Mark alert as viewed
 */
async function markAlertViewed(alertId) {
  try {
    await db.query(`
      UPDATE risk_alert_actions
      SET viewed_at = CURRENT_TIMESTAMP
      WHERE alert_id = $1 AND viewed_at IS NULL
    `, [alertId]);
  } catch (error) {
    console.warn('[feature-tracking] Failed to mark alert viewed:', error.message);
  }
}

/**
 * Log system health metric
 */
async function logSystemMetric(metricType, metricName, metricValue, metadata = {}) {
  try {
    await db.query(`
      INSERT INTO system_health_metrics (metric_type, metric_name, metric_value, metadata)
      VALUES ($1, $2, $3, $4)
    `, [metricType, metricName, metricValue, JSON.stringify(metadata)]);
  } catch (error) {
    console.warn('[feature-tracking] Failed to log system metric:', error.message);
  }
}

module.exports = {
  featureTrackingMiddleware,
  trackEvent,
  updateOnboardingMilestone,
  logPdfParse,
  logRiskAlertAction,
  markAlertViewed,
  logSystemMetric
};
