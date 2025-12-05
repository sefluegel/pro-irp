// backend/jobs/churn-prediction-engine.js
// Complete Medicare Advantage Churn Prediction Engine
// Implements the full PRO IRP Churn Prediction Model Specification

const db = require('../db');

// ============================================================================
// CONSTANTS FROM SPECIFICATION
// ============================================================================

const CATEGORY_WEIGHTS = {
  engagement: 0.40,
  utilization: 0.22,
  benefit_fit: 0.18,
  life_event: 0.08,
  external: 0.12
};

const RISK_CATEGORIES = [
  { min: 0, max: 19, name: 'Stable', color: '#166534', badge: 'Loyal', action: 'Quarterly touch' },
  { min: 20, max: 34, name: 'Low', color: '#22c55e', badge: 'Good', action: 'Monitor' },
  { min: 35, max: 49, name: 'Medium', color: '#eab308', badge: 'Watch', action: 'Outreach within 14 days' },
  { min: 50, max: 64, name: 'Elevated', color: '#f97316', badge: 'Attention', action: 'Outreach within 7 days' },
  { min: 65, max: 79, name: 'High', color: '#ef4444', badge: 'Priority', action: 'Outreach within 48 hours' },
  { min: 80, max: 89, name: 'Critical', color: '#dc2626', badge: 'Urgent', action: 'Same-day outreach' },
  { min: 90, max: 100, name: 'Severe', color: '#7f1d1d', badge: 'Emergency', action: 'Call immediately' }
];

const CONTACT_CREDITS = {
  // Meaningful Contact (100% Credit)
  benefits_review_call: 1.0,
  problem_resolution_call: 1.0,
  life_event_discussion: 1.0,
  aep_oep_checkin_call: 1.0,
  in_person_meeting: 1.0,
  scheduled_video: 1.0,

  // Light Touch (50% Credit)
  quick_checkin_call: 0.5,
  text_conversation: 0.5,
  personalized_email: 0.5,

  // Automated (20% Credit)
  birthday_message: 0.2,
  holiday_message: 0.2,
  newsletter: 0.2,
  reminder_text: 0.2
};

const RECENCY_MODIFIERS = [
  { minDays: 0, maxDays: 30, multiplier: 1.5 },
  { minDays: 31, maxDays: 60, multiplier: 1.25 },
  { minDays: 61, maxDays: 90, multiplier: 1.0 },
  { minDays: 91, maxDays: 999999, multiplier: 0.5 }
];

const FOLLOWUP_CREDITS = {
  within_7_days: 0.50, // -50% points
  within_14_days: 0.30,
  within_30_days: 0.15,
  never: 0,
  client_resolved: 0.60
};

// ============================================================================
// CHURN PREDICTION ENGINE CLASS
// ============================================================================

class ChurnPredictionEngine {
  constructor() {
    this.riskFactors = new Map();
    this.temporalModifiers = [];
    this.initialized = false;
  }

  /**
   * Initialize engine with risk factors and modifiers from database
   */
  async initialize() {
    // Load risk factors
    const factors = await db.query(`
      SELECT id, factor_code, factor_name, factor_category, category_weight,
             sub_category, base_weight, max_weight, ml_weight,
             recency_applicable, auto_100_trigger, minimum_score_override
      FROM risk_factors
      WHERE is_active = true
    `);

    for (const factor of factors.rows) {
      this.riskFactors.set(factor.factor_code, {
        id: factor.id,
        code: factor.factor_code,
        name: factor.factor_name,
        category: factor.factor_category,
        categoryWeight: parseFloat(factor.category_weight) || CATEGORY_WEIGHTS[factor.factor_category] || 0.1,
        subCategory: factor.sub_category,
        baseWeight: factor.base_weight,
        maxWeight: factor.max_weight,
        weight: factor.ml_weight || factor.base_weight,
        recencyApplicable: factor.recency_applicable,
        auto100Trigger: factor.auto_100_trigger,
        minimumScoreOverride: factor.minimum_score_override
      });
    }

    // Load temporal modifiers
    const modifiers = await db.query(`
      SELECT * FROM temporal_modifiers WHERE is_active = true
    `);
    this.temporalModifiers = modifiers.rows;

    this.initialized = true;
    console.log(`[churn-engine] Loaded ${this.riskFactors.size} risk factors and ${this.temporalModifiers.length} temporal modifiers`);
  }

  /**
   * Get risk category for a score
   */
  getRiskCategory(score) {
    for (const category of RISK_CATEGORIES) {
      if (score >= category.min && score <= category.max) {
        return category;
      }
    }
    return RISK_CATEGORIES[0];
  }

  /**
   * Calculate engagement score (40% weight)
   */
  async calculateEngagementScore(clientId, clientData) {
    const detectedFactors = [];
    let categoryScore = 0;
    const maxCategoryScore = 100;

    // 1. Days Since Meaningful Contact
    const meaningfulContact = await db.query(`
      SELECT MAX(contact_date) as last_meaningful_contact
      FROM client_contacts
      WHERE client_id = $1 AND contact_credit = 1.0
    `, [clientId]);

    let daysSinceMeaningful = 999;
    if (meaningfulContact.rows[0]?.last_meaningful_contact) {
      const lastContact = new Date(meaningfulContact.rows[0].last_meaningful_contact);
      daysSinceMeaningful = Math.floor((Date.now() - lastContact) / (1000 * 60 * 60 * 24));
    } else if (clientData.last_contact_date) {
      // Fallback to client table
      const lastContact = new Date(clientData.last_contact_date);
      daysSinceMeaningful = Math.floor((Date.now() - lastContact) / (1000 * 60 * 60 * 24));
    }

    // Apply contact days factor
    const contactFactors = [
      { code: 'days_no_contact_0_30', min: 0, max: 30, points: 0 },
      { code: 'days_no_contact_31_60', min: 31, max: 60, points: 3 },
      { code: 'days_no_contact_61_90', min: 61, max: 90, points: 8 },
      { code: 'days_no_contact_91_120', min: 91, max: 120, points: 18 },
      { code: 'days_no_contact_121_150', min: 121, max: 150, points: 28 },
      { code: 'days_no_contact_151_180', min: 151, max: 180, points: 38 },
      { code: 'days_no_contact_180_plus', min: 181, max: 999999, points: 48 }
    ];

    for (const cf of contactFactors) {
      if (daysSinceMeaningful >= cf.min && daysSinceMeaningful <= cf.max) {
        const factor = this.riskFactors.get(cf.code);
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: cf.code,
            name: factor.name,
            category: 'engagement',
            value: `${daysSinceMeaningful} days`,
            numericValue: daysSinceMeaningful,
            points: cf.points
          });
          categoryScore += cf.points;
        }
        break;
      }
    }

    // 2. Phone Pickup Ratio
    const phoneStats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE outcome IN ('answered', 'completed')) as answered,
        COUNT(*) as total
      FROM client_contacts
      WHERE client_id = $1
      AND contact_type IN ('benefits_review_call', 'problem_resolution_call', 'quick_checkin_call',
                           'life_event_discussion', 'aep_oep_checkin_call')
      AND contact_date > NOW() - INTERVAL '90 days'
    `, [clientId]);

    if (phoneStats.rows[0]?.total > 0) {
      const pickupRate = (phoneStats.rows[0].answered / phoneStats.rows[0].total) * 100;
      const pickupFactors = [
        { code: 'phone_pickup_70_100', min: 70, max: 100, points: 0 },
        { code: 'phone_pickup_50_69', min: 50, max: 69, points: 6 },
        { code: 'phone_pickup_30_49', min: 30, max: 49, points: 15 },
        { code: 'phone_pickup_10_29', min: 10, max: 29, points: 28 },
        { code: 'phone_pickup_0_9', min: 0, max: 9, points: 40 }
      ];

      for (const pf of pickupFactors) {
        if (pickupRate >= pf.min && pickupRate <= pf.max) {
          const factor = this.riskFactors.get(pf.code);
          if (factor && pf.points > 0) {
            detectedFactors.push({
              factorId: factor.id,
              code: pf.code,
              name: factor.name,
              category: 'engagement',
              value: `${pickupRate.toFixed(0)}%`,
              numericValue: pickupRate,
              points: pf.points
            });
            categoryScore += pf.points;
          }
          break;
        }
      }
    }

    // 3. Text Response Ratio
    const textStats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE outcome = 'responded') as responded,
        COUNT(*) as total
      FROM client_contacts
      WHERE client_id = $1
      AND contact_type IN ('text_conversation', 'reminder_text')
      AND contact_date > NOW() - INTERVAL '90 days'
    `, [clientId]);

    if (textStats.rows[0]?.total > 0) {
      const responseRate = (textStats.rows[0].responded / textStats.rows[0].total) * 100;
      const textFactors = [
        { code: 'text_response_70_100', min: 70, max: 100, points: 0 },
        { code: 'text_response_50_69', min: 50, max: 69, points: 4 },
        { code: 'text_response_30_49', min: 30, max: 49, points: 10 },
        { code: 'text_response_10_29', min: 10, max: 29, points: 18 },
        { code: 'text_response_0_9', min: 0, max: 9, points: 25 }
      ];

      for (const tf of textFactors) {
        if (responseRate >= tf.min && responseRate <= tf.max) {
          const factor = this.riskFactors.get(tf.code);
          if (factor && tf.points > 0) {
            detectedFactors.push({
              factorId: factor.id,
              code: tf.code,
              name: factor.name,
              category: 'engagement',
              value: `${responseRate.toFixed(0)}%`,
              numericValue: responseRate,
              points: tf.points
            });
            categoryScore += tf.points;
          }
          break;
        }
      }
    }

    // 4. New Client Checkpoints (if client < 90 days)
    if (clientData.effective_date) {
      const effectiveDate = new Date(clientData.effective_date);
      const daysSinceEffective = Math.floor((Date.now() - effectiveDate) / (1000 * 60 * 60 * 24));

      if (daysSinceEffective <= 120) {
        const checkpoints = await db.query(`
          SELECT
            MAX(CASE WHEN is_day_7_welcome THEN 1 ELSE 0 END) as has_day_7,
            MAX(CASE WHEN is_day_30_checkin THEN 1 ELSE 0 END) as has_day_30,
            MAX(CASE WHEN is_day_60_checkin THEN 1 ELSE 0 END) as has_day_60,
            MAX(CASE WHEN is_day_90_review THEN 1 ELSE 0 END) as has_day_90
          FROM client_contacts
          WHERE client_id = $1
        `, [clientId]);

        const cp = checkpoints.rows[0];

        if (daysSinceEffective >= 7 && !cp?.has_day_7) {
          const factor = this.riskFactors.get('missed_day_7_welcome');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'missed_day_7_welcome',
              name: factor.name,
              category: 'engagement',
              value: 'Missed',
              points: 15
            });
            categoryScore += 15;
          }
        }

        if (daysSinceEffective >= 30 && !cp?.has_day_30) {
          const factor = this.riskFactors.get('missed_day_30_checkin');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'missed_day_30_checkin',
              name: factor.name,
              category: 'engagement',
              value: 'Missed',
              points: 12
            });
            categoryScore += 12;
          }
        }

        if (daysSinceEffective >= 60 && !cp?.has_day_60) {
          const factor = this.riskFactors.get('missed_day_60_checkin');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'missed_day_60_checkin',
              name: factor.name,
              category: 'engagement',
              value: 'Missed',
              points: 10
            });
            categoryScore += 10;
          }
        }

        if (daysSinceEffective >= 90 && !cp?.has_day_90) {
          const factor = this.riskFactors.get('missed_day_90_review');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'missed_day_90_review',
              name: factor.name,
              category: 'engagement',
              value: 'Missed',
              points: 15
            });
            categoryScore += 15;
          }
        }
      }
    }

    // 5. Annual Review Check
    const annualReview = await db.query(`
      SELECT MAX(contact_date) as last_annual
      FROM client_contacts
      WHERE client_id = $1 AND is_annual_review = true
    `, [clientId]);

    if (annualReview.rows[0]?.last_annual) {
      const lastAnnual = new Date(annualReview.rows[0].last_annual);
      const monthsSinceAnnual = (Date.now() - lastAnnual) / (1000 * 60 * 60 * 24 * 30);

      if (monthsSinceAnnual > 11) {
        const factor = this.riskFactors.get('annual_review_overdue');
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: 'annual_review_overdue',
            name: factor.name,
            category: 'engagement',
            value: `${Math.floor(monthsSinceAnnual)} months`,
            numericValue: monthsSinceAnnual,
            points: 20
          });
          categoryScore += 20;
        }
      }
    }

    // Cap at max and normalize
    const normalizedScore = Math.min(categoryScore, maxCategoryScore);

    return {
      rawScore: categoryScore,
      normalizedScore,
      weightedScore: normalizedScore * CATEGORY_WEIGHTS.engagement,
      factors: detectedFactors
    };
  }

  /**
   * Calculate utilization score (22% weight)
   */
  async calculateUtilizationScore(clientId, clientData) {
    const detectedFactors = [];
    let categoryScore = 0;
    const maxCategoryScore = 100;

    // Check Blue Button authorization
    const bbAuth = await db.query(`
      SELECT status FROM blue_button_authorizations
      WHERE client_id = $1 AND status = 'active'
    `, [clientId]);

    if (bbAuth.rows.length === 0) {
      // No Blue Button data - return baseline
      return {
        rawScore: 0,
        normalizedScore: 0,
        weightedScore: 0,
        factors: [],
        limitedData: true
      };
    }

    // Get prescription changes for risk factors
    const rxChanges = await db.query(`
      SELECT change_type, drug_name, detected_at, risk_weight, reviewed_at
      FROM prescription_changes
      WHERE client_id = $1
      AND detected_at > NOW() - INTERVAL '12 months'
      ORDER BY detected_at DESC
    `, [clientId]);

    // Process each change type with recency modifiers
    const changeTypeCounts = {};
    for (const change of rxChanges.rows) {
      if (!changeTypeCounts[change.change_type]) {
        changeTypeCounts[change.change_type] = {
          count: 0,
          items: [],
          latestDate: change.detected_at,
          reviewed: false
        };
      }
      changeTypeCounts[change.change_type].count++;
      changeTypeCounts[change.change_type].items.push(change.drug_name);
      if (change.reviewed_at) {
        changeTypeCounts[change.change_type].reviewed = true;
      }
    }

    // Map prescription changes to utilization factors
    const rxFactorMappings = [
      { changeType: 'specialty_drug_added', factorCode: 'primary_maintenance_not_covered', points: 30 },
      { changeType: 'new_medication', factorCode: 'rx_not_covered_first', points: 12, repeatCode: 'rx_not_covered_repeat', repeatPoints: 20 },
      { changeType: 'adherence_gap', factorCode: 'adherence_mpr_below_80', points: 12 },
      { changeType: 'new_prescriber', factorCode: 'prior_auth_required_new', points: 8 }
    ];

    for (const mapping of rxFactorMappings) {
      const changeData = changeTypeCounts[mapping.changeType];
      if (changeData) {
        let factorCode = mapping.factorCode;
        let points = mapping.points;

        // Check for repeat occurrences
        if (changeData.count >= 2 && mapping.repeatCode) {
          factorCode = mapping.repeatCode;
          points = mapping.repeatPoints;
        }

        const factor = this.riskFactors.get(factorCode);
        if (factor) {
          // Apply recency modifier
          let recencyMod = 1.0;
          if (changeData.latestDate) {
            const daysAgo = Math.floor((Date.now() - new Date(changeData.latestDate)) / (1000 * 60 * 60 * 24));
            for (const rm of RECENCY_MODIFIERS) {
              if (daysAgo >= rm.minDays && daysAgo <= rm.maxDays) {
                recencyMod = rm.multiplier;
                break;
              }
            }
          }

          // Apply follow-up credit if reviewed
          let followupCredit = 1.0;
          if (changeData.reviewed) {
            followupCredit = 1 - FOLLOWUP_CREDITS.within_7_days;
          }

          const adjustedPoints = Math.round(points * recencyMod * followupCredit);

          if (adjustedPoints > 0) {
            detectedFactors.push({
              factorId: factor.id,
              code: factorCode,
              name: factor.name,
              category: 'utilization',
              value: `${changeData.count} occurrence(s)`,
              numericValue: changeData.count,
              points: adjustedPoints,
              recencyModifier: recencyMod,
              reviewed: changeData.reviewed
            });
            categoryScore += adjustedPoints;
          }
        }
      }
    }

    // Check claims for cost exposure
    const costExposure = await db.query(`
      SELECT
        SUM(patient_pay_cents) as total_oop,
        MAX(patient_pay_cents) as max_single_service
      FROM prescription_claims
      WHERE client_id = $1
      AND fill_date > NOW() - INTERVAL '12 months'
    `, [clientId]);

    if (costExposure.rows[0]) {
      const totalOOP = (costExposure.rows[0].total_oop || 0) / 100;
      const maxSingle = (costExposure.rows[0].max_single_service || 0) / 100;

      // Check for high single service costs
      if (maxSingle > 1000) {
        const factor = this.riskFactors.get('single_service_1000_oop');
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: 'single_service_1000_oop',
            name: factor.name,
            category: 'utilization',
            value: `$${maxSingle.toFixed(2)}`,
            numericValue: maxSingle,
            points: 25
          });
          categoryScore += 25;
        }
      } else if (maxSingle > 500) {
        const factor = this.riskFactors.get('single_service_500_oop');
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: 'single_service_500_oop',
            name: factor.name,
            category: 'utilization',
            value: `$${maxSingle.toFixed(2)}`,
            numericValue: maxSingle,
            points: 15
          });
          categoryScore += 15;
        }
      }
    }

    const normalizedScore = Math.min(categoryScore, maxCategoryScore);

    return {
      rawScore: categoryScore,
      normalizedScore,
      weightedScore: normalizedScore * CATEGORY_WEIGHTS.utilization,
      factors: detectedFactors
    };
  }

  /**
   * Calculate benefit fit score (18% weight)
   */
  async calculateBenefitFitScore(clientId, clientData) {
    const detectedFactors = [];
    let categoryScore = 0;
    const maxCategoryScore = 100;

    // Check for drug coverage issues
    const drugIssues = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE change_type = 'discontinued' AND drug_name ILIKE '%maintenance%') as maintenance_issues,
        COUNT(*) FILTER (WHERE change_type IN ('new_medication', 'discontinued')) as total_issues
      FROM prescription_changes
      WHERE client_id = $1
      AND detected_at > NOW() - INTERVAL '90 days'
    `, [clientId]);

    if (drugIssues.rows[0]?.total_issues >= 2) {
      const factor = this.riskFactors.get('drug_not_formulary_2_plus');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'drug_not_formulary_2_plus',
          name: factor.name,
          category: 'benefit_fit',
          value: `${drugIssues.rows[0].total_issues} drugs`,
          numericValue: drugIssues.rows[0].total_issues,
          points: 25
        });
        categoryScore += 25;
      }
    } else if (drugIssues.rows[0]?.total_issues === 1) {
      const factor = this.riskFactors.get('drug_not_formulary_1');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'drug_not_formulary_1',
          name: factor.name,
          category: 'benefit_fit',
          value: '1 drug',
          numericValue: 1,
          points: 12
        });
        categoryScore += 12;
      }
    }

    // Check for high-tier drugs
    const highTierDrugs = await db.query(`
      SELECT COUNT(DISTINCT drug_name) as count
      FROM prescription_claims
      WHERE client_id = $1
      AND drug_tier IN ('4', '5', 'specialty')
      AND fill_date > NOW() - INTERVAL '90 days'
    `, [clientId]);

    if (highTierDrugs.rows[0]?.count > 0) {
      const factor = this.riskFactors.get('drug_tier_4_5');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'drug_tier_4_5',
          name: factor.name,
          category: 'benefit_fit',
          value: `${highTierDrugs.rows[0].count} specialty drugs`,
          numericValue: highTierDrugs.rows[0].count,
          points: 10 * Math.min(highTierDrugs.rows[0].count, 3)
        });
        categoryScore += 10 * Math.min(highTierDrugs.rows[0].count, 3);
      }
    }

    const normalizedScore = Math.min(categoryScore, maxCategoryScore);

    return {
      rawScore: categoryScore,
      normalizedScore,
      weightedScore: normalizedScore * CATEGORY_WEIGHTS.benefit_fit,
      factors: detectedFactors
    };
  }

  /**
   * Calculate life events score (8% weight) - includes Auto-100 triggers
   */
  async calculateLifeEventsScore(clientId, clientData) {
    const detectedFactors = [];
    let categoryScore = 0;
    const maxCategoryScore = 100;
    let hasAuto100Trigger = false;
    let auto100Reason = null;

    // Check for active SEP status
    const sepStatus = await db.query(`
      SELECT sep_type, sep_trigger_event,
             CASE WHEN sep_end_date >= CURRENT_DATE
                  THEN sep_end_date - CURRENT_DATE
                  ELSE 0 END as days_remaining,
             status
      FROM client_sep_status
      WHERE client_id = $1 AND status = 'active'
    `, [clientId]);

    for (const sep of sepStatus.rows) {
      hasAuto100Trigger = true;
      auto100Reason = sep.sep_trigger_event;

      // Map SEP type to factor
      const sepFactorMap = {
        'lis_change': 'lis_status_change',
        'medicaid_change': 'medicaid_status_change',
        'relocation': 'moved_out_service_area',
        'address_change': 'address_change_new_county'
      };

      const factorCode = sepFactorMap[sep.sep_type] || 'address_change_new_county';
      const factor = this.riskFactors.get(factorCode);

      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: factorCode,
          name: factor.name,
          category: 'life_event',
          value: `SEP Active - ${sep.days_remaining} days remaining`,
          numericValue: 100,
          points: 100,
          isAuto100: factor.auto_100_trigger
        });
        categoryScore = 100;
      }
    }

    // Check Blue Button for LIS status changes
    const lisCheck = await db.query(`
      SELECT lis_level
      FROM prescription_claims
      WHERE client_id = $1
      ORDER BY fill_date DESC
      LIMIT 1
    `, [clientId]);

    // Check for nursing home / SNF claims
    const snfCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM prescription_claims
      WHERE client_id = $1
      AND pharmacy_type = 'long_term_care'
      AND fill_date > NOW() - INTERVAL '30 days'
    `, [clientId]);

    if (snfCheck.rows[0]?.count > 0 && !hasAuto100Trigger) {
      hasAuto100Trigger = true;
      auto100Reason = 'Nursing home admission detected';

      const factor = this.riskFactors.get('nursing_home_admission');
      if (factor) {
        detectedFactors.push({
          factorId: factor.id,
          code: 'nursing_home_admission',
          name: factor.name,
          category: 'life_event',
          value: 'LTC pharmacy detected',
          numericValue: 100,
          points: 100,
          isAuto100: true
        });
        categoryScore = 100;
      }
    }

    const normalizedScore = Math.min(categoryScore, maxCategoryScore);

    return {
      rawScore: categoryScore,
      normalizedScore,
      weightedScore: hasAuto100Trigger ? 100 : normalizedScore * CATEGORY_WEIGHTS.life_event,
      factors: detectedFactors,
      hasAuto100Trigger,
      auto100Reason
    };
  }

  /**
   * Calculate external risk score (12% weight)
   */
  async calculateExternalRiskScore(clientId, clientData) {
    const detectedFactors = [];
    let categoryScore = 0;
    const maxCategoryScore = 100;

    // Get ZIP demographics
    const zipData = await db.query(`
      SELECT is_high_senior_zip, is_low_income_zip
      FROM zip_demographics
      WHERE zip_code = $1
      ORDER BY data_year DESC
      LIMIT 1
    `, [clientData.zip]);

    if (zipData.rows[0]) {
      if (zipData.rows[0].is_high_senior_zip) {
        const factor = this.riskFactors.get('high_senior_zip');
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: 'high_senior_zip',
            name: factor.name,
            category: 'external',
            value: 'High senior population',
            points: 10
          });
          categoryScore += 10;
        }
      }

      if (zipData.rows[0].is_low_income_zip) {
        const factor = this.riskFactors.get('low_income_zip');
        if (factor) {
          detectedFactors.push({
            factorId: factor.id,
            code: 'low_income_zip',
            name: factor.name,
            category: 'external',
            value: 'Low income area',
            points: 12
          });
          categoryScore += 12;
        }
      }
    }

    // Get county competition data
    const countyCode = clientData.county_fips || clientData.zip?.substring(0, 3);
    if (countyCode) {
      const competition = await db.query(`
        SELECT total_plans, new_plans_this_year, zero_premium_plans, plans_with_high_stars
        FROM county_competition
        WHERE county_fips LIKE $1 || '%'
        ORDER BY data_year DESC
        LIMIT 1
      `, [countyCode]);

      if (competition.rows[0]) {
        const comp = competition.rows[0];

        // Plan competition level
        if (comp.total_plans >= 11) {
          const factor = this.riskFactors.get('plans_in_county_11_plus');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'plans_in_county_11_plus',
              name: factor.name,
              category: 'external',
              value: `${comp.total_plans} plans`,
              numericValue: comp.total_plans,
              points: 20
            });
            categoryScore += 20;
          }
        } else if (comp.total_plans >= 7) {
          const factor = this.riskFactors.get('plans_in_county_7_10');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'plans_in_county_7_10',
              name: factor.name,
              category: 'external',
              value: `${comp.total_plans} plans`,
              numericValue: comp.total_plans,
              points: 12
            });
            categoryScore += 12;
          }
        }

        // Zero premium availability
        if (comp.zero_premium_plans > 0) {
          const factor = this.riskFactors.get('zero_premium_available');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'zero_premium_available',
              name: factor.name,
              category: 'external',
              value: `${comp.zero_premium_plans} $0 plans`,
              numericValue: comp.zero_premium_plans,
              points: 15
            });
            categoryScore += 15;
          }
        }

        // High star competitors
        if (comp.plans_with_high_stars > 0) {
          const factor = this.riskFactors.get('high_star_competitor');
          if (factor) {
            detectedFactors.push({
              factorId: factor.id,
              code: 'high_star_competitor',
              name: factor.name,
              category: 'external',
              value: `${comp.plans_with_high_stars} high-rated plans`,
              numericValue: comp.plans_with_high_stars,
              points: 12
            });
            categoryScore += 12;
          }
        }
      }
    }

    // Add baseline solicitation (all clients get this)
    const baselineFactor = this.riskFactors.get('baseline_solicitation');
    if (baselineFactor) {
      detectedFactors.push({
        factorId: baselineFactor.id,
        code: 'baseline_solicitation',
        name: baselineFactor.name,
        category: 'external',
        value: 'Assumes daily competitor marketing',
        points: 10
      });
      categoryScore += 10;
    }

    const normalizedScore = Math.min(categoryScore, maxCategoryScore);

    return {
      rawScore: categoryScore,
      normalizedScore,
      weightedScore: normalizedScore * CATEGORY_WEIGHTS.external,
      factors: detectedFactors
    };
  }

  /**
   * Apply temporal modifiers
   */
  applyTemporalModifiers(baseScore, clientData) {
    let additionalPoints = 0;
    let tenureMultiplier = 1.0;
    const appliedModifiers = [];

    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Apply enrollment period modifiers
    for (const mod of this.temporalModifiers) {
      if (mod.modifier_category === 'enrollment_period') {
        const inPeriod = this.isDateInRange(month, day, mod.start_month, mod.start_day, mod.end_month, mod.end_day);
        if (inPeriod && mod.points_adjustment > 0) {
          additionalPoints += mod.points_adjustment;
          appliedModifiers.push({
            code: mod.modifier_code,
            name: mod.modifier_name,
            points: mod.points_adjustment
          });
        }
      }
    }

    // Apply new client or tenure modifiers
    if (clientData.effective_date) {
      const effectiveDate = new Date(clientData.effective_date);
      const monthsSinceEffective = Math.floor((Date.now() - effectiveDate) / (1000 * 60 * 60 * 24 * 30));

      for (const mod of this.temporalModifiers) {
        if (mod.modifier_category === 'new_client' &&
            monthsSinceEffective >= mod.months_since_effective_min &&
            monthsSinceEffective <= mod.months_since_effective_max) {
          additionalPoints += mod.points_adjustment;
          appliedModifiers.push({
            code: mod.modifier_code,
            name: mod.modifier_name,
            points: mod.points_adjustment
          });
        }

        if (mod.modifier_category === 'tenure' &&
            monthsSinceEffective >= mod.months_since_effective_min &&
            monthsSinceEffective <= mod.months_since_effective_max &&
            mod.score_multiplier) {
          tenureMultiplier = parseFloat(mod.score_multiplier);
          appliedModifiers.push({
            code: mod.modifier_code,
            name: mod.modifier_name,
            multiplier: tenureMultiplier
          });
        }
      }

      // Check for first OEP after AEP enrollment
      if (monthsSinceEffective >= 2 && monthsSinceEffective <= 6) {
        // Check if currently in OEP (Jan-Mar)
        if (month >= 1 && month <= 3) {
          // This is their first OEP - check checkpoint completion
          // This would need additional logic based on actual checkpoint data
        }
      }
    }

    // Calculate final score
    let adjustedScore = (baseScore + additionalPoints) * tenureMultiplier;
    adjustedScore = Math.min(100, Math.max(0, adjustedScore));

    return {
      originalScore: baseScore,
      additionalPoints,
      tenureMultiplier,
      finalScore: Math.round(adjustedScore),
      appliedModifiers
    };
  }

  isDateInRange(month, day, startMonth, startDay, endMonth, endDay) {
    if (!startMonth || !endMonth) return false;

    const currentDate = month * 100 + day;
    const startDate = startMonth * 100 + startDay;
    const endDate = endMonth * 100 + endDay;

    if (startDate <= endDate) {
      return currentDate >= startDate && currentDate <= endDate;
    } else {
      // Wraps around year end (e.g., Nov-Jan)
      return currentDate >= startDate || currentDate <= endDate;
    }
  }

  /**
   * Score a single client - main entry point
   */
  async scoreClient(clientId) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Get client data
    const clientResult = await db.query(`
      SELECT
        c.*,
        EXTRACT(YEAR FROM AGE(c.dob)) as age
      FROM clients c
      WHERE c.id = $1
    `, [clientId]);

    if (clientResult.rows.length === 0) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const clientData = clientResult.rows[0];

    // Calculate all category scores in parallel
    const [engagement, utilization, benefitFit, lifeEvents, external] = await Promise.all([
      this.calculateEngagementScore(clientId, clientData),
      this.calculateUtilizationScore(clientId, clientData),
      this.calculateBenefitFitScore(clientId, clientData),
      this.calculateLifeEventsScore(clientId, clientData),
      this.calculateExternalRiskScore(clientId, clientData)
    ]);

    // Check for Auto-100 trigger
    if (lifeEvents.hasAuto100Trigger) {
      return {
        clientId,
        finalScore: 100,
        isAuto100: true,
        auto100Reason: lifeEvents.auto100Reason,
        categoryScores: {
          engagement: { ...engagement, overridden: true },
          utilization: { ...utilization, overridden: true },
          benefitFit: { ...benefitFit, overridden: true },
          lifeEvents: { ...lifeEvents },
          external: { ...external, overridden: true }
        },
        allFactors: [
          ...engagement.factors,
          ...utilization.factors,
          ...benefitFit.factors,
          ...lifeEvents.factors,
          ...external.factors
        ],
        riskCategory: this.getRiskCategory(100),
        limitedData: utilization.limitedData
      };
    }

    // Calculate base score from weighted categories
    const baseScore =
      engagement.weightedScore +
      utilization.weightedScore +
      benefitFit.weightedScore +
      lifeEvents.weightedScore +
      external.weightedScore;

    // Apply temporal modifiers
    const temporalResult = this.applyTemporalModifiers(baseScore, clientData);

    const finalScore = temporalResult.finalScore;
    const riskCategory = this.getRiskCategory(finalScore);

    return {
      clientId,
      finalScore,
      isAuto100: false,
      baseScore: Math.round(baseScore),
      temporalAdjustments: temporalResult,
      categoryScores: {
        engagement,
        utilization,
        benefitFit,
        lifeEvents,
        external
      },
      allFactors: [
        ...engagement.factors,
        ...utilization.factors,
        ...benefitFit.factors,
        ...lifeEvents.factors,
        ...external.factors
      ],
      riskCategory,
      limitedData: utilization.limitedData
    };
  }

  /**
   * Update client's risk data in database
   */
  async updateClientRisk(clientId, scoreResult) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Get previous score
      const prevScore = await client.query(
        `SELECT risk_score FROM clients WHERE id = $1`,
        [clientId]
      );
      const previousScore = prevScore.rows[0]?.risk_score || 0;

      // Determine status based on score
      let newStatus = 'active';
      if (scoreResult.finalScore >= 80) {
        newStatus = 'at_risk';
      }

      // Update client risk score
      await client.query(`
        UPDATE clients SET
          risk_score = $1,
          status = CASE
            WHEN status = 'churned' THEN status
            ELSE $2
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [scoreResult.finalScore, newStatus, clientId]);

      // Clear old risk factors
      await client.query(
        `DELETE FROM client_risk_factors WHERE client_id = $1`,
        [clientId]
      );

      // Insert new risk factors
      for (const factor of scoreResult.allFactors) {
        await client.query(`
          INSERT INTO client_risk_factors
          (client_id, risk_factor_id, factor_value, factor_numeric_value, points_contributed)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          clientId,
          factor.factorId,
          factor.value,
          factor.numericValue || null,
          factor.points
        ]);
      }

      // Record score history
      await client.query(`
        INSERT INTO risk_score_history
        (client_id, risk_score, previous_score, score_change, contributing_factors, scoring_method)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        clientId,
        scoreResult.finalScore,
        previousScore,
        scoreResult.finalScore - previousScore,
        JSON.stringify({
          isAuto100: scoreResult.isAuto100,
          auto100Reason: scoreResult.auto100Reason,
          categoryScores: {
            engagement: scoreResult.categoryScores.engagement.normalizedScore,
            utilization: scoreResult.categoryScores.utilization.normalizedScore,
            benefitFit: scoreResult.categoryScores.benefitFit.normalizedScore,
            lifeEvents: scoreResult.categoryScores.lifeEvents.normalizedScore,
            external: scoreResult.categoryScores.external.normalizedScore
          },
          temporalAdjustments: scoreResult.temporalAdjustments?.appliedModifiers,
          factors: scoreResult.allFactors.map(f => ({
            code: f.code,
            points: f.points
          }))
        }),
        scoreResult.isAuto100 ? 'auto_100_trigger' : 'churn_prediction_v1'
      ]);

      // Create alerts for significant changes
      const scoreChange = scoreResult.finalScore - previousScore;

      if (scoreResult.finalScore >= 90 || scoreResult.isAuto100) {
        // Emergency alert
        await this.createAlert(client, clientId, 'emergency', scoreResult);
      } else if (scoreResult.finalScore >= 80) {
        // Urgent alert
        await this.createAlert(client, clientId, 'urgent', scoreResult);
      } else if (scoreChange >= 20) {
        // Warning - big spike
        await this.createAlert(client, clientId, 'warning', scoreResult, scoreChange);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create risk alert
   */
  async createAlert(client, clientId, alertType, scoreResult, scoreChange = null) {
    // Get client owner
    const ownerResult = await client.query(
      `SELECT owner_id FROM clients WHERE id = $1`,
      [clientId]
    );

    if (!ownerResult.rows[0]?.owner_id) return;

    const userId = ownerResult.rows[0].owner_id;

    let alertCode, alertTitle, alertMessage, responseHours;

    if (scoreResult.isAuto100) {
      alertCode = 'auto_100_trigger';
      alertTitle = 'AUTO-CRITICAL: Immediate Action Required';
      alertMessage = scoreResult.auto100Reason;
      responseHours = 24;
    } else if (alertType === 'emergency') {
      alertCode = 'score_90_plus';
      alertTitle = 'EMERGENCY: Score 90+';
      alertMessage = `Client risk score is ${scoreResult.finalScore}. Call immediately.`;
      responseHours = 24;
    } else if (alertType === 'urgent') {
      alertCode = 'score_80_89';
      alertTitle = 'URGENT: Critical Risk Level';
      alertMessage = `Client risk score is ${scoreResult.finalScore}. Same-day outreach required.`;
      responseHours = 24;
    } else if (alertType === 'warning') {
      alertCode = 'score_spike';
      alertTitle = `WARNING: Score Increased by ${scoreChange}`;
      alertMessage = `Risk score spiked from ${scoreResult.finalScore - scoreChange} to ${scoreResult.finalScore}. Investigate urgently.`;
      responseHours = 48;
    }

    const responseDue = new Date();
    responseDue.setHours(responseDue.getHours() + responseHours);

    await client.query(`
      INSERT INTO risk_alerts
      (client_id, user_id, alert_type, alert_code, alert_title, alert_message,
       response_window_hours, response_due_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      clientId, userId, alertType, alertCode, alertTitle, alertMessage,
      responseHours, responseDue
    ]);
  }

  /**
   * Score all clients (nightly batch)
   */
  async scoreAllClients(options = {}) {
    const { batchSize = 100, onProgress } = options;

    if (!this.initialized) {
      await this.initialize();
    }

    const clientsResult = await db.query(`
      SELECT id FROM clients
      WHERE status != 'churned'
      ORDER BY id
    `);

    const clients = clientsResult.rows;
    const totalClients = clients.length;

    console.log(`[churn-engine] Scoring ${totalClients} clients`);

    let processed = 0;
    let errors = 0;
    const startTime = Date.now();

    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);

      await Promise.all(batch.map(async (client) => {
        try {
          const result = await this.scoreClient(client.id);
          await this.updateClientRisk(client.id, result);
          processed++;
        } catch (error) {
          console.error(`[churn-engine] Error scoring client ${client.id}:`, error.message);
          errors++;
        }
      }));

      if (onProgress) {
        onProgress({
          processed,
          total: totalClients,
          errors,
          percentComplete: ((processed / totalClients) * 100).toFixed(1),
          elapsedMs: Date.now() - startTime
        });
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log(`[churn-engine] Complete. Scored ${processed} clients in ${duration.toFixed(1)}s (${errors} errors)`);

    return {
      totalClients,
      processed,
      errors,
      success: processed - errors,
      durationSeconds: duration
    };
  }

  /**
   * Generate morning briefing for an agent
   */
  async generateMorningBriefing(userId) {
    const today = new Date().toISOString().split('T')[0];

    // Get agent's client stats
    const stats = await db.query(`
      SELECT
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE risk_score >= 90) as severe_count,
        COUNT(*) FILTER (WHERE risk_score >= 80 AND risk_score < 90) as critical_count,
        COUNT(*) FILTER (WHERE risk_score >= 65 AND risk_score < 80) as high_count,
        COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 65) as elevated_count,
        COUNT(*) FILTER (WHERE risk_score >= 35 AND risk_score < 50) as medium_count,
        COUNT(*) FILTER (WHERE risk_score < 35) as low_stable_count
      FROM clients
      WHERE owner_id = $1 AND status != 'churned'
    `, [userId]);

    // Get yesterday's counts for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayBriefing = await db.query(`
      SELECT severe_critical_count, high_elevated_count
      FROM morning_briefings
      WHERE user_id = $1 AND briefing_date = $2
    `, [userId, yesterday.toISOString().split('T')[0]]);

    const yesterdayData = yesterdayBriefing.rows[0] || { severe_critical_count: 0, high_elevated_count: 0 };

    const todaySevereCritical = parseInt(stats.rows[0].severe_count) + parseInt(stats.rows[0].critical_count);
    const todayHighElevated = parseInt(stats.rows[0].high_count) + parseInt(stats.rows[0].elevated_count);

    // Get clients needing immediate attention
    const immediateAttention = await db.query(`
      SELECT
        c.id, c.first_name, c.last_name, c.risk_score, c.phone,
        (SELECT rf.factor_name
         FROM client_risk_factors crf
         JOIN risk_factors rf ON rf.id = crf.risk_factor_id
         WHERE crf.client_id = c.id
         ORDER BY crf.points_contributed DESC
         LIMIT 1) as top_factor
      FROM clients c
      WHERE c.owner_id = $1
      AND c.status != 'churned'
      AND c.risk_score >= 80
      ORDER BY c.risk_score DESC
      LIMIT 10
    `, [userId]);

    // Get biggest score movers
    const biggestMovers = await db.query(`
      SELECT DISTINCT ON (rsh.client_id)
        c.id, c.first_name, c.last_name,
        rsh.risk_score as current_score,
        rsh.previous_score,
        rsh.score_change
      FROM risk_score_history rsh
      JOIN clients c ON c.id = rsh.client_id
      WHERE c.owner_id = $1
      AND rsh.scored_at > NOW() - INTERVAL '24 hours'
      AND ABS(rsh.score_change) >= 10
      ORDER BY rsh.client_id, rsh.scored_at DESC
    `, [userId]);

    const moversUp = biggestMovers.rows.filter(m => m.score_change > 0)
      .sort((a, b) => b.score_change - a.score_change).slice(0, 5);
    const moversDown = biggestMovers.rows.filter(m => m.score_change < 0)
      .sort((a, b) => a.score_change - b.score_change).slice(0, 5);

    // Insert or update briefing
    await db.query(`
      INSERT INTO morning_briefings (
        user_id, briefing_date, total_clients,
        severe_critical_count, severe_critical_new,
        high_elevated_count, high_elevated_change,
        medium_count, low_stable_count,
        immediate_attention, biggest_movers_up, biggest_movers_down
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id, briefing_date) DO UPDATE SET
        total_clients = EXCLUDED.total_clients,
        severe_critical_count = EXCLUDED.severe_critical_count,
        severe_critical_new = EXCLUDED.severe_critical_new,
        high_elevated_count = EXCLUDED.high_elevated_count,
        high_elevated_change = EXCLUDED.high_elevated_change,
        medium_count = EXCLUDED.medium_count,
        low_stable_count = EXCLUDED.low_stable_count,
        immediate_attention = EXCLUDED.immediate_attention,
        biggest_movers_up = EXCLUDED.biggest_movers_up,
        biggest_movers_down = EXCLUDED.biggest_movers_down,
        generated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      today,
      parseInt(stats.rows[0].total_clients),
      todaySevereCritical,
      Math.max(0, todaySevereCritical - yesterdayData.severe_critical_count),
      todayHighElevated,
      todayHighElevated - yesterdayData.high_elevated_count,
      parseInt(stats.rows[0].medium_count),
      parseInt(stats.rows[0].low_stable_count),
      JSON.stringify(immediateAttention.rows.map(c => ({
        clientId: c.id,
        name: `${c.first_name} ${c.last_name}`,
        score: c.risk_score,
        phone: c.phone,
        topFactor: c.top_factors?.[0]
      }))),
      JSON.stringify(moversUp.map(m => ({
        clientId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        previousScore: m.previous_score,
        currentScore: m.current_score,
        change: m.score_change
      }))),
      JSON.stringify(moversDown.map(m => ({
        clientId: m.id,
        name: `${m.first_name} ${m.last_name}`,
        previousScore: m.previous_score,
        currentScore: m.current_score,
        change: m.score_change
      })))
    ]);

    return {
      date: today,
      totalClients: parseInt(stats.rows[0].total_clients),
      severeCritical: {
        count: todaySevereCritical,
        new: Math.max(0, todaySevereCritical - yesterdayData.severe_critical_count)
      },
      highElevated: {
        count: todayHighElevated,
        change: todayHighElevated - yesterdayData.high_elevated_count
      },
      medium: parseInt(stats.rows[0].medium_count),
      lowStable: parseInt(stats.rows[0].low_stable_count),
      immediateAttention: immediateAttention.rows,
      moversUp,
      moversDown
    };
  }
}

// Export singleton
module.exports = new ChurnPredictionEngine();
