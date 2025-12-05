-- Pro IRP Database Schema
-- Designed for scale: supports FMOs → Managers → Agents hierarchy
-- Built for thousands of users and millions of client records

-- ============================================================================
-- ORGANIZATIONS (FMOs and Agencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('fmo', 'agency')),
  parent_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- ============================================================================
-- USERS (Agents, Managers, FMOs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'manager', 'fmo', 'admin')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Indexes for fast user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- CLIENTS (Medicare customers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Personal Info
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(50),
  zip VARCHAR(20),
  dob DATE,

  -- Insurance Info
  carrier VARCHAR(255),
  plan VARCHAR(255),
  plan_type VARCHAR(100),
  effective_date DATE,

  -- Retention Tracking
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'at_risk', 'churned', 'prospect')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  last_contact_date TIMESTAMP,
  next_contact_date TIMESTAMP,

  -- Engagement Metrics
  total_contacts INTEGER DEFAULT 0,
  total_policies INTEGER DEFAULT 0,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,

  -- Notes
  notes TEXT,
  tags TEXT[], -- PostgreSQL array for flexible tagging

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast client queries (critical for scale)
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_risk_score ON clients(risk_score);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_next_contact ON clients(next_contact_date);

-- Full-text search index for name/email search
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING gin(
  to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
);

-- ============================================================================
-- COMMUNICATIONS (Calls, Emails, SMS, Appointments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Communication Details
  type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'sms', 'appointment', 'note')),
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  outcome VARCHAR(100),

  -- Scheduling (for appointments)
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Metadata (flexible JSON for call duration, recording URLs, etc.)
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for communication queries
CREATE INDEX IF NOT EXISTS idx_comms_client ON communications(client_id);
CREATE INDEX IF NOT EXISTS idx_comms_user ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_comms_type ON communications(type);
CREATE INDEX IF NOT EXISTS idx_comms_created ON communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_scheduled ON communications(scheduled_at);

-- ============================================================================
-- TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assignment
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Task Details
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Scheduling
  due_date TIMESTAMP,
  completed_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for task queries
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- ============================================================================
-- UPLOADS (Documents - SOAs, PTCs, Enrollment Forms)
-- ============================================================================
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- File Info
  label VARCHAR(255),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INTEGER,

  -- Storage
  storage_path TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for upload queries
CREATE INDEX IF NOT EXISTS idx_uploads_client ON uploads(client_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(uploaded_by);

-- ============================================================================
-- PASSWORD RESETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for reset lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);

-- ============================================================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (Default organization for development)
-- ============================================================================

-- Create default FMO for development
INSERT INTO organizations (id, name, type, parent_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default FMO', 'fmo', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- This schema is designed to scale from 10 users to 100,000+ users
-- Proper indexes ensure fast queries even with millions of records
-- Role-based hierarchy supports FMO → Manager → Agent structure
-- ============================================================================
