-- Migration 007: Blue Button 2.0 Integration
-- Stores Medicare beneficiary authorizations and prescription claims data
-- ============================================================================

-- ============================================================================
-- BLUE BUTTON AUTHORIZATIONS
-- Stores OAuth2 tokens for each client who has authorized Blue Button access
-- ============================================================================
CREATE TABLE IF NOT EXISTS blue_button_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Medicare Beneficiary Identifier (from Blue Button)
  medicare_beneficiary_id VARCHAR(255),

  -- OAuth2 Tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP NOT NULL,
  scope TEXT, -- Space-separated scopes granted

  -- Status tracking
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(50),
  last_error TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One authorization per client
  UNIQUE(client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bb_auth_client ON blue_button_authorizations(client_id);
CREATE INDEX IF NOT EXISTS idx_bb_auth_status ON blue_button_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_bb_auth_expires ON blue_button_authorizations(expires_at);
CREATE INDEX IF NOT EXISTS idx_bb_auth_last_sync ON blue_button_authorizations(last_sync_at);

-- ============================================================================
-- PRESCRIPTION CLAIMS
-- Stores Part D prescription drug claims from Blue Button
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Claim identifiers (from CMS)
  claim_id VARCHAR(255), -- CMS claim ID
  claim_group VARCHAR(255), -- Claim group for related claims

  -- Drug information
  drug_name VARCHAR(500), -- Brand or generic name
  generic_name VARCHAR(500),
  ndc_code VARCHAR(20), -- National Drug Code (11-digit)
  rxnorm_code VARCHAR(20), -- RxNorm concept ID
  drug_tier VARCHAR(50), -- Formulary tier (1-5, specialty)

  -- Prescription details
  quantity DECIMAL(10, 2),
  days_supply INTEGER,
  refills_remaining INTEGER,
  dose_strength VARCHAR(100),
  dose_form VARCHAR(100), -- tablet, capsule, injection, etc.

  -- Fill information
  fill_date DATE NOT NULL,
  fill_number INTEGER, -- 1 = original, 2+ = refill
  pharmacy_name VARCHAR(255),
  pharmacy_npi VARCHAR(20),
  pharmacy_type VARCHAR(50), -- retail, mail-order, specialty

  -- Prescriber information
  prescriber_npi VARCHAR(20),
  prescriber_name VARCHAR(255),
  prescriber_specialty VARCHAR(255),

  -- Cost breakdown (in cents to avoid floating point issues)
  total_cost_cents INTEGER,
  patient_pay_cents INTEGER,
  medicare_paid_cents INTEGER,
  plan_paid_cents INTEGER,

  -- Low Income Subsidy / Extra Help
  lis_level VARCHAR(50), -- Full, Partial, None
  coverage_phase VARCHAR(50), -- Deductible, Initial, Gap, Catastrophic

  -- Raw FHIR data (for reference)
  fhir_resource_id VARCHAR(255),
  fhir_raw JSONB,

  -- Metadata
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate claims
  UNIQUE(client_id, claim_id)
);

-- Indexes for prescription queries
CREATE INDEX IF NOT EXISTS idx_rx_claims_client ON prescription_claims(client_id);
CREATE INDEX IF NOT EXISTS idx_rx_claims_fill_date ON prescription_claims(fill_date DESC);
CREATE INDEX IF NOT EXISTS idx_rx_claims_drug_name ON prescription_claims(drug_name);
CREATE INDEX IF NOT EXISTS idx_rx_claims_ndc ON prescription_claims(ndc_code);
CREATE INDEX IF NOT EXISTS idx_rx_claims_prescriber ON prescription_claims(prescriber_npi);
CREATE INDEX IF NOT EXISTS idx_rx_claims_pharmacy ON prescription_claims(pharmacy_npi);
CREATE INDEX IF NOT EXISTS idx_rx_claims_fetched ON prescription_claims(fetched_at);

-- Full-text search on drug names
CREATE INDEX IF NOT EXISTS idx_rx_claims_drug_search ON prescription_claims USING gin(
  to_tsvector('english', coalesce(drug_name, '') || ' ' || coalesce(generic_name, ''))
);

-- ============================================================================
-- PRESCRIPTION CHANGES
-- Tracks changes in prescriptions for risk scoring
-- This is the key table for the AI/ML system
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  prescription_claim_id UUID REFERENCES prescription_claims(id) ON DELETE SET NULL,

  -- Change type
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'new_medication',      -- Client started a new drug
    'discontinued',        -- Drug not refilled (gap > days_supply + 30)
    'dosage_increase',     -- Same drug, higher dose
    'dosage_decrease',     -- Same drug, lower dose
    'switched_generic',    -- Brand to generic or vice versa
    'switched_drug',       -- Changed to different drug in same class
    'new_prescriber',      -- Same drug, new doctor
    'pharmacy_change',     -- Same drug, new pharmacy
    'adherence_gap',       -- Missed expected refill window
    'specialty_drug_added' -- High-cost specialty medication added
  )),

  -- Drug information
  drug_name VARCHAR(500),
  ndc_code VARCHAR(20),
  drug_class VARCHAR(255), -- Therapeutic class (e.g., "Antihypertensives")

  -- Change details
  previous_value TEXT, -- Previous dose, prescriber, etc.
  new_value TEXT,

  -- Risk impact (will be used by ML model)
  risk_weight INTEGER DEFAULT 0, -- Contribution to risk score

  -- Detection info
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  detection_method VARCHAR(50) DEFAULT 'nightly_sync', -- nightly_sync, manual, real_time

  -- Has this been reviewed by agent?
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rx_changes_client ON prescription_changes(client_id);
CREATE INDEX IF NOT EXISTS idx_rx_changes_type ON prescription_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_rx_changes_detected ON prescription_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_changes_drug ON prescription_changes(drug_name);
CREATE INDEX IF NOT EXISTS idx_rx_changes_reviewed ON prescription_changes(reviewed_at) WHERE reviewed_at IS NULL;

-- ============================================================================
-- BLUE BUTTON SYNC LOG
-- Tracks each sync operation for debugging and monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS blue_button_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id UUID NOT NULL REFERENCES blue_button_authorizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Sync details
  sync_type VARCHAR(50) DEFAULT 'full', -- full, incremental
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),

  -- Results
  claims_fetched INTEGER DEFAULT 0,
  new_claims INTEGER DEFAULT 0,
  changes_detected INTEGER DEFAULT 0,
  error_message TEXT,

  -- API metrics (for rate limiting awareness)
  api_calls_made INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bb_sync_auth ON blue_button_sync_log(authorization_id);
CREATE INDEX IF NOT EXISTS idx_bb_sync_client ON blue_button_sync_log(client_id);
CREATE INDEX IF NOT EXISTS idx_bb_sync_started ON blue_button_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bb_sync_status ON blue_button_sync_log(status);

-- ============================================================================
-- Update trigger for blue_button_authorizations
-- ============================================================================
CREATE TRIGGER update_bb_auth_updated_at BEFORE UPDATE ON blue_button_authorizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETE!
-- ============================================================================
