-- Migration 002: Production Authentication & Billing Structure (UUID version)
-- Run this migration in your Railway PostgreSQL database

-- ============================================================================
-- 1. PROMO CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) CHECK (discount_type IN ('free_trial', 'percentage', 'fixed_amount')),
  discount_value INTEGER, -- percentage (0-100) or fixed amount in cents
  max_uses INTEGER, -- null = unlimited
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- ============================================================================
-- 2. SUBSCRIPTION PLANS TABLE (for future Stripe integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_per_agent INTEGER NOT NULL, -- in cents (e.g., 5000 = $50.00)
  min_agents INTEGER DEFAULT 1,
  max_agents INTEGER, -- null = unlimited
  billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'quarterly', 'annual')),
  features JSONB, -- store plan features as JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. SUBSCRIPTIONS TABLE (tracks agency subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  agent_count INTEGER DEFAULT 1, -- how many agents they're paying for
  stripe_customer_id VARCHAR(100), -- Stripe customer ID (for future integration)
  stripe_subscription_id VARCHAR(100), -- Stripe subscription ID
  promo_code_id UUID REFERENCES promo_codes(id),
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);

-- ============================================================================
-- 4. AGENT INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL, -- unique invitation token
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON agent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON agent_invitations(email);

-- ============================================================================
-- 5. UPDATE EXISTING TABLES
-- ============================================================================

-- Add promo_code_used to users table (track which promo code was used at signup)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS promo_code_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255); -- track which invitation they accepted

-- Add subscription_id to organizations (link to active subscription)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id),
ADD COLUMN IF NOT EXISTS agent_limit INTEGER DEFAULT 10; -- how many agents they can have

-- ============================================================================
-- 6. INSERT DEFAULT DATA
-- ============================================================================

-- Create pilot promo code (100% free trial for Jan-Mar 2025)
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, valid_until, is_active)
VALUES (
  'PILOT2025',
  'Q1 2025 Pilot Program - Free access Jan 1 - Mar 31',
  'free_trial',
  100,
  10, -- limit to 10 pilot agencies
  '2025-03-31 23:59:59',
  true
) ON CONFLICT (code) DO NOTHING;

-- Create default subscription plan (can be updated later with real pricing)
INSERT INTO subscription_plans (name, description, price_per_agent, min_agents, billing_period, is_active)
VALUES (
  'Standard',
  'Standard plan - billed monthly per agent',
  5000, -- $50.00 per agent per month (placeholder)
  1,
  'monthly',
  true
);

-- ============================================================================
-- 7. UPDATE ROLE VALIDATION
-- ============================================================================

-- Drop old constraint if it exists
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint with updated roles
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'fmo', 'agency', 'agent'));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added promo_codes table for pilot codes and discounts
-- ✅ Added subscription infrastructure (ready for Stripe)
-- ✅ Added agent_invitations table for email-based agent onboarding
-- ✅ Updated users and organizations tables
-- ✅ Created PILOT2025 promo code
-- ✅ Created default subscription plan
-- ✅ Updated role constraints to: admin, fmo, agency, agent

-- Next steps:
-- 1. Update your account to 'admin' role (run: node setup-admin.js your-email@example.com)
-- 2. Log out and log back in
-- 3. Test signup flow with PILOT2025 promo code
