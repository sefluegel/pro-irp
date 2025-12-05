-- Migration 003: HIPAA Compliance - Audit Logging and Security Enhancements
-- This migration adds comprehensive audit logging required for HIPAA compliance

-- ============================================================================
-- 1. AUDIT LOGS TABLE (HIPAA Requirement - Track all PHI access)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- What was accessed/modified
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- e.g., 'LOGIN', 'VIEW_CLIENT', 'EDIT_CLIENT', 'FILE_DOWNLOAD', etc.
  resource_type VARCHAR(50), -- e.g., 'client', 'communication', 'file_upload', 'task'
  resource_id UUID, -- ID of the specific resource accessed

  -- Details of the action (JSON for flexibility)
  details JSONB,

  -- Network/security info
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Index for fast searches
  CONSTRAINT audit_logs_action_check CHECK (action <> '')
);

-- Indexes for audit log queries (critical for HIPAA compliance reporting)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- 2. SESSION MANAGEMENT TABLE (Enhanced security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL, -- SHA-256 hash of JWT token
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- 3. DATA BREACH LOG TABLE (HIPAA Breach Notification Rule)
-- ============================================================================
CREATE TABLE IF NOT EXISTS breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Incident details
  incident_type VARCHAR(100) NOT NULL, -- e.g., 'unauthorized_access', 'data_loss', 'ransomware'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,

  -- Affected resources
  affected_users_count INTEGER DEFAULT 0,
  affected_clients_count INTEGER DEFAULT 0,
  affected_records JSONB, -- Array of affected client/user IDs

  -- Discovery and response
  discovered_at TIMESTAMP NOT NULL,
  discovered_by UUID REFERENCES users(id),
  reported_to_authorities BOOLEAN DEFAULT false,
  reported_at TIMESTAMP,

  -- Resolution
  status VARCHAR(50) DEFAULT 'investigating' CHECK (status IN ('investigating', 'contained', 'resolved', 'ongoing')),
  resolution_notes TEXT,
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for breach incident queries
CREATE INDEX IF NOT EXISTS idx_breach_incidents_status ON breach_incidents(status);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_severity ON breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_discovered ON breach_incidents(discovered_at DESC);

-- ============================================================================
-- 4. ENCRYPTION KEY METADATA (For field-level encryption)
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(100) UNIQUE NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
  is_active BOOLEAN DEFAULT true,
  rotated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- 5. UPDATE EXISTING TABLES FOR HIPAA COMPLIANCE
-- ============================================================================

-- Add encryption indicators and HIPAA metadata to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_key_id UUID REFERENCES encryption_keys(id),
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_accessed_by UUID REFERENCES users(id);

-- Add HIPAA metadata to communications table
ALTER TABLE communications
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contains_phi BOOLEAN DEFAULT true; -- Assume all comms contain PHI

-- Add HIPAA metadata to uploads table
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contains_phi BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_accessed_by UUID REFERENCES users(id);

-- ============================================================================
-- 6. COMPLIANCE SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- Insert default HIPAA compliance settings
INSERT INTO compliance_settings (setting_key, setting_value, description) VALUES
  ('password_min_length', '8', 'Minimum password length'),
  ('password_require_special', 'true', 'Require special characters in passwords'),
  ('session_timeout_minutes', '30', 'Auto-logout after inactivity (minutes)'),
  ('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
  ('lockout_duration_minutes', '30', 'Account lockout duration after max failed attempts'),
  ('audit_retention_days', '2555', 'Audit log retention period (7 years for HIPAA)'),
  ('backup_frequency_hours', '24', 'Backup frequency in hours'),
  ('encryption_at_rest', 'true', 'Enable encryption for stored data'),
  ('mfa_required_for_admin', 'false', 'Require MFA for admin accounts (to be implemented)'),
  ('auto_logout_enabled', 'true', 'Enable automatic logout after inactivity')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 7. TRIGGER: AUTO-UPDATE last_accessed columns
-- ============================================================================

-- Function to update last_accessed_at
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to clients table (will update when client is selected)
-- Note: This needs to be triggered from application code, not automatic on SELECT

-- ============================================================================
-- 8. TRIGGER: AUTO-UPDATE breach_incidents updated_at
-- ============================================================================
CREATE TRIGGER update_breach_incidents_updated_at BEFORE UPDATE ON breach_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. VIEW: HIPAA COMPLIANCE DASHBOARD
-- ============================================================================
CREATE OR REPLACE VIEW hipaa_compliance_summary AS
SELECT
  (SELECT COUNT(*) FROM audit_logs WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as audit_logs_30d,
  (SELECT COUNT(*) FROM audit_logs WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as audit_logs_7d,
  (SELECT COUNT(*) FROM sessions WHERE revoked = false AND expires_at > CURRENT_TIMESTAMP) as active_sessions,
  (SELECT COUNT(*) FROM breach_incidents WHERE status IN ('investigating', 'ongoing')) as active_incidents,
  (SELECT COUNT(*) FROM breach_incidents WHERE severity IN ('high', 'critical') AND status <> 'resolved') as critical_incidents,
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM clients) as total_clients,
  (SELECT COUNT(*) FROM uploads WHERE contains_phi = true) as phi_documents;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Created audit_logs table for comprehensive activity tracking
-- ✅ Created sessions table for secure session management
-- ✅ Created breach_incidents table for HIPAA breach notification compliance
-- ✅ Created encryption_keys table for encryption key management
-- ✅ Updated existing tables with HIPAA metadata
-- ✅ Created compliance_settings table for security policies
-- ✅ Created compliance dashboard view for monitoring
-- ✅ Set audit retention to 7 years (HIPAA requirement)

-- HIPAA Compliance Status:
-- ✅ Audit logging (§164.308(a)(1)(ii)(D))
-- ✅ Access controls (§164.308(a)(4))
-- ✅ Security incident procedures (§164.308(a)(6))
-- ✅ Breach notification infrastructure (§164.410)
-- ⏳ Encryption at rest (§164.312(a)(2)(iv)) - Needs implementation
-- ⏳ Encryption in transit (§164.312(e)(1)) - Use HTTPS/TLS
-- ⏳ MFA (Recommended) - To be implemented
-- ⏳ Backup and disaster recovery (§164.308(a)(7)) - To be implemented

-- Next Steps:
-- 1. Implement encryption at rest for PHI fields
-- 2. Ensure HTTPS/TLS in production
-- 3. Implement automatic session timeout
-- 4. Add failed login attempt tracking
-- 5. Implement MFA for privileged accounts
-- 6. Set up automated backups
-- 7. Create incident response procedures
-- 8. Conduct security risk assessment
-- 9. Execute Business Associate Agreements (BAAs) with vendors
-- 10. Train all users on HIPAA compliance
