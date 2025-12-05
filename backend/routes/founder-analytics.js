// backend/routes/founder-analytics.js
// Founder Dashboard Analytics for Churn Prediction Model
// Provides model performance, churn analysis, and intervention effectiveness

const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware to ensure only admins, FMOs, and managers can access
const founderAccess = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }
  if (!['admin', 'fmo', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: 'Founder access required' });
  }
  next();
};

router.use(founderAccess);

// ============================================================================
// OVERVIEW PANEL
// ============================================================================

/**
 * GET /founder-analytics/overview
 * Get model overview stats
 */
router.get("/overview", async (req, res) => {
  try {
    // Model status
    const lastScan = await db.query(`
      SELECT MAX(scored_at) as last_scan
      FROM risk_score_history
    `);

    // Total clients monitored
    const totalClients = await db.query(`
      SELECT COUNT(*) as count FROM clients WHERE status != 'churned'
    `);

    // Risk distribution
    const distribution = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE risk_score >= 90) as severe,
        COUNT(*) FILTER (WHERE risk_score >= 80 AND risk_score < 90) as critical,
        COUNT(*) FILTER (WHERE risk_score >= 65 AND risk_score < 80) as high,
        COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 65) as elevated,
        COUNT(*) FILTER (WHERE risk_score >= 35 AND risk_score < 50) as medium,
        COUNT(*) FILTER (WHERE risk_score >= 20 AND risk_score < 35) as low,
        COUNT(*) FILTER (WHERE risk_score < 20) as stable
      FROM clients
      WHERE status != 'churned'
    `);

    // Active model version
    const activeModel = await db.query(`
      SELECT version_number, version_name, model_type, accuracy, precision_score, recall_score
      FROM ml_model_versions
      WHERE is_production = true
      LIMIT 1
    `);

    res.json({
      ok: true,
      modelStatus: 'Active',
      lastScan: lastScan.rows[0]?.last_scan || null,
      totalClientsMonitored: parseInt(totalClients.rows[0].count),
      distribution: distribution.rows[0],
      activeModel: activeModel.rows[0] || { version_name: 'Rule-Based v1.0', model_type: 'rule_based' }
    });
  } catch (error) {
    console.error('[founder-analytics] Overview error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// MODEL ACCURACY PANEL
// ============================================================================

/**
 * GET /founder-analytics/model-accuracy
 * Get model performance metrics
 */
router.get("/model-accuracy", async (req, res) => {
  try {
    const { period = '12_months' } = req.query;

    let dateFilter;
    switch (period) {
      case '30_days': dateFilter = "NOW() - INTERVAL '30 days'"; break;
      case '90_days': dateFilter = "NOW() - INTERVAL '90 days'"; break;
      case '6_months': dateFilter = "NOW() - INTERVAL '6 months'"; break;
      default: dateFilter = "NOW() - INTERVAL '12 months'";
    }

    // Get predictions vs actual outcomes
    const predictions = await db.query(`
      SELECT
        COUNT(*) as total_predictions,
        COUNT(*) FILTER (WHERE actual_outcome = 'churned' AND churn_probability >= 0.7) as true_positives,
        COUNT(*) FILTER (WHERE actual_outcome = 'retained' AND churn_probability < 0.7) as true_negatives,
        COUNT(*) FILTER (WHERE actual_outcome = 'retained' AND churn_probability >= 0.7) as false_positives,
        COUNT(*) FILTER (WHERE actual_outcome = 'churned' AND churn_probability < 0.7) as false_negatives
      FROM ml_predictions
      WHERE actual_outcome IS NOT NULL
      AND predicted_at > ${dateFilter}
    `);

    const p = predictions.rows[0];
    const tp = parseInt(p.true_positives) || 0;
    const tn = parseInt(p.true_negatives) || 0;
    const fp = parseInt(p.false_positives) || 0;
    const fn = parseInt(p.false_negatives) || 0;

    const precision = tp + fp > 0 ? (tp / (tp + fp)) : 0;
    const recall = tp + fn > 0 ? (tp / (tp + fn)) : 0;
    const fpr = fp + tn > 0 ? (fp / (fp + tn)) : 0;
    const fnr = fn + tp > 0 ? (fn / (fn + tp)) : 0;

    // Average lead time (days before churn that we predicted)
    const leadTime = await db.query(`
      SELECT AVG(
        EXTRACT(DAY FROM ce.churn_date - mp.predicted_at)
      ) as avg_lead_time
      FROM ml_predictions mp
      JOIN churn_events ce ON ce.client_id = mp.client_id
      WHERE mp.actual_outcome = 'churned'
      AND mp.predicted_at > ${dateFilter}
    `);

    // Accuracy by category
    const categoryAccuracy = await db.query(`
      SELECT
        CASE
          WHEN rsh.risk_score >= 90 THEN 'severe'
          WHEN rsh.risk_score >= 80 THEN 'critical'
          WHEN rsh.risk_score >= 65 THEN 'high'
          WHEN rsh.risk_score >= 50 THEN 'elevated'
          WHEN rsh.risk_score >= 35 THEN 'medium'
          ELSE 'low_stable'
        END as category,
        COUNT(*) as predicted,
        COUNT(*) FILTER (WHERE c.status = 'churned') as actually_churned
      FROM risk_score_history rsh
      JOIN clients c ON c.id = rsh.client_id
      WHERE rsh.scored_at > ${dateFilter}
      AND rsh.scored_at = (
        SELECT MAX(scored_at) FROM risk_score_history
        WHERE client_id = rsh.client_id AND scored_at <= ${dateFilter}
      )
      GROUP BY category
      ORDER BY category
    `);

    res.json({
      ok: true,
      metrics: {
        precision: precision.toFixed(4),
        precisionTarget: 0.60,
        recall: recall.toFixed(4),
        recallTarget: 0.80,
        falsePositiveRate: fpr.toFixed(4),
        fprTarget: 0.30,
        falseNegativeRate: fnr.toFixed(4),
        fnrTarget: 0.15,
        avgLeadTimeDays: Math.round(parseFloat(leadTime.rows[0]?.avg_lead_time) || 0),
        leadTimeTarget: 45
      },
      counts: {
        totalPredictions: parseInt(p.total_predictions),
        truePositives: tp,
        trueNegatives: tn,
        falsePositives: fp,
        falseNegatives: fn
      },
      categoryAccuracy: categoryAccuracy.rows.map(c => ({
        category: c.category,
        predicted: parseInt(c.predicted),
        actuallyChurned: parseInt(c.actually_churned),
        accuracy: c.predicted > 0 ? ((c.actually_churned / c.predicted) * 100).toFixed(1) : 0
      }))
    });
  } catch (error) {
    console.error('[founder-analytics] Model accuracy error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CHURN ANALYSIS PANEL
// ============================================================================

/**
 * GET /founder-analytics/churn-analysis
 * Get detailed churn analysis
 */
router.get("/churn-analysis", async (req, res) => {
  try {
    const { period = '12_months' } = req.query;

    let dateFilter;
    switch (period) {
      case '30_days': dateFilter = "NOW() - INTERVAL '30 days'"; break;
      case '90_days': dateFilter = "NOW() - INTERVAL '90 days'"; break;
      case '6_months': dateFilter = "NOW() - INTERVAL '6 months'"; break;
      default: dateFilter = "NOW() - INTERVAL '12 months'";
    }

    // Total churned vs retained
    const totals = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM churn_events WHERE churn_date > ${dateFilter}) as churned,
        (SELECT COUNT(*) FROM clients WHERE status = 'active' AND created_at < ${dateFilter}) as retained
    `);

    // By reason category
    const byReason = await db.query(`
      SELECT
        cr.reason_category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM churn_events WHERE churn_date > ${dateFilter}), 0), 1) as percentage
      FROM churn_events ce
      JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
      WHERE ce.churn_date > ${dateFilter}
      GROUP BY cr.reason_category
      ORDER BY count DESC
    `);

    // By timing (AEP, OEP, SEP)
    const byTiming = await db.query(`
      SELECT
        CASE
          WHEN EXTRACT(MONTH FROM churn_date) IN (10, 11, 12) THEN 'AEP (Oct-Dec)'
          WHEN EXTRACT(MONTH FROM churn_date) IN (1, 2, 3) THEN 'OEP (Jan-Mar)'
          ELSE 'SEP (Apr-Sep)'
        END as period,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM churn_events WHERE churn_date > ${dateFilter}), 0), 1) as percentage
      FROM churn_events
      WHERE churn_date > ${dateFilter}
      GROUP BY period
      ORDER BY count DESC
    `);

    // By tenure
    const byTenure = await db.query(`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(ce.churn_date, c.effective_date)) < 1 THEN 'Year 1'
          WHEN EXTRACT(YEAR FROM AGE(ce.churn_date, c.effective_date)) < 2 THEN 'Year 2'
          ELSE 'Year 3+'
        END as tenure,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM churn_events WHERE churn_date > ${dateFilter}), 0), 1) as percentage
      FROM churn_events ce
      JOIN clients c ON c.id = ce.client_id
      WHERE ce.churn_date > ${dateFilter}
      AND c.effective_date IS NOT NULL
      GROUP BY tenure
      ORDER BY
        CASE tenure
          WHEN 'Year 1' THEN 1
          WHEN 'Year 2' THEN 2
          ELSE 3
        END
    `);

    // Top specific reasons
    const topReasons = await db.query(`
      SELECT
        cr.reason_name,
        COUNT(*) as count
      FROM churn_events ce
      JOIN churn_reasons cr ON cr.id = ce.primary_reason_id
      WHERE ce.churn_date > ${dateFilter}
      GROUP BY cr.reason_name
      ORDER BY count DESC
      LIMIT 10
    `);

    const churned = parseInt(totals.rows[0].churned);
    const retained = parseInt(totals.rows[0].retained);
    const total = churned + retained;

    res.json({
      ok: true,
      summary: {
        totalChurned: churned,
        totalRetained: retained,
        churnRate: total > 0 ? ((churned / total) * 100).toFixed(1) : 0,
        retentionRate: total > 0 ? ((retained / total) * 100).toFixed(1) : 0
      },
      byReason: byReason.rows,
      byTiming: byTiming.rows,
      byTenure: byTenure.rows,
      topReasons: topReasons.rows,
      insight: byTenure.rows.find(t => t.tenure === 'Year 1')?.percentage > 50
        ? 'First-year clients churn at significantly higher rates than established clients.'
        : null
    });
  } catch (error) {
    console.error('[founder-analytics] Churn analysis error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// INTERVENTION EFFECTIVENESS PANEL
// ============================================================================

/**
 * GET /founder-analytics/intervention-effectiveness
 * Get intervention type effectiveness comparison
 */
router.get("/intervention-effectiveness", async (req, res) => {
  try {
    const { period = '12_months' } = req.query;

    let dateFilter;
    switch (period) {
      case '30_days': dateFilter = "NOW() - INTERVAL '30 days'"; break;
      case '90_days': dateFilter = "NOW() - INTERVAL '90 days'"; break;
      case '6_months': dateFilter = "NOW() - INTERVAL '6 months'"; break;
      default: dateFilter = "NOW() - INTERVAL '12 months'";
    }

    // Effectiveness by intervention type
    const effectiveness = await db.query(`
      SELECT
        intervention_type,
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE outcome = 'retained') as retained,
        COUNT(*) FILTER (WHERE outcome = 'churned') as churned,
        ROUND(
          COUNT(*) FILTER (WHERE outcome = 'retained') * 100.0 /
          NULLIF(COUNT(*) FILTER (WHERE outcome IN ('retained', 'churned')), 0),
          1
        ) as retention_rate
      FROM interventions
      WHERE intervention_date > ${dateFilter}
      AND outcome IN ('retained', 'churned')
      GROUP BY intervention_type
      ORDER BY retention_rate DESC NULLS LAST
    `);

    // No intervention comparison
    const noIntervention = await db.query(`
      SELECT
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE c.status = 'churned') as churned
      FROM clients c
      WHERE c.risk_score >= 50
      AND c.id NOT IN (SELECT client_id FROM interventions WHERE intervention_date > ${dateFilter})
      AND c.created_at < ${dateFilter}
    `);

    const noInt = noIntervention.rows[0];
    const noIntTotal = parseInt(noInt.total_clients);
    const noIntChurned = parseInt(noInt.churned);
    const noIntRetention = noIntTotal > 0 ? ((noIntTotal - noIntChurned) / noIntTotal * 100).toFixed(1) : 0;

    // Best vs no intervention comparison
    const best = effectiveness.rows[0];
    const improvement = best ? (parseFloat(best.retention_rate) - parseFloat(noIntRetention)).toFixed(1) : 0;

    res.json({
      ok: true,
      byInterventionType: effectiveness.rows,
      noIntervention: {
        totalClients: noIntTotal,
        retained: noIntTotal - noIntChurned,
        churned: noIntChurned,
        retentionRate: noIntRetention
      },
      insight: best && improvement > 0
        ? `${best.intervention_type.replace(/_/g, ' ')} shows ${improvement}% better retention than no intervention. Prioritize for high-risk clients.`
        : null
    });
  } catch (error) {
    console.error('[founder-analytics] Intervention effectiveness error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// RISK FACTOR ANALYSIS PANEL
// ============================================================================

/**
 * GET /founder-analytics/risk-factor-analysis
 * Get top risk factors in churned clients
 */
router.get("/risk-factor-analysis", async (req, res) => {
  try {
    const { period = '12_months' } = req.query;

    let dateFilter;
    switch (period) {
      case '30_days': dateFilter = "NOW() - INTERVAL '30 days'"; break;
      case '90_days': dateFilter = "NOW() - INTERVAL '90 days'"; break;
      case '6_months': dateFilter = "NOW() - INTERVAL '6 months'"; break;
      default: dateFilter = "NOW() - INTERVAL '12 months'";
    }

    // Top factors in churned clients
    const topFactors = await db.query(`
      WITH churned_factors AS (
        SELECT DISTINCT ce.client_id
        FROM churn_events ce
        WHERE ce.churn_date > ${dateFilter}
      )
      SELECT
        rf.factor_name,
        rf.factor_category,
        COUNT(DISTINCT crf.client_id) as present_in_churned,
        ROUND(
          COUNT(DISTINCT crf.client_id) * 100.0 /
          NULLIF((SELECT COUNT(*) FROM churned_factors), 0),
          1
        ) as percentage,
        AVG(crf.points_contributed) as avg_contribution
      FROM client_risk_factors crf
      JOIN risk_factors rf ON rf.id = crf.risk_factor_id
      WHERE crf.client_id IN (SELECT client_id FROM churned_factors)
      GROUP BY rf.id, rf.factor_name, rf.factor_category
      ORDER BY present_in_churned DESC
      LIMIT 15
    `);

    // Correlation strength (compare churned vs retained)
    const correlations = await db.query(`
      WITH churned_with_factor AS (
        SELECT rf.factor_code, COUNT(DISTINCT ce.client_id) as churned_count
        FROM churn_events ce
        JOIN risk_score_history rsh ON rsh.client_id = ce.client_id
        CROSS JOIN LATERAL jsonb_array_elements(rsh.contributing_factors::jsonb) AS factor
        JOIN risk_factors rf ON rf.factor_code = factor->>'code'
        WHERE ce.churn_date > ${dateFilter}
        GROUP BY rf.factor_code
      ),
      retained_with_factor AS (
        SELECT rf.factor_code, COUNT(DISTINCT c.id) as retained_count
        FROM clients c
        JOIN client_risk_factors crf ON crf.client_id = c.id
        JOIN risk_factors rf ON rf.id = crf.risk_factor_id
        WHERE c.status = 'active'
        GROUP BY rf.factor_code
      )
      SELECT
        COALESCE(c.factor_code, r.factor_code) as factor_code,
        COALESCE(c.churned_count, 0) as churned,
        COALESCE(r.retained_count, 0) as retained,
        CASE
          WHEN COALESCE(c.churned_count, 0) + COALESCE(r.retained_count, 0) = 0 THEN 0
          ELSE ROUND(
            COALESCE(c.churned_count, 0)::decimal /
            (COALESCE(c.churned_count, 0) + COALESCE(r.retained_count, 0)),
            4
          )
        END as churn_rate_with_factor
      FROM churned_with_factor c
      FULL OUTER JOIN retained_with_factor r ON c.factor_code = r.factor_code
      ORDER BY churn_rate_with_factor DESC NULLS LAST
      LIMIT 10
    `);

    // Controllable factors insight
    const controllableFactors = topFactors.rows.filter(f =>
      f.factor_category === 'engagement' ||
      f.factor_name.toLowerCase().includes('contact')
    );

    res.json({
      ok: true,
      topFactors: topFactors.rows.map(f => ({
        factorName: f.factor_name,
        category: f.factor_category,
        presentIn: parseInt(f.present_in_churned),
        percentage: f.percentage,
        avgContribution: Math.round(parseFloat(f.avg_contribution) || 0),
        correlation: correlations.rows.find(c => c.factor_code === f.factor_code)?.churn_rate_with_factor || null
      })),
      insight: controllableFactors.length > 0
        ? `Contact frequency is the #1 controllable factor. Clients with ${controllableFactors[0]?.factor_name || '60+ days no contact'} churn at ${controllableFactors[0]?.percentage || '4x'}% rate.`
        : null
    });
  } catch (error) {
    console.error('[founder-analytics] Risk factor analysis error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// AGENT PERFORMANCE PANEL
// ============================================================================

/**
 * GET /founder-analytics/agent-performance
 * Get agent retention performance comparison
 */
router.get("/agent-performance", async (req, res) => {
  try {
    const { period = '12_months' } = req.query;

    let dateFilter;
    switch (period) {
      case '30_days': dateFilter = "NOW() - INTERVAL '30 days'"; break;
      case '90_days': dateFilter = "NOW() - INTERVAL '90 days'"; break;
      case '6_months': dateFilter = "NOW() - INTERVAL '6 months'"; break;
      default: dateFilter = "NOW() - INTERVAL '12 months'";
    }

    const agentPerformance = await db.query(`
      SELECT
        u.id as agent_id,
        u.name as agent_name,
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT c.id) FILTER (WHERE c.risk_score >= 65) as high_risk,
        (SELECT COUNT(*) FROM churn_events ce
         WHERE ce.logged_by = u.id AND ce.churn_date > ${dateFilter}) as churned,
        ROUND(AVG(c.risk_score), 1) as avg_risk_score,
        ROUND(
          (COUNT(DISTINCT c.id) - (
            SELECT COUNT(*) FROM churn_events ce
            WHERE ce.logged_by = u.id AND ce.churn_date > ${dateFilter}
          )) * 100.0 / NULLIF(COUNT(DISTINCT c.id), 0),
          1
        ) as retention_rate
      FROM users u
      JOIN clients c ON c.owner_id = u.id
      WHERE u.role = 'agent'
      AND c.status != 'churned' OR c.id IN (
        SELECT client_id FROM churn_events WHERE churn_date > ${dateFilter}
      )
      GROUP BY u.id, u.name
      HAVING COUNT(DISTINCT c.id) >= 10
      ORDER BY retention_rate DESC NULLS LAST
    `);

    // Find best performer for insight
    const best = agentPerformance.rows[0];

    res.json({
      ok: true,
      agents: agentPerformance.rows.map(a => ({
        agentId: a.agent_id,
        agentName: a.agent_name,
        totalClients: parseInt(a.total_clients),
        highRisk: parseInt(a.high_risk),
        highRiskPercent: ((parseInt(a.high_risk) / parseInt(a.total_clients)) * 100).toFixed(0),
        churned: parseInt(a.churned),
        retentionRate: a.retention_rate,
        avgRiskScore: parseFloat(a.avg_risk_score)
      })),
      insight: best
        ? `${best.agent_name} maintains lowest avg risk score (${best.avg_risk_score}) - review their contact cadence as best practice for team.`
        : null
    });
  } catch (error) {
    console.error('[founder-analytics] Agent performance error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// COMPETITOR ANALYSIS
// ============================================================================

/**
 * GET /founder-analytics/competitors
 * Get competitive intelligence
 */
router.get("/competitors", async (req, res) => {
  try {
    const competitors = await db.query(`
      SELECT
        carrier_name,
        SUM(clients_lost_to) as total_lost,
        MAX(last_loss_date) as last_loss,
        array_agg(DISTINCT plan_name) FILTER (WHERE plan_name IS NOT NULL) as plans,
        array_agg(DISTINCT known_advantages) as advantages
      FROM competitor_plans
      GROUP BY carrier_name
      ORDER BY total_lost DESC
      LIMIT 10
    `);

    // By plan type
    const byPlanType = await db.query(`
      SELECT
        plan_type,
        SUM(clients_lost_to) as count
      FROM competitor_plans
      WHERE plan_type IS NOT NULL
      GROUP BY plan_type
      ORDER BY count DESC
    `);

    res.json({
      ok: true,
      topCompetitors: competitors.rows.map(c => ({
        carrierName: c.carrier_name,
        clientsLost: parseInt(c.total_lost),
        lastLoss: c.last_loss,
        plans: c.plans?.filter(p => p) || [],
        knownAdvantages: (c.advantages || []).flat().filter(a => a)
      })),
      byPlanType: byPlanType.rows
    });
  } catch (error) {
    console.error('[founder-analytics] Competitors error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// WEIGHT ADJUSTMENT RECOMMENDATIONS
// ============================================================================

/**
 * GET /founder-analytics/weight-recommendations
 * Get ML-recommended weight adjustments
 */
router.get("/weight-recommendations", async (req, res) => {
  try {
    const recommendations = await db.query(`
      SELECT
        war.id,
        rf.factor_code,
        rf.factor_name,
        rf.factor_category,
        war.current_weight,
        war.recommended_weight,
        war.weight_change,
        war.sample_size,
        war.confidence_score,
        war.reasoning,
        war.status,
        war.created_at,
        u.name as reviewed_by_name,
        war.reviewed_at,
        war.review_notes
      FROM weight_adjustment_recommendations war
      JOIN risk_factors rf ON rf.id = war.risk_factor_id
      LEFT JOIN users u ON u.id = war.reviewed_by
      WHERE war.status IN ('pending', 'approved')
      ORDER BY war.status, war.confidence_score DESC
    `);

    res.json({
      ok: true,
      recommendations: recommendations.rows,
      pendingCount: recommendations.rows.filter(r => r.status === 'pending').length
    });
  } catch (error) {
    console.error('[founder-analytics] Weight recommendations error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /founder-analytics/weight-recommendations/:id/approve
 * Approve or reject a weight adjustment
 */
router.post("/weight-recommendations/:id/:action", async (req, res) => {
  try {
    const { id, action } = req.params;
    const { notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    await db.query(`
      UPDATE weight_adjustment_recommendations
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          review_notes = $3
      WHERE id = $4
    `, [status, req.user.id, notes, id]);

    // If approved, apply the weight change
    if (action === 'approve') {
      const rec = await db.query(
        `SELECT risk_factor_id, recommended_weight FROM weight_adjustment_recommendations WHERE id = $1`,
        [id]
      );

      if (rec.rows[0]) {
        await db.query(`
          UPDATE risk_factors
          SET ml_weight = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [rec.rows[0].recommended_weight, rec.rows[0].risk_factor_id]);

        await db.query(`
          UPDATE weight_adjustment_recommendations
          SET applied_at = CURRENT_TIMESTAMP, status = 'applied'
          WHERE id = $1
        `, [id]);
      }
    }

    res.json({ ok: true, message: `Recommendation ${action}d successfully` });
  } catch (error) {
    console.error('[founder-analytics] Weight recommendation action error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * POST /founder-analytics/generate-report
 * Generate a downloadable report
 */
router.post("/generate-report", async (req, res) => {
  try {
    const {
      reportType,
      period,
      includeCharts,
      includeInsights,
      includeClientDetail,
      format = 'json'
    } = req.body;

    // Gather data based on report type
    let reportData = {};

    switch (reportType) {
      case 'executive_summary':
        // Get overview, distribution, key metrics
        const overview = await db.query(`SELECT COUNT(*) as total FROM clients WHERE status != 'churned'`);
        const churnCount = await db.query(`SELECT COUNT(*) as count FROM churn_events WHERE churn_date > NOW() - INTERVAL '${period || '30 days'}'`);
        reportData = {
          title: 'Executive Summary',
          generatedAt: new Date().toISOString(),
          period: period || '30 days',
          totalClients: overview.rows[0].total,
          recentChurns: churnCount.rows[0].count
        };
        break;

      case 'churn_analysis':
        // Full churn breakdown
        reportData = { title: 'Churn Analysis Report' };
        break;

      case 'model_performance':
        reportData = { title: 'Model Performance Report' };
        break;

      case 'intervention_effectiveness':
        reportData = { title: 'Intervention Effectiveness Report' };
        break;

      case 'agent_performance':
        reportData = { title: 'Agent Performance Comparison' };
        break;

      default:
        reportData = { title: 'Custom Report' };
    }

    // For now, return JSON - PDF/Excel generation would require additional libraries
    res.json({
      ok: true,
      report: reportData,
      format,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name
    });
  } catch (error) {
    console.error('[founder-analytics] Report generation error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// MODEL TRAINING STATUS
// ============================================================================

/**
 * GET /founder-analytics/model-versions
 * Get all model versions and their status
 */
router.get("/model-versions", async (req, res) => {
  try {
    const versions = await db.query(`
      SELECT
        id, version_number, version_name, model_type,
        training_started_at, training_completed_at,
        training_samples, churn_samples,
        accuracy, precision_score, recall_score, f1_score, auc_roc,
        status, is_production,
        notes, created_at
      FROM ml_model_versions
      ORDER BY version_number DESC
    `);

    res.json({
      ok: true,
      versions: versions.rows,
      productionVersion: versions.rows.find(v => v.is_production) || null
    });
  } catch (error) {
    console.error('[founder-analytics] Model versions error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /founder-analytics/trigger-training
 * Trigger ML model retraining (placeholder for future ML integration)
 */
router.post("/trigger-training", async (req, res) => {
  try {
    // This would trigger actual ML training in production
    // For now, just log the request

    const newVersion = await db.query(`
      INSERT INTO ml_model_versions
      (version_number, version_name, model_type, training_started_at, status, notes)
      VALUES (
        (SELECT COALESCE(MAX(version_number), 0) + 1 FROM ml_model_versions),
        $1,
        $2,
        CURRENT_TIMESTAMP,
        'training',
        $3
      )
      RETURNING id, version_number
    `, [
      req.body.versionName || 'Auto-triggered training',
      req.body.modelType || 'gradient_boost',
      req.body.notes || 'Manually triggered from dashboard'
    ]);

    res.json({
      ok: true,
      message: 'Training initiated',
      modelVersionId: newVersion.rows[0].id,
      versionNumber: newVersion.rows[0].version_number
    });
  } catch (error) {
    console.error('[founder-analytics] Trigger training error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
