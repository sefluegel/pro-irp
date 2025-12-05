-- Migration 010: Enhanced Churn Prediction Model
-- Complete implementation based on PRO IRP Medicare Advantage Churn Prediction Model Specification
-- ============================================================================

-- ============================================================================
-- ENHANCED RISK FACTORS
-- Matches the 5-category weighted system from the specification:
-- Engagement (40%), Utilization (22%), Benefit Fit (18%), Life Events (8%), External Risk (12%)
-- ============================================================================

-- Drop and recreate risk_factors with category weights
ALTER TABLE risk_factors ADD COLUMN IF NOT EXISTS category_weight DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE risk_factors ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);
ALTER TABLE risk_factors ADD COLUMN IF NOT EXISTS recency_applicable BOOLEAN DEFAULT false;
ALTER TABLE risk_factors ADD COLUMN IF NOT EXISTS auto_100_trigger BOOLEAN DEFAULT false;
ALTER TABLE risk_factors ADD COLUMN IF NOT EXISTS minimum_score_override INTEGER;
ALTER TABLE risk_factors ADD COLUMN IF NOT EXISTS stacking_rules JSONB;

-- Update category weights based on spec
UPDATE risk_factors SET category_weight = 0.40 WHERE factor_category = 'engagement';
UPDATE risk_factors SET category_weight = 0.22 WHERE factor_category = 'prescription';
UPDATE risk_factors SET category_weight = 0.22 WHERE factor_category = 'utilization';
UPDATE risk_factors SET category_weight = 0.18 WHERE factor_category = 'plan';
UPDATE risk_factors SET category_weight = 0.18 WHERE factor_category = 'benefit_fit';
UPDATE risk_factors SET category_weight = 0.08 WHERE factor_category = 'life_event';
UPDATE risk_factors SET category_weight = 0.08 WHERE factor_category = 'demographic';
UPDATE risk_factors SET category_weight = 0.12 WHERE factor_category = 'external';
UPDATE risk_factors SET category_weight = 0.12 WHERE factor_category = 'history';

-- Clear existing factors and insert complete set from spec
DELETE FROM risk_factors;

-- ============================================================================
-- SECTION 1: ENGAGEMENT METRICS (40% Weight)
-- ============================================================================

INSERT INTO risk_factors (factor_code, factor_name, factor_category, category_weight, sub_category, description, base_weight, max_weight, recency_applicable) VALUES
-- Days Since Meaningful Contact (max 48 points)
('days_no_contact_0_30', 'No contact 0-30 days', 'engagement', 0.40, 'contact_recency', 'Client has been contacted within 30 days', 0, NULL, false),
('days_no_contact_31_60', 'No contact 31-60 days', 'engagement', 0.40, 'contact_recency', 'Client has not been contacted in 31-60 days', 3, NULL, false),
('days_no_contact_61_90', 'No contact 61-90 days', 'engagement', 0.40, 'contact_recency', 'Client has not been contacted in 61-90 days', 8, NULL, false),
('days_no_contact_91_120', 'No contact 91-120 days', 'engagement', 0.40, 'contact_recency', 'Client has not been contacted in 91-120 days', 18, NULL, false),
('days_no_contact_121_150', 'No contact 121-150 days', 'engagement', 0.40, 'contact_recency', 'Client has not been contacted in 121-150 days', 28, NULL, false),
('days_no_contact_151_180', 'No contact 151-180 days', 'engagement', 0.40, 'contact_recency', 'Client has not been contacted in 151-180 days', 38, NULL, false),
('days_no_contact_180_plus', 'No contact 180+ days', 'engagement', 0.40, 'contact_recency', 'Client has not been contacted in over 180 days', 48, NULL, false),

-- Phone Pickup Ratio (max 40 points)
('phone_pickup_70_100', 'Phone pickup 70-100%', 'engagement', 0.40, 'response_ratio', 'Client answers phone 70-100% of the time', 0, NULL, false),
('phone_pickup_50_69', 'Phone pickup 50-69%', 'engagement', 0.40, 'response_ratio', 'Client answers phone 50-69% of the time', 6, NULL, false),
('phone_pickup_30_49', 'Phone pickup 30-49%', 'engagement', 0.40, 'response_ratio', 'Client answers phone 30-49% of the time', 15, NULL, false),
('phone_pickup_10_29', 'Phone pickup 10-29%', 'engagement', 0.40, 'response_ratio', 'Client answers phone 10-29% of the time', 28, NULL, false),
('phone_pickup_0_9', 'Phone pickup 0-9%', 'engagement', 0.40, 'response_ratio', 'Client answers phone less than 10% of the time', 40, NULL, false),

-- Text Response Ratio (max 25 points)
('text_response_70_100', 'Text response 70-100%', 'engagement', 0.40, 'response_ratio', 'Client responds to texts 70-100% of the time', 0, NULL, false),
('text_response_50_69', 'Text response 50-69%', 'engagement', 0.40, 'response_ratio', 'Client responds to texts 50-69% of the time', 4, NULL, false),
('text_response_30_49', 'Text response 30-49%', 'engagement', 0.40, 'response_ratio', 'Client responds to texts 30-49% of the time', 10, NULL, false),
('text_response_10_29', 'Text response 10-29%', 'engagement', 0.40, 'response_ratio', 'Client responds to texts 10-29% of the time', 18, NULL, false),
('text_response_0_9', 'Text response 0-9%', 'engagement', 0.40, 'response_ratio', 'Client responds to texts less than 10% of the time', 25, NULL, false),

-- Email Open Rate (max 12 points)
('email_open_50_100', 'Email open 50-100%', 'engagement', 0.40, 'response_ratio', 'Client opens emails 50-100% of the time', 0, NULL, false),
('email_open_30_49', 'Email open 30-49%', 'engagement', 0.40, 'response_ratio', 'Client opens emails 30-49% of the time', 3, NULL, false),
('email_open_10_29', 'Email open 10-29%', 'engagement', 0.40, 'response_ratio', 'Client opens emails 10-29% of the time', 8, NULL, false),
('email_open_0_9', 'Email open 0-9%', 'engagement', 0.40, 'response_ratio', 'Client opens emails less than 10% of the time', 12, NULL, false),

-- New Client First 90 Days Checkpoints
('missed_day_7_welcome', 'Missed Day 7 welcome call', 'engagement', 0.40, 'new_client_checkpoints', 'New client missed Day 7 welcome call', 15, NULL, false),
('missed_day_30_checkin', 'Missed Day 30 check-in', 'engagement', 0.40, 'new_client_checkpoints', 'New client missed Day 30 check-in', 12, NULL, false),
('missed_day_60_checkin', 'Missed Day 60 check-in', 'engagement', 0.40, 'new_client_checkpoints', 'New client missed Day 60 check-in', 10, NULL, false),
('missed_day_90_review', 'Missed Day 90 review', 'engagement', 0.40, 'new_client_checkpoints', 'New client missed Day 90 review', 15, NULL, false),

-- Annual Review Tracking
('annual_review_overdue', 'Annual review overdue', 'engagement', 0.40, 'annual_review', 'More than 11 months since last annual review', 20, NULL, false);

-- ============================================================================
-- SECTION 2: UTILIZATION METRICS (22% Weight)
-- ============================================================================

INSERT INTO risk_factors (factor_code, factor_name, factor_category, category_weight, sub_category, description, base_weight, max_weight, recency_applicable) VALUES
-- Emergency & Inpatient Events
('er_visit_first', 'ER visit (1st in 12 months)', 'utilization', 0.22, 'emergency_inpatient', 'First ER visit in 12 months', 8, NULL, true),
('er_visit_repeat', 'ER visit (2nd+ in 12 months)', 'utilization', 0.22, 'emergency_inpatient', 'Second or more ER visit in 12 months', 15, NULL, true),
('inpatient_admission', 'Inpatient admission', 'utilization', 0.22, 'emergency_inpatient', 'Hospital inpatient admission', 18, NULL, true),
('icu_stay', 'ICU stay', 'utilization', 0.22, 'emergency_inpatient', 'Intensive care unit stay', 22, NULL, true),
('surgery_planned', 'Planned surgery', 'utilization', 0.22, 'emergency_inpatient', 'Scheduled/planned surgery', 10, NULL, true),
('surgery_emergency', 'Emergency surgery', 'utilization', 0.22, 'emergency_inpatient', 'Emergency/unplanned surgery', 20, NULL, true),
('skilled_nursing', 'Skilled nursing stay', 'utilization', 0.22, 'emergency_inpatient', 'Skilled nursing facility stay', 15, NULL, true),

-- Pharmacy & Rx Issues
('rx_not_covered_first', 'Rx not covered (1st)', 'utilization', 0.22, 'pharmacy_rx', 'First prescription not covered by plan', 12, NULL, true),
('rx_not_covered_repeat', 'Rx not covered (2nd+)', 'utilization', 0.22, 'pharmacy_rx', 'Second or more prescription not covered', 20, NULL, true),
('primary_maintenance_not_covered', 'Primary maintenance drug not covered', 'utilization', 0.22, 'pharmacy_rx', 'Primary maintenance medication not on formulary', 30, NULL, true),
('rx_tier_increase', 'Rx tier increase', 'utilization', 0.22, 'pharmacy_rx', 'Prescription drug moved to higher tier', 10, NULL, true),
('rx_cost_spike_50', 'Rx cost spike >$50/mo', 'utilization', 0.22, 'pharmacy_rx', 'Monthly prescription cost increased by more than $50', 15, NULL, true),
('rx_cost_spike_100', 'Rx cost spike >$100/mo', 'utilization', 0.22, 'pharmacy_rx', 'Monthly prescription cost increased by more than $100', 25, NULL, true),
('prior_auth_required_new', 'Prior auth required (new)', 'utilization', 0.22, 'pharmacy_rx', 'New prior authorization required for medication', 8, NULL, true),
('prior_auth_denied', 'Prior auth denied', 'utilization', 0.22, 'pharmacy_rx', 'Prior authorization request denied', 18, NULL, true),
('step_therapy_required', 'Step therapy required', 'utilization', 0.22, 'pharmacy_rx', 'Step therapy requirement added', 10, NULL, true),
('quantity_limit_hit', 'Quantity limit hit', 'utilization', 0.22, 'pharmacy_rx', 'Prescription quantity limit reached', 8, NULL, true),
('adherence_mpr_below_80', 'Adherence drop (MPR < 80%)', 'utilization', 0.22, 'pharmacy_rx', 'Medication possession ratio dropped below 80%', 12, NULL, false),

-- Prior Authorization & Denials
('pa_request_first_90', 'PA request (1st in 90 days)', 'utilization', 0.22, 'prior_auth', 'First prior authorization request in 90 days', 5, NULL, true),
('pa_request_repeat_90', 'PA request (2nd+ in 90 days)', 'utilization', 0.22, 'prior_auth', 'Second or more prior authorization in 90 days', 10, NULL, true),
('pa_denied_any', 'PA denied (any)', 'utilization', 0.22, 'prior_auth', 'Any prior authorization denied', 18, NULL, true),
('pa_denied_multiple', 'PA denied (2+ in 12 mo)', 'utilization', 0.22, 'prior_auth', 'Two or more prior authorizations denied in 12 months', 30, NULL, true),
('claim_denied', 'Claim denied', 'utilization', 0.22, 'prior_auth', 'Insurance claim denied', 15, NULL, true),
('appeal_filed', 'Appeal filed', 'utilization', 0.22, 'prior_auth', 'Appeal filed for denied claim', 12, NULL, true),
('appeal_denied', 'Appeal denied', 'utilization', 0.22, 'prior_auth', 'Appeal for denied claim was denied', 25, NULL, true),

-- Cost Exposure
('oop_25_moop', 'OOP spend > 25% of MOOP', 'utilization', 0.22, 'cost_exposure', 'Out-of-pocket spending exceeds 25% of maximum', 8, NULL, false),
('oop_50_moop', 'OOP spend > 50% of MOOP', 'utilization', 0.22, 'cost_exposure', 'Out-of-pocket spending exceeds 50% of maximum', 18, NULL, false),
('oop_75_moop', 'OOP spend > 75% of MOOP', 'utilization', 0.22, 'cost_exposure', 'Out-of-pocket spending exceeds 75% of maximum', 28, NULL, false),
('oop_hit_moop', 'Hit MOOP', 'utilization', 0.22, 'cost_exposure', 'Out-of-pocket spending reached maximum', 35, NULL, false),
('single_service_500_oop', 'Single service > $500 OOP', 'utilization', 0.22, 'cost_exposure', 'Single service with over $500 out-of-pocket', 15, NULL, true),
('single_service_1000_oop', 'Single service > $1000 OOP', 'utilization', 0.22, 'cost_exposure', 'Single service with over $1000 out-of-pocket', 25, NULL, true);

-- ============================================================================
-- SECTION 3: BENEFIT FIT METRICS (18% Weight)
-- ============================================================================

INSERT INTO risk_factors (factor_code, factor_name, factor_category, category_weight, sub_category, description, base_weight, max_weight, recency_applicable) VALUES
-- Drug Coverage Issues
('drug_not_formulary_1', '1 drug not on formulary', 'benefit_fit', 0.18, 'drug_coverage', 'One prescribed drug not on plan formulary', 12, NULL, false),
('drug_not_formulary_2_plus', '2+ drugs not on formulary', 'benefit_fit', 0.18, 'drug_coverage', 'Two or more prescribed drugs not on formulary', 25, NULL, false),
('primary_maint_not_covered', 'Primary maintenance not covered', 'benefit_fit', 0.18, 'drug_coverage', 'Primary maintenance medication not covered', 30, NULL, false),
('brand_required_generic_only', 'Brand required, generic only', 'benefit_fit', 0.18, 'drug_coverage', 'Client requires brand name but only generic covered', 15, NULL, false),
('drug_tier_4_5', 'Drug on Tier 4/5 (specialty)', 'benefit_fit', 0.18, 'drug_coverage', 'Client drug on specialty tier', 10, NULL, false),
('drug_requires_pa', 'Drug requires prior auth', 'benefit_fit', 0.18, 'drug_coverage', 'Client drug requires prior authorization', 8, NULL, false),
('drug_quantity_limits', 'Drug has quantity limits', 'benefit_fit', 0.18, 'drug_coverage', 'Client drug has quantity limits', 6, NULL, false),
('drug_step_therapy', 'Drug has step therapy', 'benefit_fit', 0.18, 'drug_coverage', 'Client drug requires step therapy', 10, NULL, false),

-- ANOC Formulary Changes (Applied Oct 1)
('anoc_drug_removed', 'ANOC: Drug removed from formulary', 'benefit_fit', 0.18, 'anoc_changes', 'Client drug being removed from formulary next year', 35, NULL, false),
('anoc_tier_increase', 'ANOC: Drug tier increase', 'benefit_fit', 0.18, 'anoc_changes', 'Client drug moving to higher tier next year', 20, NULL, false),
('anoc_new_pa_required', 'ANOC: New PA requirement', 'benefit_fit', 0.18, 'anoc_changes', 'New prior authorization requirement next year', 15, NULL, false),
('anoc_new_step_therapy', 'ANOC: New step therapy', 'benefit_fit', 0.18, 'anoc_changes', 'New step therapy requirement next year', 18, NULL, false),
('anoc_new_quantity_limit', 'ANOC: New quantity limit', 'benefit_fit', 0.18, 'anoc_changes', 'New quantity limit next year', 10, NULL, false),

-- Provider Network Issues
('pcp_in_network', 'PCP in network', 'benefit_fit', 0.18, 'provider_network', 'Primary care physician is in network', 0, NULL, false),
('pcp_leaving_network', 'PCP leaving network (ANOC)', 'benefit_fit', 0.18, 'provider_network', 'Primary care physician leaving network', 35, NULL, false),
('pcp_out_using_anyway', 'PCP out of network (using)', 'benefit_fit', 0.18, 'provider_network', 'Using out-of-network PCP anyway', 25, NULL, false),
('specialist_oon_1', '1 key specialist out of network', 'benefit_fit', 0.18, 'provider_network', 'One key specialist out of network', 15, NULL, false),
('specialist_oon_2_plus', '2+ specialists out of network', 'benefit_fit', 0.18, 'provider_network', 'Two or more specialists out of network', 28, NULL, false),
('oncologist_oon', 'Oncologist out of network', 'benefit_fit', 0.18, 'provider_network', 'Oncologist out of network', 35, NULL, false),
('cardiologist_oon', 'Cardiologist out of network', 'benefit_fit', 0.18, 'provider_network', 'Cardiologist out of network', 30, NULL, false),

-- Plan Comparison (AEP Only - September)
('premium_20_higher', 'Premium 20%+ higher than alternatives', 'benefit_fit', 0.18, 'plan_comparison', 'Plan premium is 20% or more higher than alternatives', 15, NULL, false),
('drug_cost_20_higher', 'Drug cost 20%+ higher than alternatives', 'benefit_fit', 0.18, 'plan_comparison', 'Drug costs are 20% or more higher than alternatives', 18, NULL, false),
('star_rating_half_lower', 'Star rating 0.5+ lower than competitors', 'benefit_fit', 0.18, 'plan_comparison', 'Plan star rating is 0.5 or more lower than competitors', 10, NULL, false),
('star_rating_1_lower', 'Star rating 1.0+ lower than competitors', 'benefit_fit', 0.18, 'plan_comparison', 'Plan star rating is 1.0 or more lower than competitors', 20, NULL, false),
('better_network_elsewhere', 'Better network match elsewhere', 'benefit_fit', 0.18, 'plan_comparison', 'Better provider network match available in other plan', 15, NULL, false);

-- ============================================================================
-- SECTION 4: LIFE EVENTS (8% Weight) - Includes Auto-100 Triggers
-- ============================================================================

INSERT INTO risk_factors (factor_code, factor_name, factor_category, category_weight, sub_category, description, base_weight, max_weight, auto_100_trigger, minimum_score_override) VALUES
-- Auto-Critical Events (Immediate 100 Risk Score)
('lis_status_change', 'LIS/Extra Help status change', 'life_event', 0.08, 'auto_critical', 'Low Income Subsidy status changed (gained or lost)', 100, NULL, true, 100),
('medicaid_status_change', 'Medicaid status change', 'life_event', 0.08, 'auto_critical', 'Medicaid eligibility changed (gained or lost)', 100, NULL, true, 100),
('moved_out_service_area', 'Moved out of service area', 'life_event', 0.08, 'auto_critical', 'Client moved outside plan service area', 100, NULL, true, 100),
('plan_terminated_cms', 'Plan terminated by CMS', 'life_event', 0.08, 'auto_critical', 'Client plan terminated by CMS', 100, NULL, true, 100),
('esrd_diagnosis', 'ESRD diagnosis', 'life_event', 0.08, 'auto_critical', 'End-Stage Renal Disease diagnosis', 100, NULL, true, 100),
('nursing_home_admission', 'Nursing home admission', 'life_event', 0.08, 'auto_critical', 'Client admitted to nursing home', 100, NULL, true, 100),
('involuntary_disenrollment', 'Involuntary disenrollment', 'life_event', 0.08, 'auto_critical', 'Involuntary disenrollment from plan', 100, NULL, true, 100),

-- SEP-Triggering Events (Minimum 80 Risk Score)
('address_change_new_county', 'Address change (new county)', 'life_event', 0.08, 'sep_trigger', 'Client moved to different county', 80, NULL, false, 80),
('lost_employer_coverage', 'Lost employer coverage', 'life_event', 0.08, 'sep_trigger', 'Lost employer-sponsored coverage', 85, NULL, false, 80),
('plan_leaving_service_area', 'Plan leaving service area', 'life_event', 0.08, 'sep_trigger', 'Client plan leaving their service area', 90, NULL, false, 80),
('gained_snp_condition', 'Gained SNP-qualifying condition', 'life_event', 0.08, 'sep_trigger', 'Gained condition qualifying for Special Needs Plan', 80, NULL, false, 80),
('released_incarceration', 'Released from incarceration', 'life_event', 0.08, 'sep_trigger', 'Released from incarceration', 80, NULL, false, 80);

-- ============================================================================
-- SECTION 5: EXTERNAL RISK (12% Weight)
-- ============================================================================

INSERT INTO risk_factors (factor_code, factor_name, factor_category, category_weight, sub_category, description, base_weight, max_weight, auto_100_trigger) VALUES
-- Market Competition
('plans_in_county_7_10', '7-10 plans in county', 'external', 0.12, 'market_competition', 'Moderate plan competition in county', 12, NULL, false),
('plans_in_county_11_plus', '11+ plans in county', 'external', 0.12, 'market_competition', 'High plan competition in county', 20, NULL, false),
('new_plans_entered_1_2', '1-2 new plans entered', 'external', 0.12, 'market_competition', 'One or two new plans entered county', 8, NULL, false),
('new_plans_entered_3_plus', '3+ new plans entered', 'external', 0.12, 'market_competition', 'Three or more new plans entered county', 15, NULL, false),
('zero_premium_available', '$0 premium plan available', 'external', 0.12, 'market_competition', 'Zero premium plan available in county', 15, NULL, false),
('high_star_competitor', '4.5+ star competitor in county', 'external', 0.12, 'market_competition', 'High star rating competitor available', 12, NULL, false),

-- Premium Vulnerability
('premium_0', 'Premium $0/mo', 'external', 0.12, 'premium_vulnerability', 'Client pays no monthly premium', 0, NULL, false),
('premium_1_29', 'Premium $1-29/mo', 'external', 0.12, 'premium_vulnerability', 'Client pays $1-29 monthly premium', 5, NULL, false),
('premium_30_59', 'Premium $30-59/mo', 'external', 0.12, 'premium_vulnerability', 'Client pays $30-59 monthly premium', 12, NULL, false),
('premium_60_99', 'Premium $60-99/mo', 'external', 0.12, 'premium_vulnerability', 'Client pays $60-99 monthly premium', 20, NULL, false),
('premium_100_plus', 'Premium $100+/mo', 'external', 0.12, 'premium_vulnerability', 'Client pays $100+ monthly premium', 28, NULL, false),

-- Demographic Factors
('high_senior_zip', 'High senior % ZIP (25%+)', 'external', 0.12, 'demographic', 'Lives in ZIP with high senior population', 10, NULL, false),
('low_income_zip', 'Low income ZIP', 'external', 0.12, 'demographic', 'Lives in low income ZIP code', 12, NULL, false),

-- Baseline Solicitation
('baseline_solicitation', 'Baseline solicitation', 'external', 0.12, 'baseline', 'All clients receive daily marketing from competitors', 10, NULL, false),

-- Carrier Exiting (Auto-100)
('carrier_exiting_county', 'Carrier exiting county', 'external', 0.12, 'carrier_exit', 'Client carrier exiting county', 100, NULL, true);

-- ============================================================================
-- CLIENT ENGAGEMENT TRACKING TABLE
-- Tracks meaningful vs light touch vs automated contact
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Contact type classification
  contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN (
    -- Meaningful Contact (100% Credit)
    'benefits_review_call',
    'problem_resolution_call',
    'life_event_discussion',
    'aep_oep_checkin_call',
    'in_person_meeting',
    'scheduled_video',

    -- Light Touch (50% Credit)
    'quick_checkin_call',
    'text_conversation',
    'personalized_email',

    -- Automated (20% Credit)
    'birthday_message',
    'holiday_message',
    'newsletter',
    'reminder_text'
  )),

  -- Credit value
  contact_credit DECIMAL(3, 2) NOT NULL DEFAULT 1.0, -- 1.0 = 100%, 0.5 = 50%, 0.2 = 20%

  -- Duration for calls
  duration_minutes INTEGER,

  -- Outcome tracking for response ratio
  outcome VARCHAR(50) CHECK (outcome IN (
    'completed', 'answered', 'responded',
    'no_answer', 'voicemail', 'no_response',
    'wrong_number', 'callback_scheduled', 'declined'
  )),

  -- Notes
  notes TEXT,

  -- New client checkpoint flags
  is_day_7_welcome BOOLEAN DEFAULT false,
  is_day_30_checkin BOOLEAN DEFAULT false,
  is_day_60_checkin BOOLEAN DEFAULT false,
  is_day_90_review BOOLEAN DEFAULT false,
  is_annual_review BOOLEAN DEFAULT false,

  contact_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_date ON client_contacts(contact_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_contacts_type ON client_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_client_contacts_user ON client_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_meaningful ON client_contacts(contact_date DESC)
  WHERE contact_credit = 1.0;

-- ============================================================================
-- CLIENT SEP STATUS TABLE
-- Tracks Special Enrollment Period status and countdown
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_sep_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- SEP Type
  sep_type VARCHAR(100) NOT NULL,
  sep_trigger_event VARCHAR(100) NOT NULL,

  -- SEP Window
  sep_start_date DATE NOT NULL,
  sep_end_date DATE NOT NULL,
  -- Note: days_remaining is calculated at query time, not stored

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),

  -- Detection
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  detection_source VARCHAR(100), -- blue_button, cms_notice, agent_entry

  -- Resolution
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One active SEP per type per client
  UNIQUE(client_id, sep_type, sep_start_date)
);

CREATE INDEX IF NOT EXISTS idx_sep_client ON client_sep_status(client_id);
CREATE INDEX IF NOT EXISTS idx_sep_active ON client_sep_status(status, sep_end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sep_expiring ON client_sep_status(sep_end_date) WHERE status = 'active';

-- ============================================================================
-- TEMPORAL MODIFIERS TABLE
-- Configurable temporal adjustments to risk scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS temporal_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  modifier_code VARCHAR(100) UNIQUE NOT NULL,
  modifier_name VARCHAR(255) NOT NULL,
  modifier_category VARCHAR(50) NOT NULL CHECK (modifier_category IN (
    'enrollment_period', 'new_client', 'first_oep', 'tenure'
  )),

  -- Point adjustment
  points_adjustment INTEGER NOT NULL,

  -- Applicability rules
  start_month INTEGER, -- 1-12
  start_day INTEGER, -- 1-31
  end_month INTEGER,
  end_day INTEGER,

  -- For new client and tenure
  months_since_effective_min INTEGER,
  months_since_effective_max INTEGER,

  -- Multiplier instead of points (for tenure)
  score_multiplier DECIMAL(4, 2),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert temporal modifiers from spec
INSERT INTO temporal_modifiers (modifier_code, modifier_name, modifier_category, points_adjustment, start_month, start_day, end_month, end_day) VALUES
('pre_aep', 'Pre-AEP', 'enrollment_period', 5, 10, 1, 10, 14),
('aep', 'AEP', 'enrollment_period', 8, 10, 15, 12, 7),
('post_aep', 'Post-AEP', 'enrollment_period', 4, 12, 8, 12, 31),
('oep', 'OEP', 'enrollment_period', 7, 1, 1, 3, 31),
('lock_in', 'Lock-in Period', 'enrollment_period', 0, 4, 1, 9, 30);

INSERT INTO temporal_modifiers (modifier_code, modifier_name, modifier_category, points_adjustment, months_since_effective_min, months_since_effective_max) VALUES
('new_client_0_3', 'New client 0-3 months', 'new_client', 10, 0, 3),
('new_client_4_6', 'New client 4-6 months', 'new_client', 6, 4, 6),
('new_client_7_12', 'New client 7-12 months', 'new_client', 3, 7, 12);

INSERT INTO temporal_modifiers (modifier_code, modifier_name, modifier_category, points_adjustment, months_since_effective_min, months_since_effective_max, score_multiplier) VALUES
('tenure_0_1_year', 'Tenure 0-1 year', 'tenure', 0, 0, 12, 1.0),
('tenure_1_2_years', 'Tenure 1-2 years', 'tenure', 0, 13, 24, 0.9),
('tenure_2_3_years', 'Tenure 2-3 years', 'tenure', 0, 25, 36, 0.85),
('tenure_3_5_years', 'Tenure 3-5 years', 'tenure', 0, 37, 60, 0.8),
('tenure_5_7_years', 'Tenure 5-7 years', 'tenure', 0, 61, 84, 0.7),
('tenure_7_plus_years', 'Tenure 7+ years', 'tenure', 0, 85, 999, 0.6);

-- First OEP modifiers
INSERT INTO temporal_modifiers (modifier_code, modifier_name, modifier_category, points_adjustment, months_since_effective_min, months_since_effective_max) VALUES
('first_oep_no_contact', 'First OEP no post-enrollment contact', 'first_oep', 18, 2, 6),
('first_oep_30_day_only', 'First OEP had 30-day check-in only', 'first_oep', 12, 2, 6),
('first_oep_30_60_day', 'First OEP had 30+60 day check-ins', 'first_oep', 5, 2, 6),
('first_oep_all_checkpoints', 'First OEP all checkpoints completed', 'first_oep', 0, 2, 6);

-- ============================================================================
-- CALL OUTCOME MODAL DATA
-- Stores agent call outcomes for continuous learning
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  communication_id UUID REFERENCES communications(id),

  -- Outcome category
  outcome_category VARCHAR(50) NOT NULL CHECK (outcome_category IN (
    'retained', 'at_risk', 'lost', 'no_contact'
  )),

  -- Specific outcome
  outcome_code VARCHAR(100) NOT NULL,
  outcome_label VARCHAR(255) NOT NULL,

  -- Score adjustment from this outcome
  score_adjustment INTEGER NOT NULL DEFAULT 0,

  -- For lost clients
  churn_reason_id UUID REFERENCES churn_reasons(id),

  -- For callback scheduled
  callback_date TIMESTAMP,

  -- Notes
  notes TEXT,

  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_outcomes_client ON call_outcomes(client_id);
CREATE INDEX IF NOT EXISTS idx_call_outcomes_category ON call_outcomes(outcome_category);
CREATE INDEX IF NOT EXISTS idx_call_outcomes_date ON call_outcomes(recorded_at DESC);

-- Insert call outcome options from spec
CREATE TABLE IF NOT EXISTS call_outcome_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_category VARCHAR(50) NOT NULL,
  outcome_code VARCHAR(100) UNIQUE NOT NULL,
  outcome_label VARCHAR(255) NOT NULL,
  score_adjustment INTEGER NOT NULL DEFAULT 0,
  requires_churn_reason BOOLEAN DEFAULT false,
  requires_callback_date BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO call_outcome_options (outcome_category, outcome_code, outcome_label, score_adjustment, display_order) VALUES
-- RETAINED
('retained', 'staying_no_changes', 'Staying with current plan - No changes', -15, 1),
('retained', 'staying_questions_answered', 'Staying with current plan - Had questions answered', -12, 2),
('retained', 'staying_scheduled_review', 'Staying with current plan - Scheduled annual review', -18, 3),
('retained', 'switching_same_carrier', 'Switching plans - Same carrier (still AOR)', -10, 4),
('retained', 'switching_different_carrier', 'Switching plans - Different carrier (still AOR)', -8, 5),

-- AT RISK
('at_risk', 'undecided_followup', 'Undecided - Needs follow-up', 5, 10),
('at_risk', 'considering_options', 'Considering other options - Scheduled review', 10, 11),
('at_risk', 'unhappy_plan', 'Unhappy with plan - Working on solution', 8, 12),
('at_risk', 'unhappy_agent', 'Unhappy with agent/service - Potential loss', 15, 13),

-- LOST (requires churn reason)
('lost', 'switched_agent_same_carrier', 'Switched to another agent - Same carrier', 0, 20),
('lost', 'switched_agent_different_carrier', 'Switched to another agent - Different carrier', 0, 21),
('lost', 'going_direct', 'Going direct through carrier', 0, 22),
('lost', 'left_ma', 'Left Medicare Advantage (Original Medicare/Medigap)', 0, 23),
('lost', 'moved_out_area', 'Moved out of service area', 0, 24),
('lost', 'deceased', 'Deceased', 0, 25),

-- NO CONTACT
('no_contact', 'no_answer_voicemail', 'No answer - Left voicemail', 2, 30),
('no_contact', 'no_answer_no_vm', 'No answer - No voicemail left', 3, 31),
('no_contact', 'wrong_number', 'Wrong number / Disconnected', 10, 32),
('no_contact', 'callback_scheduled', 'Callback requested - Scheduled', 0, 33);

UPDATE call_outcome_options SET requires_churn_reason = true WHERE outcome_category = 'lost';
UPDATE call_outcome_options SET requires_callback_date = true WHERE outcome_code = 'callback_scheduled';

-- ============================================================================
-- RECENCY MODIFIERS FOR UTILIZATION EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recency_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  days_ago_min INTEGER NOT NULL,
  days_ago_max INTEGER NOT NULL,
  multiplier DECIMAL(4, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO recency_modifiers (days_ago_min, days_ago_max, multiplier) VALUES
(0, 30, 1.5),
(31, 60, 1.25),
(61, 90, 1.0),
(91, 999999, 0.5);

-- ============================================================================
-- AGENT FOLLOW-UP CREDIT FOR UTILIZATION EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS followup_credit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_type VARCHAR(100) NOT NULL,
  days_to_followup_min INTEGER NOT NULL,
  days_to_followup_max INTEGER NOT NULL,
  point_reduction_percent INTEGER NOT NULL, -- e.g., 50 = -50% points
  is_active BOOLEAN DEFAULT true
);

INSERT INTO followup_credit_rules (followup_type, days_to_followup_min, days_to_followup_max, point_reduction_percent) VALUES
('called_within_7_days', 0, 7, 50),
('called_within_14_days', 8, 14, 30),
('called_within_30_days', 15, 30, 15),
('never_followed_up', 31, 999999, 0),
('client_mentioned_resolved', 0, 999999, 60);

-- ============================================================================
-- REAL-TIME ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id), -- Alert recipient

  -- Alert details
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'emergency', 'urgent', 'warning', 'info'
  )),
  alert_code VARCHAR(100) NOT NULL,
  alert_title VARCHAR(255) NOT NULL,
  alert_message TEXT NOT NULL,

  -- Response window
  response_window_hours INTEGER, -- e.g., 24 = call within 24 hours
  response_due_at TIMESTAMP,

  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'resolved', 'dismissed', 'expired'
  )),

  -- Resolution
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  -- Push notification sent?
  push_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON risk_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_client ON risk_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON risk_alerts(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_alerts_type ON risk_alerts(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_due ON risk_alerts(response_due_at) WHERE status = 'active';

-- ============================================================================
-- MORNING BRIEFING DATA TABLE
-- Pre-computed daily briefing for each agent
-- ============================================================================

CREATE TABLE IF NOT EXISTS morning_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  briefing_date DATE NOT NULL,

  -- Summary stats
  total_clients INTEGER NOT NULL DEFAULT 0,
  severe_critical_count INTEGER DEFAULT 0,
  severe_critical_new INTEGER DEFAULT 0,
  high_elevated_count INTEGER DEFAULT 0,
  high_elevated_change INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_stable_count INTEGER DEFAULT 0,

  -- Priority clients (JSONB array)
  immediate_attention JSONB DEFAULT '[]', -- [{clientId, name, score, reason}]
  biggest_movers_up JSONB DEFAULT '[]',
  biggest_movers_down JSONB DEFAULT '[]',

  -- Generation time
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Was briefing viewed?
  viewed_at TIMESTAMP,

  UNIQUE(user_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS idx_briefing_user_date ON morning_briefings(user_id, briefing_date DESC);

-- ============================================================================
-- CMS INTEGRATION DATA TABLES
-- ============================================================================

-- CMS Plan Data (from Plan Finder API)
CREATE TABLE IF NOT EXISTS cms_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(20) NOT NULL,
  plan_id VARCHAR(10) NOT NULL,
  segment_id VARCHAR(10),

  -- Plan details
  plan_name VARCHAR(500) NOT NULL,
  organization_name VARCHAR(500),
  plan_type VARCHAR(100), -- HMO, PPO, PFFS, etc.

  -- Geographic
  state VARCHAR(2),
  county_code VARCHAR(5),

  -- Costs
  monthly_premium_cents INTEGER,
  annual_deductible_cents INTEGER,
  moop_cents INTEGER, -- Maximum out of pocket

  -- Ratings
  overall_star_rating DECIMAL(2, 1),

  -- Part D
  has_part_d BOOLEAN DEFAULT false,
  part_d_deductible_cents INTEGER,

  -- SNP Type
  snp_type VARCHAR(50), -- DSNP, CSNP, ISNP, etc.

  -- Year
  plan_year INTEGER NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(contract_id, plan_id, segment_id, plan_year)
);

CREATE INDEX IF NOT EXISTS idx_cms_plans_county ON cms_plans(county_code, plan_year);
CREATE INDEX IF NOT EXISTS idx_cms_plans_carrier ON cms_plans(organization_name);
CREATE INDEX IF NOT EXISTS idx_cms_plans_type ON cms_plans(plan_type);

-- CMS Formulary Data
CREATE TABLE IF NOT EXISTS cms_formulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(20) NOT NULL,
  plan_id VARCHAR(10) NOT NULL,

  -- Drug details
  rxcui VARCHAR(20) NOT NULL,
  ndc VARCHAR(15),
  drug_name VARCHAR(500) NOT NULL,

  -- Formulary status
  tier INTEGER, -- 1-6
  tier_name VARCHAR(100),
  requires_prior_auth BOOLEAN DEFAULT false,
  requires_step_therapy BOOLEAN DEFAULT false,
  quantity_limit_applicable BOOLEAN DEFAULT false,
  quantity_limit_amount INTEGER,
  quantity_limit_days INTEGER,

  -- Part D specific
  coverage_gap_flag BOOLEAN DEFAULT false,
  specialty_tier BOOLEAN DEFAULT false,

  -- Year
  formulary_year INTEGER NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(contract_id, plan_id, rxcui, formulary_year)
);

CREATE INDEX IF NOT EXISTS idx_formulary_plan ON cms_formulary(contract_id, plan_id, formulary_year);
CREATE INDEX IF NOT EXISTS idx_formulary_drug ON cms_formulary(rxcui);
CREATE INDEX IF NOT EXISTS idx_formulary_ndc ON cms_formulary(ndc);

-- CMS Provider Network Data
CREATE TABLE IF NOT EXISTS cms_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi VARCHAR(20) NOT NULL,

  -- Provider details
  provider_name VARCHAR(500) NOT NULL,
  provider_type VARCHAR(100), -- Individual, Organization
  specialty VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_providers_npi ON cms_providers(npi);
CREATE INDEX IF NOT EXISTS idx_providers_specialty ON cms_providers(specialty);
CREATE INDEX IF NOT EXISTS idx_providers_zip ON cms_providers(zip);

-- Plan-Provider Network mapping
CREATE TABLE IF NOT EXISTS cms_plan_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES cms_plans(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES cms_providers(id) ON DELETE CASCADE,

  -- Network status
  network_tier VARCHAR(50), -- preferred, standard, etc.
  accepting_patients BOOLEAN DEFAULT true,

  -- Effective dates
  effective_date DATE,
  termination_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(plan_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_providers_plan ON cms_plan_providers(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_providers_provider ON cms_plan_providers(provider_id);

-- ZIP Code Demographics (from Census ACS API)
CREATE TABLE IF NOT EXISTS zip_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code VARCHAR(10) NOT NULL,

  -- Population
  total_population INTEGER,
  population_65_plus INTEGER,
  population_65_plus_percent DECIMAL(5, 2),

  -- Income
  median_household_income INTEGER,
  poverty_rate_percent DECIMAL(5, 2),

  -- Medicare specific
  medicare_enrollment INTEGER,
  ma_penetration_rate DECIMAL(5, 2),

  -- Risk categorization
  is_high_senior_zip BOOLEAN GENERATED ALWAYS AS (population_65_plus_percent >= 25) STORED,
  is_low_income_zip BOOLEAN GENERATED ALWAYS AS (poverty_rate_percent >= 20) STORED,

  -- Data year
  data_year INTEGER NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(zip_code, data_year)
);

CREATE INDEX IF NOT EXISTS idx_zip_demo_zip ON zip_demographics(zip_code);
CREATE INDEX IF NOT EXISTS idx_zip_demo_high_senior ON zip_demographics(is_high_senior_zip) WHERE is_high_senior_zip = true;
CREATE INDEX IF NOT EXISTS idx_zip_demo_low_income ON zip_demographics(is_low_income_zip) WHERE is_low_income_zip = true;

-- County Plan Competition Summary
CREATE TABLE IF NOT EXISTS county_competition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_fips VARCHAR(5) NOT NULL,
  state VARCHAR(2) NOT NULL,
  county_name VARCHAR(255),

  -- Competition metrics
  total_plans INTEGER DEFAULT 0,
  new_plans_this_year INTEGER DEFAULT 0,
  zero_premium_plans INTEGER DEFAULT 0,
  max_star_rating DECIMAL(2, 1),
  plans_with_high_stars INTEGER DEFAULT 0, -- 4.5+

  -- Market data
  total_ma_enrollment INTEGER,
  ma_penetration_rate DECIMAL(5, 2),

  -- Risk categorization
  competition_level VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN total_plans >= 11 THEN 'high'
      WHEN total_plans >= 7 THEN 'moderate'
      ELSE 'low'
    END
  ) STORED,

  -- Data year
  data_year INTEGER NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(county_fips, data_year)
);

CREATE INDEX IF NOT EXISTS idx_county_comp_fips ON county_competition(county_fips);
CREATE INDEX IF NOT EXISTS idx_county_comp_level ON county_competition(competition_level);

-- ============================================================================
-- MODEL PERFORMANCE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID REFERENCES ml_model_versions(id),

  -- Time period
  metric_date DATE NOT NULL,
  metric_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly

  -- Core metrics
  precision_score DECIMAL(5, 4),
  recall_score DECIMAL(5, 4),
  f1_score DECIMAL(5, 4),
  auc_roc DECIMAL(5, 4),
  false_positive_rate DECIMAL(5, 4),
  false_negative_rate DECIMAL(5, 4),

  -- Lead time
  avg_lead_time_days INTEGER, -- Days before churn that prediction was made

  -- Prediction counts
  total_predictions INTEGER DEFAULT 0,
  true_positives INTEGER DEFAULT 0,
  true_negatives INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,

  -- Category accuracy
  severe_accuracy DECIMAL(5, 4),
  critical_accuracy DECIMAL(5, 4),
  high_accuracy DECIMAL(5, 4),
  elevated_accuracy DECIMAL(5, 4),
  medium_accuracy DECIMAL(5, 4),
  low_stable_accuracy DECIMAL(5, 4),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(model_version_id, metric_date, metric_period)
);

CREATE INDEX IF NOT EXISTS idx_model_perf_date ON model_performance_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_model_perf_version ON model_performance_metrics(model_version_id);

-- ============================================================================
-- INTERVENTION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Risk state when intervention was made
  pre_intervention_score INTEGER NOT NULL,
  risk_category VARCHAR(20) NOT NULL,

  -- Intervention type
  intervention_type VARCHAR(100) NOT NULL CHECK (intervention_type IN (
    'benefits_review_call',
    'drug_cost_comparison',
    'plan_switch_same_aor',
    'phone_checkin',
    'text_checkin',
    'email_outreach',
    'in_person_meeting',
    'problem_resolution',
    'annual_review',
    'aep_review',
    'oep_review',
    'other'
  )),

  -- Outcome (tracked after time passes)
  outcome VARCHAR(50) CHECK (outcome IN (
    'retained', 'churned', 'pending', 'unknown'
  )) DEFAULT 'pending',

  -- Post-intervention score (after 30 days)
  post_intervention_score INTEGER,

  notes TEXT,

  intervention_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  outcome_recorded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interventions_client ON interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_type ON interventions(intervention_type);
CREATE INDEX IF NOT EXISTS idx_interventions_outcome ON interventions(outcome);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(intervention_date DESC);

-- ============================================================================
-- LEARNING WEIGHT ADJUSTMENTS
-- Track recommended and approved weight changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS weight_adjustment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which factor
  risk_factor_id UUID NOT NULL REFERENCES risk_factors(id),

  -- Current vs recommended
  current_weight INTEGER NOT NULL,
  recommended_weight INTEGER NOT NULL,
  weight_change INTEGER NOT NULL,

  -- Basis for recommendation
  sample_size INTEGER NOT NULL, -- Number of churns analyzed
  confidence_score DECIMAL(5, 4),
  correlation_strength DECIMAL(5, 4),

  -- Reasoning
  reasoning TEXT,

  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'applied'
  )),

  -- Admin approval
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  -- When was this applied
  applied_at TIMESTAMP,

  -- Recommendation period
  analysis_start_date DATE,
  analysis_end_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_weight_adj_status ON weight_adjustment_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_weight_adj_factor ON weight_adjustment_recommendations(risk_factor_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_sep_status_updated_at BEFORE UPDATE ON client_sep_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_alerts_updated_at BEFORE UPDATE ON risk_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_plans_updated_at BEFORE UPDATE ON cms_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_providers_updated_at BEFORE UPDATE ON cms_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zip_demographics_updated_at BEFORE UPDATE ON zip_demographics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_county_competition_updated_at BEFORE UPDATE ON county_competition
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
