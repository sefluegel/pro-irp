-- Migration 008: Risk Scoring & Machine Learning Infrastructure
-- Stores risk factors, score history, and ML model data
-- ============================================================================

-- ============================================================================
-- RISK FACTORS DEFINITION
-- Configurable risk factors with weights (rule-based starting point)
-- Weights can be adjusted manually or by ML model
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Factor identification
  factor_code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'no_contact_30_days'
  factor_name VARCHAR(255) NOT NULL, -- Human readable name
  factor_category VARCHAR(100) NOT NULL, -- engagement, prescription, plan, demographic, etc.

  -- Description
  description TEXT,

  -- Scoring
  base_weight INTEGER NOT NULL DEFAULT 0, -- Points added to risk score
  max_weight INTEGER, -- Cap for factors that can stack

  -- ML adjustment
  ml_weight DECIMAL(10, 4), -- ML-adjusted weight (once trained)
  ml_confidence DECIMAL(5, 4), -- Confidence in ML weight (0-1)

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_risk_factors_code ON risk_factors(factor_code);
CREATE INDEX IF NOT EXISTS idx_risk_factors_category ON risk_factors(factor_category);
CREATE INDEX IF NOT EXISTS idx_risk_factors_active ON risk_factors(is_active) WHERE is_active = true;

-- ============================================================================
-- CLIENT RISK FACTORS
-- Junction table: which risk factors apply to which clients
-- Updated nightly by the scoring engine
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  risk_factor_id UUID NOT NULL REFERENCES risk_factors(id) ON DELETE CASCADE,

  -- Factor-specific value (e.g., days since contact, drug name)
  factor_value TEXT,
  factor_numeric_value DECIMAL(10, 2), -- For calculations

  -- Contribution to score
  points_contributed INTEGER NOT NULL DEFAULT 0,

  -- When was this factor detected/updated
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Some factors expire (e.g., recent contact clears no_contact factor)

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicates
  UNIQUE(client_id, risk_factor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_risk_client ON client_risk_factors(client_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_factor ON client_risk_factors(risk_factor_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_detected ON client_risk_factors(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_risk_expires ON client_risk_factors(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- RISK SCORE HISTORY
-- Tracks how risk scores change over time (for ML training and reporting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Score at this point in time
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  previous_score INTEGER,
  score_change INTEGER, -- Positive = increased risk

  -- What contributed to this score (snapshot)
  contributing_factors JSONB, -- Array of {factor_code, points}

  -- Scoring method used
  scoring_method VARCHAR(50) DEFAULT 'rule_based', -- rule_based, ml_v1, ml_v2, hybrid

  -- Timestamp
  scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_history_client ON risk_score_history(client_id);
CREATE INDEX IF NOT EXISTS idx_risk_history_scored ON risk_score_history(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_history_score ON risk_score_history(risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_history_change ON risk_score_history(score_change) WHERE score_change != 0;

-- Partition hint: In production, consider partitioning by scored_at for performance

-- ============================================================================
-- ML MODEL VERSIONS
-- Tracks different versions of the ML model as it learns
-- ============================================================================
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Version info
  version_number INTEGER NOT NULL,
  version_name VARCHAR(100),

  -- Model details
  model_type VARCHAR(100) NOT NULL, -- random_forest, gradient_boost, neural_net, etc.
  model_file_path TEXT, -- Path to serialized model file

  -- Training info
  training_started_at TIMESTAMP,
  training_completed_at TIMESTAMP,
  training_samples INTEGER, -- Number of clients used for training
  churn_samples INTEGER, -- Number of churned clients in training

  -- Performance metrics
  accuracy DECIMAL(5, 4),
  precision_score DECIMAL(5, 4),
  recall_score DECIMAL(5, 4),
  f1_score DECIMAL(5, 4),
  auc_roc DECIMAL(5, 4),

  -- Feature importance (learned weights)
  feature_weights JSONB, -- {factor_code: weight}

  -- Status
  status VARCHAR(50) DEFAULT 'training' CHECK (status IN ('training', 'validating', 'active', 'retired', 'failed')),
  is_production BOOLEAN DEFAULT false, -- Currently active model

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ml_model_version ON ml_model_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_ml_model_status ON ml_model_versions(status);
CREATE INDEX IF NOT EXISTS idx_ml_model_production ON ml_model_versions(is_production) WHERE is_production = true;

-- ============================================================================
-- ML PREDICTIONS LOG
-- Stores individual predictions made by ML model (for analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES ml_model_versions(id) ON DELETE CASCADE,

  -- Prediction
  churn_probability DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
  predicted_risk_score INTEGER NOT NULL,

  -- Top factors driving prediction
  top_factors JSONB, -- [{factor_code, contribution}]

  -- Was prediction correct? (filled in when we know the outcome)
  actual_outcome VARCHAR(50), -- churned, retained, unknown
  outcome_recorded_at TIMESTAMP,

  predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ml_pred_client ON ml_predictions(client_id);
CREATE INDEX IF NOT EXISTS idx_ml_pred_model ON ml_predictions(model_version_id);
CREATE INDEX IF NOT EXISTS idx_ml_pred_date ON ml_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_pred_outcome ON ml_predictions(actual_outcome) WHERE actual_outcome IS NOT NULL;

-- ============================================================================
-- SEED DATA: Initial Risk Factors
-- These are the starting rules before ML takes over
-- ============================================================================
INSERT INTO risk_factors (factor_code, factor_name, factor_category, description, base_weight) VALUES
  -- Engagement factors
  ('no_contact_30_days', 'No contact in 30 days', 'engagement', 'Client has not been contacted in over 30 days', 10),
  ('no_contact_60_days', 'No contact in 60 days', 'engagement', 'Client has not been contacted in over 60 days', 20),
  ('no_contact_90_days', 'No contact in 90 days', 'engagement', 'Client has not been contacted in over 90 days', 30),
  ('missed_appointment', 'Missed scheduled appointment', 'engagement', 'Client missed a scheduled appointment', 15),
  ('no_response_outreach', 'No response to outreach', 'engagement', 'Client has not responded to last 3+ contact attempts', 20),

  -- Prescription factors
  ('new_specialty_drug', 'New specialty medication', 'prescription', 'Client started a high-cost specialty drug', 25),
  ('new_medication', 'New medication started', 'prescription', 'Client started any new medication', 5),
  ('medication_discontinued', 'Medication discontinued', 'prescription', 'Client stopped taking a regular medication', 10),
  ('adherence_gap', 'Medication adherence gap', 'prescription', 'Client missed expected refill window', 15),
  ('multiple_new_meds', 'Multiple new medications', 'prescription', 'Client started 3+ new medications recently', 20),
  ('prescriber_change', 'Changed prescriber', 'prescription', 'Client has a new doctor prescribing medications', 10),
  ('high_cost_increase', 'Significant cost increase', 'prescription', 'Client''s out-of-pocket costs increased significantly', 20),

  -- Plan factors
  ('dsnp_client', 'DSNP plan member', 'plan', 'Client is on a Dual Special Needs Plan (historically higher churn)', 15),
  ('new_to_medicare', 'New to Medicare', 'plan', 'Client aged into Medicare within last 12 months', 10),
  ('first_year_plan', 'First year with current plan', 'plan', 'Client is in first year with their current plan', 10),
  ('plan_premium_increase', 'Plan premium increased', 'plan', 'Client''s plan premium went up for next year', 15),
  ('plan_benefit_reduction', 'Plan benefits reduced', 'plan', 'Client''s plan benefits were reduced', 20),
  ('approaching_aep', 'AEP approaching', 'plan', 'Annual Enrollment Period is within 60 days', 10),
  ('during_aep', 'Currently in AEP', 'plan', 'Currently in Annual Enrollment Period', 15),

  -- Demographic factors
  ('age_65_67', 'Age 65-67', 'demographic', 'Recently Medicare eligible, still learning options', 10),
  ('relocated', 'Recently relocated', 'demographic', 'Client moved to a new address', 15),

  -- Historical factors
  ('previous_plan_change', 'Changed plans before', 'history', 'Client has changed plans in the past', 15),
  ('multiple_plan_changes', 'Multiple plan changes', 'history', 'Client has changed plans 2+ times', 25),
  ('complaint_history', 'Previous complaints', 'history', 'Client has logged complaints about plan/service', 20)

ON CONFLICT (factor_code) DO NOTHING;

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE TRIGGER update_risk_factors_updated_at BEFORE UPDATE ON risk_factors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_risk_factors_updated_at BEFORE UPDATE ON client_risk_factors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_model_versions_updated_at BEFORE UPDATE ON ml_model_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETE!
-- ============================================================================
