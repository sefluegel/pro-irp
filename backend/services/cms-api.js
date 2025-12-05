// backend/services/cms-api.js
// CMS Data Integration Service
// Handles Plan Finder API, Formulary Files, Network Files, and Census ACS API

const db = require('../db');

// ============================================================================
// CMS API CONFIGURATION
// These will need to be configured with actual API keys
// ============================================================================

const CMS_CONFIG = {
  // CMS Plan Finder API (Medicare Plan Compare)
  planFinderApiBase: process.env.CMS_PLAN_FINDER_API || 'https://api.cms.gov/plan-data/v1',
  planFinderApiKey: process.env.CMS_PLAN_FINDER_KEY || null,

  // Census Bureau ACS API
  censusApiBase: 'https://api.census.gov/data',
  censusApiKey: process.env.CENSUS_API_KEY || null,

  // CMS Formulary/Network data URLs (annual downloads)
  formularyDataUrl: 'https://data.cms.gov/provider-data/dataset/formulary-file',
  networkDataUrl: 'https://data.cms.gov/provider-data/dataset/provider-network'
};

// ============================================================================
// CMS API SERVICE
// ============================================================================

class CMSApiService {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('[cms-api] Initializing CMS API service...');

    // Check if we have necessary API keys
    if (!CMS_CONFIG.planFinderApiKey) {
      console.warn('[cms-api] CMS Plan Finder API key not configured');
    }
    if (!CMS_CONFIG.censusApiKey) {
      console.warn('[cms-api] Census API key not configured');
    }

    this.initialized = true;
    console.log('[cms-api] Service initialized');
  }

  /**
   * Get from cache or fetch
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ============================================================================
  // PLAN FINDER API
  // ============================================================================

  /**
   * Get plans available in a county
   */
  async getPlansInCounty(countyFips, planYear = new Date().getFullYear()) {
    const cacheKey = `plans_${countyFips}_${planYear}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // First check database cache
      const dbPlans = await db.query(`
        SELECT * FROM cms_plans
        WHERE county_code = $1 AND plan_year = $2 AND is_active = true
        ORDER BY overall_star_rating DESC NULLS LAST
      `, [countyFips, planYear]);

      if (dbPlans.rows.length > 0) {
        this.setCache(cacheKey, dbPlans.rows);
        return dbPlans.rows;
      }

      // If not in database and API key available, fetch from CMS
      if (CMS_CONFIG.planFinderApiKey) {
        // NOTE: This is a placeholder for the actual CMS API call
        // The actual implementation would use the CMS Plan Finder API
        console.log(`[cms-api] Would fetch plans for county ${countyFips} from CMS API`);
      }

      return [];
    } catch (error) {
      console.error('[cms-api] Error fetching plans:', error.message);
      return [];
    }
  }

  /**
   * Get plan details
   */
  async getPlanDetails(contractId, planId, segmentId = null, planYear = new Date().getFullYear()) {
    const cacheKey = `plan_${contractId}_${planId}_${segmentId}_${planYear}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const plan = await db.query(`
        SELECT * FROM cms_plans
        WHERE contract_id = $1 AND plan_id = $2
        AND ($3::text IS NULL OR segment_id = $3)
        AND plan_year = $4
      `, [contractId, planId, segmentId, planYear]);

      if (plan.rows[0]) {
        this.setCache(cacheKey, plan.rows[0]);
        return plan.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[cms-api] Error fetching plan details:', error.message);
      return null;
    }
  }

  /**
   * Compare plans for a client
   */
  async comparePlansForClient(clientId) {
    try {
      // Get client's current plan and location
      const client = await db.query(`
        SELECT c.*, (
          SELECT array_agg(DISTINCT pc.ndc_code)
          FROM prescription_claims pc
          WHERE pc.client_id = c.id
          AND pc.fill_date > NOW() - INTERVAL '6 months'
        ) as current_drugs
        FROM clients c
        WHERE c.id = $1
      `, [clientId]);

      if (!client.rows[0]) {
        throw new Error('Client not found');
      }

      const clientData = client.rows[0];
      const countyFips = clientData.county_fips || clientData.zip?.substring(0, 3);

      if (!countyFips) {
        return { error: 'Client county not available' };
      }

      // Get all plans in county
      const plans = await this.getPlansInCounty(countyFips);

      // For each plan, calculate estimated costs based on client's drugs
      const comparisons = [];

      for (const plan of plans) {
        const drugCoverage = await this.checkDrugCoverage(
          plan.contract_id,
          plan.plan_id,
          clientData.current_drugs || []
        );

        comparisons.push({
          planId: plan.id,
          planName: plan.plan_name,
          carrier: plan.organization_name,
          premium: plan.monthly_premium_cents / 100,
          starRating: plan.overall_star_rating,
          drugCoverage,
          hasPcp: await this.checkProviderInNetwork(plan.id, clientData.primary_care),
          isCurrentPlan: plan.plan_name === clientData.plan
        });
      }

      // Sort by estimated total cost
      comparisons.sort((a, b) =>
        (a.premium + (a.drugCoverage?.estimatedAnnualCost || 0)) -
        (b.premium + (b.drugCoverage?.estimatedAnnualCost || 0))
      );

      return {
        clientId,
        county: countyFips,
        totalPlansAvailable: plans.length,
        comparisons: comparisons.slice(0, 10) // Top 10
      };
    } catch (error) {
      console.error('[cms-api] Plan comparison error:', error.message);
      return { error: error.message };
    }
  }

  // ============================================================================
  // FORMULARY DATA
  // ============================================================================

  /**
   * Check if drugs are covered by a plan's formulary
   */
  async checkDrugCoverage(contractId, planId, ndcCodes, formularyYear = new Date().getFullYear()) {
    if (!ndcCodes || ndcCodes.length === 0) {
      return { covered: [], notCovered: [], estimatedAnnualCost: 0 };
    }

    try {
      const formulary = await db.query(`
        SELECT
          ndc, drug_name, tier, tier_name,
          requires_prior_auth, requires_step_therapy,
          quantity_limit_applicable, specialty_tier
        FROM cms_formulary
        WHERE contract_id = $1 AND plan_id = $2
        AND formulary_year = $3
        AND ndc = ANY($4)
      `, [contractId, planId, formularyYear, ndcCodes]);

      const coveredNdcs = formulary.rows.map(f => f.ndc);
      const notCovered = ndcCodes.filter(ndc => !coveredNdcs.includes(ndc));

      // Calculate estimated costs based on tier
      let estimatedAnnualCost = 0;
      const tierCosts = { 1: 5, 2: 15, 3: 45, 4: 100, 5: 250, specialty: 500 };

      for (const drug of formulary.rows) {
        const monthlyCost = drug.specialty_tier
          ? tierCosts.specialty
          : tierCosts[drug.tier] || 45;
        estimatedAnnualCost += monthlyCost * 12;
      }

      // Add penalty for uncovered drugs
      estimatedAnnualCost += notCovered.length * 200 * 12; // Assume $200/month for uncovered

      return {
        covered: formulary.rows,
        notCovered,
        estimatedAnnualCost,
        hasFormularyIssues: notCovered.length > 0 || formulary.rows.some(f => f.specialty_tier)
      };
    } catch (error) {
      console.error('[cms-api] Drug coverage check error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Check ANOC formulary changes for a client
   */
  async checkAnocFormularyChanges(clientId, nextYear = new Date().getFullYear() + 1) {
    try {
      // Get client's current drugs
      const drugs = await db.query(`
        SELECT DISTINCT pc.ndc_code, pc.drug_name
        FROM prescription_claims pc
        WHERE pc.client_id = $1
        AND pc.fill_date > NOW() - INTERVAL '6 months'
      `, [clientId]);

      if (drugs.rows.length === 0) {
        return { changes: [], hasNegativeChanges: false };
      }

      const ndcCodes = drugs.rows.map(d => d.ndc_code);

      // Get client's plan
      const client = await db.query(`
        SELECT carrier, plan FROM clients WHERE id = $1
      `, [clientId]);

      if (!client.rows[0]?.plan) {
        return { error: 'Client plan not found' };
      }

      // Compare current year to next year formulary
      const currentYear = new Date().getFullYear();

      const currentFormulary = await db.query(`
        SELECT ndc, tier, requires_prior_auth, requires_step_therapy, quantity_limit_applicable
        FROM cms_formulary
        WHERE formulary_year = $1 AND ndc = ANY($2)
      `, [currentYear, ndcCodes]);

      const nextFormulary = await db.query(`
        SELECT ndc, tier, requires_prior_auth, requires_step_therapy, quantity_limit_applicable
        FROM cms_formulary
        WHERE formulary_year = $1 AND ndc = ANY($2)
      `, [nextYear, ndcCodes]);

      // Compare and find changes
      const changes = [];

      for (const drug of drugs.rows) {
        const current = currentFormulary.rows.find(f => f.ndc === drug.ndc_code);
        const next = nextFormulary.rows.find(f => f.ndc === drug.ndc_code);

        if (!next && current) {
          changes.push({
            drugName: drug.drug_name,
            ndc: drug.ndc_code,
            changeType: 'removed',
            description: 'Drug removed from formulary',
            riskWeight: 35
          });
        } else if (current && next) {
          if (next.tier > current.tier) {
            changes.push({
              drugName: drug.drug_name,
              ndc: drug.ndc_code,
              changeType: 'tier_increase',
              description: `Tier increased from ${current.tier} to ${next.tier}`,
              riskWeight: 20
            });
          }
          if (!current.requires_prior_auth && next.requires_prior_auth) {
            changes.push({
              drugName: drug.drug_name,
              ndc: drug.ndc_code,
              changeType: 'new_pa',
              description: 'New prior authorization required',
              riskWeight: 15
            });
          }
          if (!current.requires_step_therapy && next.requires_step_therapy) {
            changes.push({
              drugName: drug.drug_name,
              ndc: drug.ndc_code,
              changeType: 'new_step_therapy',
              description: 'New step therapy required',
              riskWeight: 18
            });
          }
          if (!current.quantity_limit_applicable && next.quantity_limit_applicable) {
            changes.push({
              drugName: drug.drug_name,
              ndc: drug.ndc_code,
              changeType: 'new_quantity_limit',
              description: 'New quantity limit applied',
              riskWeight: 10
            });
          }
        }
      }

      return {
        changes,
        hasNegativeChanges: changes.length > 0,
        totalRiskPoints: changes.reduce((sum, c) => sum + c.riskWeight, 0)
      };
    } catch (error) {
      console.error('[cms-api] ANOC check error:', error.message);
      return { error: error.message };
    }
  }

  // ============================================================================
  // PROVIDER NETWORK
  // ============================================================================

  /**
   * Check if a provider is in network
   */
  async checkProviderInNetwork(planId, providerNpi) {
    if (!providerNpi) return null;

    try {
      const result = await db.query(`
        SELECT cpp.network_tier, cpp.accepting_patients
        FROM cms_plan_providers cpp
        JOIN cms_providers cp ON cp.id = cpp.provider_id
        WHERE cpp.plan_id = $1 AND cp.npi = $2
        AND (cpp.termination_date IS NULL OR cpp.termination_date > CURRENT_DATE)
      `, [planId, providerNpi]);

      if (result.rows[0]) {
        return {
          inNetwork: true,
          tier: result.rows[0].network_tier,
          acceptingPatients: result.rows[0].accepting_patients
        };
      }

      return { inNetwork: false };
    } catch (error) {
      console.error('[cms-api] Provider check error:', error.message);
      return null;
    }
  }

  /**
   * Check network changes for ANOC
   */
  async checkAnocNetworkChanges(clientId) {
    try {
      const client = await db.query(`
        SELECT primary_care, specialists FROM clients WHERE id = $1
      `, [clientId]);

      if (!client.rows[0]) {
        return { error: 'Client not found' };
      }

      const changes = [];
      const { primary_care, specialists } = client.rows[0];

      // Check PCP
      if (primary_care) {
        const terminating = await db.query(`
          SELECT cp.provider_name, cpp.termination_date
          FROM cms_plan_providers cpp
          JOIN cms_providers cp ON cp.id = cpp.provider_id
          WHERE cp.npi = $1
          AND cpp.termination_date IS NOT NULL
          AND cpp.termination_date <= (CURRENT_DATE + INTERVAL '3 months')
        `, [primary_care]);

        if (terminating.rows.length > 0) {
          changes.push({
            providerType: 'PCP',
            providerName: terminating.rows[0].provider_name,
            changeType: 'leaving_network',
            terminationDate: terminating.rows[0].termination_date,
            riskWeight: 35
          });
        }
      }

      return {
        changes,
        hasNetworkIssues: changes.length > 0,
        totalRiskPoints: changes.reduce((sum, c) => sum + c.riskWeight, 0)
      };
    } catch (error) {
      console.error('[cms-api] Network changes error:', error.message);
      return { error: error.message };
    }
  }

  // ============================================================================
  // CENSUS API - ZIP DEMOGRAPHICS
  // ============================================================================

  /**
   * Get demographic data for a ZIP code
   */
  async getZipDemographics(zipCode) {
    const cacheKey = `zip_demo_${zipCode}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Check database first
      const dbDemo = await db.query(`
        SELECT * FROM zip_demographics
        WHERE zip_code = $1
        ORDER BY data_year DESC
        LIMIT 1
      `, [zipCode]);

      if (dbDemo.rows[0]) {
        this.setCache(cacheKey, dbDemo.rows[0]);
        return dbDemo.rows[0];
      }

      // If API key available, fetch from Census
      if (CMS_CONFIG.censusApiKey) {
        // NOTE: This is a placeholder for the actual Census API call
        // The actual implementation would use the ACS API
        console.log(`[cms-api] Would fetch demographics for ZIP ${zipCode} from Census API`);
      }

      return null;
    } catch (error) {
      console.error('[cms-api] ZIP demographics error:', error.message);
      return null;
    }
  }

  /**
   * Calculate ZIP risk factors
   */
  async calculateZipRiskFactors(zipCode) {
    const demo = await this.getZipDemographics(zipCode);

    if (!demo) {
      return { highSeniorZip: false, lowIncomeZip: false, riskPoints: 0 };
    }

    let riskPoints = 0;
    const factors = [];

    if (demo.is_high_senior_zip) {
      riskPoints += 10;
      factors.push({ factor: 'high_senior_zip', points: 10 });
    }

    if (demo.is_low_income_zip) {
      riskPoints += 12;
      factors.push({ factor: 'low_income_zip', points: 12 });
    }

    return {
      highSeniorZip: demo.is_high_senior_zip,
      lowIncomeZip: demo.is_low_income_zip,
      riskPoints,
      factors
    };
  }

  // ============================================================================
  // COUNTY COMPETITION ANALYSIS
  // ============================================================================

  /**
   * Get competition analysis for a county
   */
  async getCountyCompetition(countyFips) {
    const cacheKey = `county_comp_${countyFips}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const competition = await db.query(`
        SELECT * FROM county_competition
        WHERE county_fips = $1
        ORDER BY data_year DESC
        LIMIT 1
      `, [countyFips]);

      if (competition.rows[0]) {
        this.setCache(cacheKey, competition.rows[0]);
        return competition.rows[0];
      }

      // Calculate from plans data
      const plans = await db.query(`
        SELECT
          COUNT(*) as total_plans,
          COUNT(*) FILTER (WHERE monthly_premium_cents = 0) as zero_premium,
          COUNT(*) FILTER (WHERE overall_star_rating >= 4.5) as high_star,
          MAX(overall_star_rating) as max_star
        FROM cms_plans
        WHERE county_code = $1 AND is_active = true
      `, [countyFips]);

      if (plans.rows[0]) {
        const comp = plans.rows[0];
        return {
          total_plans: parseInt(comp.total_plans),
          zero_premium_plans: parseInt(comp.zero_premium),
          plans_with_high_stars: parseInt(comp.high_star),
          max_star_rating: parseFloat(comp.max_star),
          competition_level: comp.total_plans >= 11 ? 'high' :
                            comp.total_plans >= 7 ? 'moderate' : 'low'
        };
      }

      return null;
    } catch (error) {
      console.error('[cms-api] County competition error:', error.message);
      return null;
    }
  }

  /**
   * Calculate competition risk factors for a client
   */
  async calculateCompetitionRiskFactors(clientId) {
    try {
      const client = await db.query(`
        SELECT zip, county_fips FROM clients WHERE id = $1
      `, [clientId]);

      if (!client.rows[0]) {
        return { riskPoints: 0, factors: [] };
      }

      const countyFips = client.rows[0].county_fips ||
                        client.rows[0].zip?.substring(0, 3);

      if (!countyFips) {
        return { riskPoints: 0, factors: [] };
      }

      const competition = await this.getCountyCompetition(countyFips);

      if (!competition) {
        return { riskPoints: 10, factors: [{ factor: 'baseline_solicitation', points: 10 }] };
      }

      const factors = [];
      let riskPoints = 10; // Baseline solicitation

      // Plan count risk
      if (competition.total_plans >= 11) {
        riskPoints += 20;
        factors.push({ factor: 'plans_in_county_11_plus', points: 20 });
      } else if (competition.total_plans >= 7) {
        riskPoints += 12;
        factors.push({ factor: 'plans_in_county_7_10', points: 12 });
      }

      // Zero premium plans
      if (competition.zero_premium_plans > 0) {
        riskPoints += 15;
        factors.push({ factor: 'zero_premium_available', points: 15 });
      }

      // High star competitors
      if (competition.plans_with_high_stars > 0) {
        riskPoints += 12;
        factors.push({ factor: 'high_star_competitor', points: 12 });
      }

      return { riskPoints, factors, competition };
    } catch (error) {
      console.error('[cms-api] Competition risk error:', error.message);
      return { riskPoints: 10, factors: [{ factor: 'baseline_solicitation', points: 10 }] };
    }
  }

  // ============================================================================
  // ANNUAL DATA REFRESH (September)
  // ============================================================================

  /**
   * Trigger annual data refresh for next plan year
   */
  async triggerAnnualDataRefresh(planYear) {
    console.log(`[cms-api] Starting annual data refresh for ${planYear}...`);

    const results = {
      plans: 0,
      formulary: 0,
      providers: 0,
      demographics: 0,
      errors: []
    };

    try {
      // In production, this would:
      // 1. Download CMS Landscape files
      // 2. Parse and import plan data
      // 3. Download and import formulary files
      // 4. Download and import provider network files
      // 5. Refresh Census ACS data

      console.log('[cms-api] Annual refresh would download and import CMS data files');
      console.log('[cms-api] This requires CMS PUF (Public Use Files) access');

      // Log the refresh attempt
      await db.query(`
        INSERT INTO audit_logs (user_id, action, resource_type, details)
        VALUES (NULL, 'CMS_DATA_REFRESH', 'cms_data', $1)
      `, [JSON.stringify({ planYear, triggeredAt: new Date().toISOString() })]);

      return results;
    } catch (error) {
      console.error('[cms-api] Annual refresh error:', error.message);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Run ANOC auto-scan for all clients (October 1)
   */
  async runAnocAutoScan() {
    console.log('[cms-api] Running ANOC auto-scan for all clients...');

    const results = {
      clientsScanned: 0,
      clientsWithChanges: 0,
      alertsCreated: 0,
      errors: []
    };

    try {
      // Get all active clients
      const clients = await db.query(`
        SELECT id, owner_id FROM clients WHERE status = 'active'
      `);

      for (const client of clients.rows) {
        try {
          // Check formulary changes
          const formularyChanges = await this.checkAnocFormularyChanges(client.id);

          // Check network changes
          const networkChanges = await this.checkAnocNetworkChanges(client.id);

          const hasChanges = formularyChanges.hasNegativeChanges || networkChanges.hasNetworkIssues;

          if (hasChanges) {
            results.clientsWithChanges++;

            // Create alert
            const alertMessage = [];
            if (formularyChanges.changes.length > 0) {
              alertMessage.push(`Formulary changes: ${formularyChanges.changes.map(c => c.drugName).join(', ')}`);
            }
            if (networkChanges.changes.length > 0) {
              alertMessage.push(`Network changes: ${networkChanges.changes.map(c => c.providerName).join(', ')}`);
            }

            await db.query(`
              INSERT INTO risk_alerts
              (client_id, user_id, alert_type, alert_code, alert_title, alert_message,
               response_window_hours, response_due_at)
              VALUES ($1, $2, 'warning', 'anoc_changes', 'ANOC Changes Detected', $3, 168, NOW() + INTERVAL '7 days')
            `, [client.id, client.owner_id, alertMessage.join('. ')]);

            results.alertsCreated++;
          }

          results.clientsScanned++;
        } catch (error) {
          results.errors.push({ clientId: client.id, error: error.message });
        }
      }

      console.log(`[cms-api] ANOC scan complete. ${results.clientsWithChanges} clients with changes.`);
      return results;
    } catch (error) {
      console.error('[cms-api] ANOC scan error:', error.message);
      results.errors.push(error.message);
      return results;
    }
  }
}

// Export singleton
module.exports = new CMSApiService();
