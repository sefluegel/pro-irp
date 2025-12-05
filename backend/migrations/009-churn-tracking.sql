-- Migration 009: Churn Tracking & Agent Feedback System
-- Stores churn events, reasons, and agent feedback for ML training
-- ============================================================================

-- ============================================================================
-- CHURN REASONS (Lookup table)
-- Predefined reasons why clients leave - agents select from these
-- ============================================================================
CREATE TABLE IF NOT EXISTS churn_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reason details
  reason_code VARCHAR(100) UNIQUE NOT NULL,
  reason_name VARCHAR(255) NOT NULL,
  reason_category VARCHAR(100) NOT NULL, -- cost, coverage, service, life_event, competitive, other

  -- Description (help text for agents)
  description TEXT,

  -- Is this a preventable churn?
  is_preventable BOOLEAN DEFAULT true,

  -- How much does this reason contribute to ML training
  ml_training_weight DECIMAL(5, 2) DEFAULT 1.0,

  -- Display order
  display_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_churn_reasons_code ON churn_reasons(reason_code);
CREATE INDEX IF NOT EXISTS idx_churn_reasons_category ON churn_reasons(reason_category);
CREATE INDEX IF NOT EXISTS idx_churn_reasons_active ON churn_reasons(is_active) WHERE is_active = true;

-- ============================================================================
-- CHURN EVENTS
-- Records when a client leaves, with agent-provided details
-- THIS IS THE GOLD MINE FOR ML TRAINING
-- ============================================================================
CREATE TABLE IF NOT EXISTS churn_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- When did they churn
  churn_date DATE NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Where did they go?
  new_carrier VARCHAR(255),
  new_plan VARCHAR(255),
  new_plan_type VARCHAR(100),

  -- Primary reason (required)
  primary_reason_id UUID NOT NULL REFERENCES churn_reasons(id),

  -- Secondary reasons (optional, up to 3)
  secondary_reason_ids UUID[], -- Array of churn_reason IDs

  -- Agent's notes (free text - valuable for understanding)
  agent_notes TEXT,

  -- What could have prevented this?
  prevention_notes TEXT,

  -- Was this client winnable?
  was_preventable BOOLEAN,
  prevention_opportunity VARCHAR(100), -- early_outreach, better_plan_match, cost_assistance, etc.

  -- Warning signs the agent noticed
  warning_signs TEXT[], -- Array of free text observations

  -- Pre-churn snapshot (for ML training)
  -- Captures the client's state right before they left
  pre_churn_risk_score INTEGER,
  pre_churn_factors JSONB, -- Snapshot of client_risk_factors at time of churn
  days_since_last_contact INTEGER,
  total_contacts_last_90_days INTEGER,

  -- Prescription snapshot at churn
  active_medications JSONB, -- List of medications client was on
  recent_rx_changes JSONB, -- Changes in 90 days before churn

  -- Logged by
  logged_by UUID NOT NULL REFERENCES users(id),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Verification (manager can verify agent's assessment)
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One churn event per client (they can only leave once per period)
  -- If they come back and leave again, that's a new client relationship
  UNIQUE(client_id, churn_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_churn_client ON churn_events(client_id);
CREATE INDEX IF NOT EXISTS idx_churn_date ON churn_events(churn_date DESC);
CREATE INDEX IF NOT EXISTS idx_churn_reason ON churn_events(primary_reason_id);
CREATE INDEX IF NOT EXISTS idx_churn_carrier ON churn_events(new_carrier);
CREATE INDEX IF NOT EXISTS idx_churn_logged_by ON churn_events(logged_by);
CREATE INDEX IF NOT EXISTS idx_churn_preventable ON churn_events(was_preventable);
CREATE INDEX IF NOT EXISTS idx_churn_logged_at ON churn_events(logged_at DESC);

-- ============================================================================
-- WIN-BACK ATTEMPTS
-- Track attempts to win back churned clients
-- ============================================================================
CREATE TABLE IF NOT EXISTS winback_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  churn_event_id UUID NOT NULL REFERENCES churn_events(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Attempt details
  attempt_date DATE NOT NULL,
  attempt_type VARCHAR(50) NOT NULL, -- call, email, sms, in_person, mail

  -- Outcome
  outcome VARCHAR(50) NOT NULL, -- no_response, declined, considering, won_back
  outcome_notes TEXT,

  -- If won back
  won_back_date DATE,
  won_back_plan VARCHAR(255),

  -- Logged by
  logged_by UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_winback_churn ON winback_attempts(churn_event_id);
CREATE INDEX IF NOT EXISTS idx_winback_client ON winback_attempts(client_id);
CREATE INDEX IF NOT EXISTS idx_winback_outcome ON winback_attempts(outcome);
CREATE INDEX IF NOT EXISTS idx_winback_date ON winback_attempts(attempt_date DESC);

-- ============================================================================
-- RETENTION SUCCESS STORIES
-- Track clients who were at risk but DIDN'T churn (equally important for ML)
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_successes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- When was this recorded
  recorded_date DATE NOT NULL,

  -- What was their risk level before intervention
  pre_intervention_risk_score INTEGER NOT NULL,
  risk_factors_present JSONB, -- What factors were triggering

  -- What intervention was done
  intervention_type VARCHAR(100) NOT NULL, -- proactive_call, plan_review, cost_assistance, etc.
  intervention_notes TEXT,

  -- Agent assessment
  what_worked TEXT, -- Why did the client stay?

  -- Logged by
  logged_by UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retention_client ON retention_successes(client_id);
CREATE INDEX IF NOT EXISTS idx_retention_date ON retention_successes(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_retention_risk ON retention_successes(pre_intervention_risk_score);
CREATE INDEX IF NOT EXISTS idx_retention_intervention ON retention_successes(intervention_type);

-- ============================================================================
-- COMPETITIVE INTELLIGENCE
-- Track competitor plans that clients are leaving for
-- ============================================================================
CREATE TABLE IF NOT EXISTS competitor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  carrier_name VARCHAR(255) NOT NULL,
  plan_name VARCHAR(255),
  plan_type VARCHAR(100),

  -- Aggregated stats (updated periodically)
  clients_lost_to INTEGER DEFAULT 0,
  last_loss_date DATE,

  -- Notes about this competitor
  notes TEXT,
  known_advantages TEXT[], -- What are they offering that we're not?

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(carrier_name, plan_name)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_competitor_carrier ON competitor_plans(carrier_name);
CREATE INDEX IF NOT EXISTS idx_competitor_losses ON competitor_plans(clients_lost_to DESC);

-- ============================================================================
-- SEED DATA: Churn Reasons
-- ============================================================================
INSERT INTO churn_reasons (reason_code, reason_name, reason_category, description, is_preventable, display_order) VALUES
  -- Cost reasons
  ('premium_too_high', 'Premium too high', 'cost', 'Monthly premium was too expensive', true, 1),
  ('copay_too_high', 'Copays too high', 'cost', 'Doctor visit or prescription copays too expensive', true, 2),
  ('deductible_too_high', 'Deductible too high', 'cost', 'Annual deductible was too high', true, 3),
  ('drug_costs', 'Prescription drug costs', 'cost', 'Out-of-pocket drug costs were too high', true, 4),
  ('found_cheaper_plan', 'Found cheaper plan', 'cost', 'Found a competing plan with lower costs', true, 5),

  -- Coverage reasons
  ('doctor_not_covered', 'Doctor not in network', 'coverage', 'Primary care physician or specialist not in network', true, 10),
  ('hospital_not_covered', 'Hospital not in network', 'coverage', 'Preferred hospital not in network', true, 11),
  ('drug_not_covered', 'Medication not covered', 'coverage', 'Needed medication not on formulary or tier too high', true, 12),
  ('service_not_covered', 'Service not covered', 'coverage', 'Needed service (dental, vision, hearing, etc.) not covered', true, 13),
  ('better_coverage_elsewhere', 'Better coverage elsewhere', 'coverage', 'Found plan with better coverage for their needs', true, 14),
  ('prior_auth_issues', 'Prior authorization problems', 'coverage', 'Too many prior authorization requirements', true, 15),

  -- Service reasons
  ('poor_customer_service', 'Poor customer service', 'service', 'Unhappy with plan customer service', true, 20),
  ('claim_denial', 'Claim denied', 'service', 'Had a claim denied and was frustrated', true, 21),
  ('agent_relationship', 'Agent relationship issue', 'service', 'Issue with their agent relationship', true, 22),
  ('long_wait_times', 'Long wait times', 'service', 'Experienced long wait times for appointments or phone support', true, 23),

  -- Life events
  ('moved_out_of_area', 'Moved out of service area', 'life_event', 'Client relocated outside plan service area', false, 30),
  ('nursing_home', 'Entered nursing home', 'life_event', 'Client entered long-term care facility', false, 31),
  ('deceased', 'Deceased', 'life_event', 'Client passed away', false, 32),
  ('lost_medicaid', 'Lost Medicaid eligibility', 'life_event', 'Lost dual eligibility (DSNP clients)', false, 33),
  ('gained_employer_coverage', 'Gained employer coverage', 'life_event', 'Obtained coverage through employer', false, 34),
  ('spouse_plan', 'Joined spouse plan', 'life_event', 'Joined spouse''s Medicare plan', false, 35),

  -- Competitive
  ('agent_recruitment', 'Recruited by another agent', 'competitive', 'Another agent actively recruited them', true, 40),
  ('carrier_marketing', 'Carrier direct marketing', 'competitive', 'Responded to direct marketing from competitor', true, 41),
  ('family_recommendation', 'Family/friend recommendation', 'competitive', 'Family or friend recommended different plan', true, 42),
  ('tv_advertising', 'TV/Radio advertising', 'competitive', 'Responded to TV or radio advertisement', true, 43),

  -- Other
  ('confused_switched', 'Confused/Accidentally switched', 'other', 'Client was confused and didn''t mean to switch', true, 50),
  ('never_used_plan', 'Never used the plan', 'other', 'Client never engaged with plan benefits', true, 51),
  ('unknown', 'Unknown/Couldn''t determine', 'other', 'Could not determine reason for leaving', true, 99)

ON CONFLICT (reason_code) DO NOTHING;

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE TRIGGER update_churn_events_updated_at BEFORE UPDATE ON churn_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitor_plans_updated_at BEFORE UPDATE ON competitor_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function to update client status when churn is logged
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_churn_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Update client status to churned
  UPDATE clients
  SET status = 'churned',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.client_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_churn_event
  AFTER INSERT ON churn_events
  FOR EACH ROW EXECUTE FUNCTION handle_churn_event();

-- ============================================================================
-- COMPLETE!
-- ============================================================================
