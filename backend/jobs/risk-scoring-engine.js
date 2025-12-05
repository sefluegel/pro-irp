// backend/jobs/risk-scoring-engine.js
// Rule-based risk scoring engine for client churn prediction
// This runs nightly to evaluate all clients and update risk scores

const db = require('../db');

// ============================================================================
// RISK SCORING ENGINE
// ============================================================================

class RiskScoringEngine {
  constructor() {
    this.riskFactors = new Map();
    this.initialized = false;
  }

  /**
   * Load risk factors from database
   */
  async initialize() {
    const factors = await db.query(
      `SELECT id, factor_code, factor_name, factor_category, base_weight, ml_weight
       FROM risk_factors
       WHERE is_active = true`
    );

    for (const factor of factors.rows) {
      this.riskFactors.set(factor.factor_code, {
        id: factor.id,
        name: factor.factor_name,
        category: factor.factor_category,
        weight: factor.ml_weight || factor.base_weight // Use ML weight if available
      });
    }

    this.initialized = true;
    console.log(`[risk-engine] Loaded ${this.riskFactors.size} risk factors`);
  }

  /**
   * Calculate risk score for a single client
   */
  async scoreClient(clientId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const detectedFactors = [];
    let totalScore = 0;

    // Get client data
    const clientResult = await db.query(
      `SELECT
        c.*,
        EXTRACT(DAY FROM NOW() - c.last_contact_date) as days_since_contact,
        EXTRACT(YEAR FROM AGE(c.dob)) as age
       FROM clients c
       WHERE c.id = $1`,
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const client = clientResult.rows[0];

    // ========================================================================
    // ENGAGEMENT FACTORS
    // ========================================================================

    // No contact checks
    const daysSinceContact = client.days_since_contact || 999;

    if (daysSinceContact >= 90) {
      const factor = this.riskFactors.get('no_contact_90_days');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'no_contact_90_days',
          value: `${Math.floor(daysSinceContact)} days`,
          numericValue: daysSinceContact,
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    } else if (daysSinceContact >= 60) {
      const factor = this.riskFactors.get('no_contact_60_days');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'no_contact_60_days',
          value: `${Math.floor(daysSinceContact)} days`,
          numericValue: daysSinceContact,
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    } else if (daysSinceContact >= 30) {
      const factor = this.riskFactors.get('no_contact_30_days');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'no_contact_30_days',
          value: `${Math.floor(daysSinceContact)} days`,
          numericValue: daysSinceContact,
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // Check for missed appointments
    const missedAppts = await db.query(
      `SELECT COUNT(*) as count FROM communications
       WHERE client_id = $1
       AND type = 'appointment'
       AND outcome = 'no_show'
       AND created_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );

    if (parseInt(missedAppts.rows[0].count) > 0) {
      const factor = this.riskFactors.get('missed_appointment');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'missed_appointment',
          value: `${missedAppts.rows[0].count} missed`,
          numericValue: parseInt(missedAppts.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // Check for no response to outreach
    const recentOutreach = await db.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE outcome IS NULL OR outcome = 'no_answer') as no_response
       FROM communications
       WHERE client_id = $1
       AND direction = 'outbound'
       AND created_at > NOW() - INTERVAL '30 days'`,
      [clientId]
    );

    if (parseInt(recentOutreach.rows[0].total) >= 3 &&
        parseInt(recentOutreach.rows[0].no_response) >= 3) {
      const factor = this.riskFactors.get('no_response_outreach');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'no_response_outreach',
          value: `${recentOutreach.rows[0].no_response} unanswered`,
          numericValue: parseInt(recentOutreach.rows[0].no_response),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // ========================================================================
    // PRESCRIPTION FACTORS (from Blue Button data)
    // ========================================================================

    // Check for new specialty drugs
    const specialtyDrugs = await db.query(
      `SELECT COUNT(*) as count FROM prescription_changes
       WHERE client_id = $1
       AND change_type = 'specialty_drug_added'
       AND detected_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );

    if (parseInt(specialtyDrugs.rows[0].count) > 0) {
      const factor = this.riskFactors.get('new_specialty_drug');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'new_specialty_drug',
          value: `${specialtyDrugs.rows[0].count} specialty drugs`,
          numericValue: parseInt(specialtyDrugs.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // Check for new medications
    const newMeds = await db.query(
      `SELECT COUNT(*) as count FROM prescription_changes
       WHERE client_id = $1
       AND change_type = 'new_medication'
       AND detected_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );

    if (parseInt(newMeds.rows[0].count) >= 3) {
      const factor = this.riskFactors.get('multiple_new_meds');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'multiple_new_meds',
          value: `${newMeds.rows[0].count} new medications`,
          numericValue: parseInt(newMeds.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    } else if (parseInt(newMeds.rows[0].count) > 0) {
      const factor = this.riskFactors.get('new_medication');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'new_medication',
          value: `${newMeds.rows[0].count} new medication(s)`,
          numericValue: parseInt(newMeds.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // Check for discontinued medications
    const discontinuedMeds = await db.query(
      `SELECT COUNT(*) as count FROM prescription_changes
       WHERE client_id = $1
       AND change_type = 'discontinued'
       AND detected_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );

    if (parseInt(discontinuedMeds.rows[0].count) > 0) {
      const factor = this.riskFactors.get('medication_discontinued');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'medication_discontinued',
          value: `${discontinuedMeds.rows[0].count} discontinued`,
          numericValue: parseInt(discontinuedMeds.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // Check for adherence gaps
    const adherenceGaps = await db.query(
      `SELECT COUNT(*) as count FROM prescription_changes
       WHERE client_id = $1
       AND change_type = 'adherence_gap'
       AND detected_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );

    if (parseInt(adherenceGaps.rows[0].count) > 0) {
      const factor = this.riskFactors.get('adherence_gap');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'adherence_gap',
          value: `${adherenceGaps.rows[0].count} gaps`,
          numericValue: parseInt(adherenceGaps.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // Check for prescriber changes
    const prescriberChanges = await db.query(
      `SELECT COUNT(*) as count FROM prescription_changes
       WHERE client_id = $1
       AND change_type = 'new_prescriber'
       AND detected_at > NOW() - INTERVAL '90 days'`,
      [clientId]
    );

    if (parseInt(prescriberChanges.rows[0].count) > 0) {
      const factor = this.riskFactors.get('prescriber_change');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'prescriber_change',
          value: `${prescriberChanges.rows[0].count} prescriber changes`,
          numericValue: parseInt(prescriberChanges.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // ========================================================================
    // PLAN FACTORS
    // ========================================================================

    // DSNP client check
    if (client.plan_type && client.plan_type.toLowerCase().includes('dsnp')) {
      const factor = this.riskFactors.get('dsnp_client');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'dsnp_client',
          value: client.plan_type,
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // First year with plan check
    if (client.effective_date) {
      const effectiveDate = new Date(client.effective_date);
      const monthsInPlan = (Date.now() - effectiveDate) / (1000 * 60 * 60 * 24 * 30);

      if (monthsInPlan <= 12) {
        const factor = this.riskFactors.get('first_year_plan');
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: 'first_year_plan',
            value: `${Math.floor(monthsInPlan)} months`,
            numericValue: monthsInPlan,
            points: factor.weight
          });
          totalScore += factor.weight;
        }
      }
    }

    // AEP timing check (October 15 - December 7)
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed
    const day = now.getDate();

    const inAep = (month === 10 && day >= 15) || month === 11 || (month === 12 && day <= 7);
    const nearAep = (month === 9) || (month === 10 && day < 15);

    if (inAep) {
      const factor = this.riskFactors.get('during_aep');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'during_aep',
          value: 'Currently in AEP',
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    } else if (nearAep) {
      const factor = this.riskFactors.get('approaching_aep');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'approaching_aep',
          value: 'AEP within 60 days',
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // ========================================================================
    // DEMOGRAPHIC FACTORS
    // ========================================================================

    // Age 65-67 (new to Medicare)
    if (client.age >= 65 && client.age <= 67) {
      const factor = this.riskFactors.get('age_65_67');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'age_65_67',
          value: `Age ${client.age}`,
          numericValue: client.age,
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // ========================================================================
    // HISTORICAL FACTORS
    // ========================================================================

    // Previous plan changes
    const previousChurns = await db.query(
      `SELECT COUNT(*) as count FROM churn_events WHERE client_id = $1`,
      [clientId]
    );

    if (parseInt(previousChurns.rows[0].count) >= 2) {
      const factor = this.riskFactors.get('multiple_plan_changes');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'multiple_plan_changes',
          value: `${previousChurns.rows[0].count} previous changes`,
          numericValue: parseInt(previousChurns.rows[0].count),
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    } else if (parseInt(previousChurns.rows[0].count) === 1) {
      const factor = this.riskFactors.get('previous_plan_change');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'previous_plan_change',
          value: '1 previous change',
          numericValue: 1,
          points: factor.weight
        });
        totalScore += factor.weight;
      }
    }

    // ========================================================================
    // NORMALIZE SCORE (0-100)
    // ========================================================================
    const normalizedScore = Math.min(100, Math.max(0, totalScore));

    return {
      clientId,
      rawScore: totalScore,
      normalizedScore,
      factors: detectedFactors
    };
  }

  /**
   * Update client's risk score and factors in database
   */
  async updateClientRisk(clientId, scoreResult) {
    const { normalizedScore, factors } = scoreResult;

    // Start transaction
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get previous score
      const prevScoreResult = await client.query(
        `SELECT risk_score FROM clients WHERE id = $1`,
        [clientId]
      );
      const previousScore = prevScoreResult.rows[0]?.risk_score || 0;

      // Update client's risk score
      await client.query(
        `UPDATE clients SET
          risk_score = $1,
          status = CASE
            WHEN $1 >= 60 THEN 'at_risk'
            WHEN status = 'at_risk' AND $1 < 40 THEN 'active'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [normalizedScore, clientId]
      );

      // Clear old risk factors
      await client.query(
        `DELETE FROM client_risk_factors WHERE client_id = $1`,
        [clientId]
      );

      // Insert new risk factors
      for (const factor of factors) {
        await client.query(
          `INSERT INTO client_risk_factors
           (client_id, risk_factor_id, factor_value, factor_numeric_value, points_contributed)
           VALUES ($1, $2, $3, $4, $5)`,
          [clientId, factor.factorId, factor.value, factor.numericValue || null, factor.points]
        );
      }

      // Record score history
      await client.query(
        `INSERT INTO risk_score_history
         (client_id, risk_score, previous_score, score_change, contributing_factors, scoring_method)
         VALUES ($1, $2, $3, $4, $5, 'rule_based')`,
        [
          clientId,
          normalizedScore,
          previousScore,
          normalizedScore - previousScore,
          JSON.stringify(factors.map(f => ({ code: f.code, points: f.points })))
        ]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Score all clients (for nightly job)
   */
  async scoreAllClients(options = {}) {
    const { batchSize = 100, onProgress } = options;

    if (!this.initialized) {
      await this.initialize();
    }

    // Get all active clients
    const clientsResult = await db.query(
      `SELECT id FROM clients WHERE status != 'churned' ORDER BY id`
    );

    const clients = clientsResult.rows;
    const totalClients = clients.length;

    console.log(`[risk-engine] Scoring ${totalClients} clients`);

    let processed = 0;
    let errors = 0;

    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);

      for (const client of batch) {
        try {
          const result = await this.scoreClient(client.id);
          await this.updateClientRisk(client.id, result);
          processed++;
        } catch (error) {
          console.error(`[risk-engine] Error scoring client ${client.id}:`, error.message);
          errors++;
        }
      }

      if (onProgress) {
        onProgress({
          processed,
          total: totalClients,
          errors,
          percentComplete: ((processed / totalClients) * 100).toFixed(1)
        });
      }
    }

    return {
      totalClients,
      processed,
      errors,
      success: processed - errors
    };
  }
}

// Export singleton instance
module.exports = new RiskScoringEngine();
