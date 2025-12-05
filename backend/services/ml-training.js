// backend/services/ml-training.js
// Machine Learning Training Service for Churn Prediction
// Handles continuous learning from churn events and weight adjustments

const db = require('../db');

// ============================================================================
// ML TRAINING SERVICE
// ============================================================================

class MLTrainingService {
  constructor() {
    this.minSamplesForTraining = 25; // Minimum churns before making recommendations
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('[ml-training] Initializing ML training service...');
    this.initialized = true;
  }

  // ============================================================================
  // DATA PREPARATION
  // ============================================================================

  /**
   * Get training data from churn events and retention successes
   */
  async getTrainingData(options = {}) {
    const { startDate, endDate, limit = 10000 } = options;

    let dateFilter = '';
    const params = [limit];

    if (startDate && endDate) {
      dateFilter = 'AND ce.churn_date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    // Positive examples (churned clients)
    const churnedData = await db.query(`
      SELECT
        ce.id as event_id,
        ce.client_id,
        ce.pre_churn_risk_score,
        ce.pre_churn_factors,
        ce.days_since_last_contact,
        ce.total_contacts_last_90_days,
        ce.was_preventable,
        ce.active_medications,
        ce.recent_rx_changes,
        cr.reason_category,
        cr.reason_code,
        c.plan_type,
        c.carrier,
        EXTRACT(YEAR FROM AGE(c.dob)) as age,
        c.state,
        c.effective_date,
        EXTRACT(MONTH FROM ce.churn_date) as churn_month,
        1 as label
      FROM churn_events ce
      JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
      JOIN clients c ON c.id = ce.client_id
      WHERE 1=1 ${dateFilter}
      ORDER BY ce.churn_date DESC
      LIMIT $1
    `, params);

    // Negative examples (retained clients - random sample)
    const retainedData = await db.query(`
      SELECT
        NULL as event_id,
        c.id as client_id,
        c.risk_score as pre_churn_risk_score,
        (SELECT jsonb_agg(jsonb_build_object('code', rf.factor_code, 'points', crf.points_contributed))
         FROM client_risk_factors crf
         JOIN risk_factors rf ON rf.id = crf.risk_factor_id
         WHERE crf.client_id = c.id) as pre_churn_factors,
        EXTRACT(DAY FROM NOW() - c.last_contact_date) as days_since_last_contact,
        (SELECT COUNT(*) FROM communications WHERE client_id = c.id AND created_at > NOW() - INTERVAL '90 days') as total_contacts_last_90_days,
        NULL as was_preventable,
        NULL as active_medications,
        NULL as recent_rx_changes,
        NULL as reason_category,
        NULL as reason_code,
        c.plan_type,
        c.carrier,
        EXTRACT(YEAR FROM AGE(c.dob)) as age,
        c.state,
        c.effective_date,
        NULL as churn_month,
        0 as label
      FROM clients c
      WHERE c.status = 'active'
      AND c.id NOT IN (SELECT client_id FROM churn_events)
      AND c.created_at < NOW() - INTERVAL '6 months'
      ORDER BY RANDOM()
      LIMIT $1
    `, [limit]);

    return {
      churned: churnedData.rows,
      retained: retainedData.rows,
      totalChurned: churnedData.rows.length,
      totalRetained: retainedData.rows.length
    };
  }

  /**
   * Extract features from training data
   */
  extractFeatures(dataRow) {
    const features = {
      // Engagement features
      days_since_contact: dataRow.days_since_last_contact || 0,
      contacts_last_90_days: dataRow.total_contacts_last_90_days || 0,
      no_contact_30_plus: (dataRow.days_since_last_contact || 0) >= 30 ? 1 : 0,
      no_contact_60_plus: (dataRow.days_since_last_contact || 0) >= 60 ? 1 : 0,
      no_contact_90_plus: (dataRow.days_since_last_contact || 0) >= 90 ? 1 : 0,

      // Plan features
      is_dsnp: dataRow.plan_type?.toLowerCase().includes('dsnp') ? 1 : 0,
      tenure_months: dataRow.effective_date
        ? Math.floor((Date.now() - new Date(dataRow.effective_date)) / (1000 * 60 * 60 * 24 * 30))
        : 0,
      first_year: dataRow.effective_date
        ? (Date.now() - new Date(dataRow.effective_date)) < (365 * 24 * 60 * 60 * 1000) ? 1 : 0
        : 0,

      // Demographics
      age: dataRow.age || 70,
      age_65_67: dataRow.age >= 65 && dataRow.age <= 67 ? 1 : 0,

      // Pre-churn risk
      pre_churn_risk_score: dataRow.pre_churn_risk_score || 0,

      // Factor counts
      factor_count: 0,
      engagement_factor_count: 0,
      rx_factor_count: 0
    };

    // Parse pre-churn factors if available
    if (dataRow.pre_churn_factors) {
      const factors = typeof dataRow.pre_churn_factors === 'string'
        ? JSON.parse(dataRow.pre_churn_factors)
        : dataRow.pre_churn_factors;

      if (Array.isArray(factors)) {
        features.factor_count = factors.length;

        for (const factor of factors) {
          const code = factor.code || factor.factor_code;
          if (code?.includes('contact') || code?.includes('response')) {
            features.engagement_factor_count++;
          }
          if (code?.includes('rx') || code?.includes('drug') || code?.includes('medication')) {
            features.rx_factor_count++;
          }

          // One-hot encode common factors
          features[`factor_${code}`] = 1;
        }
      }
    }

    // Temporal features
    if (dataRow.churn_month) {
      features.churn_during_aep = dataRow.churn_month >= 10 || dataRow.churn_month === 1 ? 1 : 0;
      features.churn_during_oep = dataRow.churn_month >= 1 && dataRow.churn_month <= 3 ? 1 : 0;
    }

    return features;
  }

  // ============================================================================
  // PATTERN ANALYSIS
  // ============================================================================

  /**
   * Analyze patterns in churned vs retained clients
   */
  async analyzePatterns(options = {}) {
    const { period = '12_months' } = options;

    let dateInterval;
    switch (period) {
      case '30_days': dateInterval = '30 days'; break;
      case '90_days': dateInterval = '90 days'; break;
      case '6_months': dateInterval = '6 months'; break;
      default: dateInterval = '12 months';
    }

    // Factor prevalence in churned vs all clients
    const factorAnalysis = await db.query(`
      WITH churned_clients AS (
        SELECT client_id FROM churn_events WHERE churn_date > NOW() - INTERVAL '${dateInterval}'
      ),
      churned_factors AS (
        SELECT rf.factor_code, COUNT(*) as churned_count
        FROM client_risk_factors crf
        JOIN risk_factors rf ON rf.id = crf.risk_factor_id
        WHERE crf.client_id IN (SELECT client_id FROM churned_clients)
        GROUP BY rf.factor_code
      ),
      all_factors AS (
        SELECT rf.factor_code, COUNT(*) as total_count
        FROM client_risk_factors crf
        JOIN risk_factors rf ON rf.id = crf.risk_factor_id
        GROUP BY rf.factor_code
      )
      SELECT
        cf.factor_code,
        rf.factor_name,
        rf.factor_category,
        rf.base_weight as current_weight,
        COALESCE(cf.churned_count, 0) as in_churned,
        COALESCE(af.total_count, 0) as in_all,
        (SELECT COUNT(*) FROM churned_clients) as total_churned,
        ROUND(
          COALESCE(cf.churned_count, 0)::decimal / NULLIF((SELECT COUNT(*) FROM churned_clients), 0) * 100,
          2
        ) as churned_prevalence,
        ROUND(
          COALESCE(af.total_count, 0)::decimal / NULLIF((SELECT COUNT(*) FROM clients WHERE status != 'churned'), 0) * 100,
          2
        ) as overall_prevalence
      FROM risk_factors rf
      LEFT JOIN churned_factors cf ON cf.factor_code = rf.factor_code
      LEFT JOIN all_factors af ON af.factor_code = rf.factor_code
      WHERE rf.is_active = true
      ORDER BY churned_prevalence DESC NULLS LAST
    `);

    // Calculate correlation and lift
    const patterns = factorAnalysis.rows.map(row => {
      const churnedPrev = parseFloat(row.churned_prevalence) || 0;
      const overallPrev = parseFloat(row.overall_prevalence) || 0;

      return {
        factorCode: row.factor_code,
        factorName: row.factor_name,
        category: row.factor_category,
        currentWeight: row.current_weight,
        inChurned: parseInt(row.in_churned),
        inAll: parseInt(row.in_all),
        churnedPrevalence: churnedPrev,
        overallPrevalence: overallPrev,
        lift: overallPrev > 0 ? (churnedPrev / overallPrev).toFixed(2) : 0,
        correlationStrength: this.classifyCorrelation(churnedPrev, overallPrev)
      };
    });

    return {
      period,
      totalChurned: parseInt(factorAnalysis.rows[0]?.total_churned) || 0,
      patterns: patterns.filter(p => p.inChurned > 0)
    };
  }

  /**
   * Classify correlation strength
   */
  classifyCorrelation(churnedPrev, overallPrev) {
    if (overallPrev === 0) return 'Unknown';
    const lift = churnedPrev / overallPrev;

    if (lift >= 3.0) return 'Very High';
    if (lift >= 2.0) return 'High';
    if (lift >= 1.5) return 'Moderate';
    if (lift >= 1.0) return 'Low';
    return 'Inverse';
  }

  // ============================================================================
  // WEIGHT ADJUSTMENT RECOMMENDATIONS
  // ============================================================================

  /**
   * Generate weight adjustment recommendations based on analysis
   */
  async generateWeightRecommendations() {
    // Check minimum sample size
    const churnCount = await db.query(`
      SELECT COUNT(*) as count FROM churn_events WHERE churn_date > NOW() - INTERVAL '12 months'
    `);

    if (parseInt(churnCount.rows[0].count) < this.minSamplesForTraining) {
      return {
        ok: false,
        message: `Insufficient data. Need at least ${this.minSamplesForTraining} churns, have ${churnCount.rows[0].count}.`
      };
    }

    const patterns = await this.analyzePatterns({ period: '12_months' });
    const recommendations = [];

    for (const pattern of patterns.patterns) {
      const lift = parseFloat(pattern.lift);
      const currentWeight = pattern.currentWeight;

      // Only recommend changes for factors with significant signal
      if (pattern.inChurned < 5) continue; // Need at least 5 occurrences

      let recommendedWeight = currentWeight;
      let reasoning = '';

      if (lift >= 3.0) {
        // Very strong predictor - increase weight significantly
        recommendedWeight = Math.min(currentWeight * 1.5, 50);
        reasoning = `Very high correlation (${lift}x). Factor appears in ${pattern.churnedPrevalence}% of churned clients.`;
      } else if (lift >= 2.0) {
        // Strong predictor - increase weight moderately
        recommendedWeight = Math.min(currentWeight * 1.25, 40);
        reasoning = `High correlation (${lift}x). Consider increasing weight.`;
      } else if (lift <= 0.5 && currentWeight > 5) {
        // Weak predictor - decrease weight
        recommendedWeight = Math.max(currentWeight * 0.75, 5);
        reasoning = `Low correlation (${lift}x). Factor may be over-weighted.`;
      }

      // Only recommend if change is significant (>= 3 points)
      const weightChange = Math.round(recommendedWeight - currentWeight);
      if (Math.abs(weightChange) >= 3) {
        recommendations.push({
          factorCode: pattern.factorCode,
          factorName: pattern.factorName,
          category: pattern.category,
          currentWeight,
          recommendedWeight: Math.round(recommendedWeight),
          weightChange,
          sampleSize: pattern.inChurned,
          confidenceScore: Math.min(pattern.inChurned / 100, 1), // More samples = more confidence
          correlationStrength: pattern.correlationStrength,
          reasoning
        });
      }
    }

    // Sort by absolute weight change
    recommendations.sort((a, b) => Math.abs(b.weightChange) - Math.abs(a.weightChange));

    // Store recommendations in database
    for (const rec of recommendations) {
      try {
        const factor = await db.query(
          `SELECT id FROM risk_factors WHERE factor_code = $1`,
          [rec.factorCode]
        );

        if (factor.rows[0]) {
          await db.query(`
            INSERT INTO weight_adjustment_recommendations
            (risk_factor_id, current_weight, recommended_weight, weight_change,
             sample_size, confidence_score, correlation_strength, reasoning,
             analysis_start_date, analysis_end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '12 months', NOW())
            ON CONFLICT DO NOTHING
          `, [
            factor.rows[0].id,
            rec.currentWeight,
            rec.recommendedWeight,
            rec.weightChange,
            rec.sampleSize,
            rec.confidenceScore,
            rec.correlationStrength,
            rec.reasoning
          ]);
        }
      } catch (error) {
        console.error(`[ml-training] Error storing recommendation for ${rec.factorCode}:`, error.message);
      }
    }

    return {
      ok: true,
      totalChurned: patterns.totalChurned,
      recommendations,
      message: `Generated ${recommendations.length} weight adjustment recommendations`
    };
  }

  // ============================================================================
  // MODEL PERFORMANCE TRACKING
  // ============================================================================

  /**
   * Calculate model performance metrics
   */
  async calculatePerformanceMetrics(options = {}) {
    const { period = '30_days', modelVersionId = null } = options;

    let dateInterval;
    switch (period) {
      case '7_days': dateInterval = '7 days'; break;
      case '30_days': dateInterval = '30 days'; break;
      case '90_days': dateInterval = '90 days'; break;
      default: dateInterval = '30 days';
    }

    // Get predictions with known outcomes
    const predictions = await db.query(`
      SELECT
        churn_probability,
        predicted_risk_score,
        actual_outcome
      FROM ml_predictions
      WHERE actual_outcome IS NOT NULL
      AND predicted_at > NOW() - INTERVAL '${dateInterval}'
      ${modelVersionId ? 'AND model_version_id = $1' : ''}
    `, modelVersionId ? [modelVersionId] : []);

    if (predictions.rows.length === 0) {
      return { message: 'No predictions with known outcomes in this period' };
    }

    // Calculate confusion matrix
    let tp = 0, tn = 0, fp = 0, fn = 0;
    const threshold = 0.7; // 70% churn probability threshold

    for (const pred of predictions.rows) {
      const predictedChurn = pred.churn_probability >= threshold;
      const actualChurn = pred.actual_outcome === 'churned';

      if (predictedChurn && actualChurn) tp++;
      else if (!predictedChurn && !actualChurn) tn++;
      else if (predictedChurn && !actualChurn) fp++;
      else fn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const fnr = fn + tp > 0 ? fn / (fn + tp) : 0;
    const accuracy = (tp + tn) / predictions.rows.length;

    return {
      period,
      totalPredictions: predictions.rows.length,
      confusionMatrix: { tp, tn, fp, fn },
      metrics: {
        accuracy: accuracy.toFixed(4),
        precision: precision.toFixed(4),
        recall: recall.toFixed(4),
        f1Score: f1.toFixed(4),
        falsePositiveRate: fpr.toFixed(4),
        falseNegativeRate: fnr.toFixed(4)
      },
      targets: {
        precision: 0.60,
        recall: 0.80,
        falsePositiveRate: 0.30,
        falseNegativeRate: 0.15
      },
      meetsTargets: {
        precision: precision >= 0.60,
        recall: recall >= 0.80,
        falsePositiveRate: fpr <= 0.30,
        falseNegativeRate: fnr <= 0.15
      }
    };
  }

  /**
   * Update prediction outcomes from churn events
   */
  async updatePredictionOutcomes() {
    let updated = 0;

    // Mark predictions as churned for clients who churned
    const churned = await db.query(`
      UPDATE ml_predictions mp
      SET actual_outcome = 'churned',
          outcome_recorded_at = CURRENT_TIMESTAMP
      FROM churn_events ce
      WHERE mp.client_id = ce.client_id
      AND mp.actual_outcome IS NULL
      AND mp.predicted_at < ce.churn_date
      RETURNING mp.id
    `);
    updated += churned.rows.length;

    // Mark predictions as retained for clients who are still active after 6 months
    const retained = await db.query(`
      UPDATE ml_predictions mp
      SET actual_outcome = 'retained',
          outcome_recorded_at = CURRENT_TIMESTAMP
      FROM clients c
      WHERE mp.client_id = c.id
      AND mp.actual_outcome IS NULL
      AND mp.predicted_at < NOW() - INTERVAL '6 months'
      AND c.status = 'active'
      AND c.id NOT IN (SELECT client_id FROM churn_events)
      RETURNING mp.id
    `);
    updated += retained.rows.length;

    console.log(`[ml-training] Updated ${updated} prediction outcomes`);
    return updated;
  }

  // ============================================================================
  // SCHEDULED TASKS
  // ============================================================================

  /**
   * Quarterly analysis and recommendations
   */
  async runQuarterlyAnalysis() {
    console.log('[ml-training] Running quarterly analysis...');

    // Update prediction outcomes
    await this.updatePredictionOutcomes();

    // Calculate performance metrics
    const metrics = await this.calculatePerformanceMetrics({ period: '90_days' });

    // Generate weight recommendations
    const recommendations = await this.generateWeightRecommendations();

    // Store metrics
    await db.query(`
      INSERT INTO model_performance_metrics
      (metric_date, metric_period, precision_score, recall_score, f1_score,
       false_positive_rate, false_negative_rate,
       total_predictions, true_positives, true_negatives, false_positives, false_negatives)
      VALUES (CURRENT_DATE, 'quarterly', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      metrics.metrics?.precision || 0,
      metrics.metrics?.recall || 0,
      metrics.metrics?.f1Score || 0,
      metrics.metrics?.falsePositiveRate || 0,
      metrics.metrics?.falseNegativeRate || 0,
      metrics.totalPredictions || 0,
      metrics.confusionMatrix?.tp || 0,
      metrics.confusionMatrix?.tn || 0,
      metrics.confusionMatrix?.fp || 0,
      metrics.confusionMatrix?.fn || 0
    ]);

    return { metrics, recommendations };
  }

  /**
   * Annual recalibration (January - post AEP)
   */
  async runAnnualRecalibration() {
    console.log('[ml-training] Running annual recalibration...');

    // Full analysis of the past year
    const analysis = await this.analyzePatterns({ period: '12_months' });

    // Generate and auto-apply high-confidence recommendations
    const recommendations = await this.generateWeightRecommendations();

    // For very high confidence recommendations, auto-apply
    if (recommendations.ok) {
      for (const rec of recommendations.recommendations) {
        if (rec.confidenceScore >= 0.8 && rec.sampleSize >= 50) {
          console.log(`[ml-training] Auto-applying high-confidence adjustment: ${rec.factorCode}`);

          await db.query(`
            UPDATE risk_factors
            SET ml_weight = $1, ml_confidence = $2, updated_at = CURRENT_TIMESTAMP
            WHERE factor_code = $3
          `, [rec.recommendedWeight, rec.confidenceScore, rec.factorCode]);
        }
      }
    }

    return { analysis, recommendations };
  }
}

// Export singleton
module.exports = new MLTrainingService();
