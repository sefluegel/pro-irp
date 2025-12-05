-- 004-calendar-integrations.sql - Calendar integration tables for Google Calendar and Microsoft Outlook

-- ============================================================================
-- Calendar Integrations Table
-- Store OAuth tokens and integration metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google' or 'microsoft'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  scope TEXT,
  calendar_id VARCHAR(500), -- Selected calendar ID for sync (e.g., 'primary' or specific calendar)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Each user can only have one integration per provider
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);

COMMENT ON TABLE calendar_integrations IS 'OAuth tokens and metadata for calendar integrations (Google Calendar, Microsoft Outlook)';
COMMENT ON COLUMN calendar_integrations.access_token IS 'OAuth access token (encrypted at rest in production)';
COMMENT ON COLUMN calendar_integrations.refresh_token IS 'OAuth refresh token for automatic token renewal';
COMMENT ON COLUMN calendar_integrations.token_expiry IS 'When the access token expires';
COMMENT ON COLUMN calendar_integrations.scope IS 'OAuth scopes granted by the user';

-- ============================================================================
-- Synced Events Table (Optional)
-- Store copies of calendar events for faster access and offline viewing
-- ============================================================================

CREATE TABLE IF NOT EXISTS synced_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_event_id VARCHAR(255) NOT NULL, -- ID from Google/Microsoft
  summary VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(500),
  attendees JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}', -- Provider-specific data
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate events
  UNIQUE(calendar_integration_id, external_event_id)
);

CREATE INDEX idx_synced_events_user ON synced_calendar_events(user_id);
CREATE INDEX idx_synced_events_integration ON synced_calendar_events(calendar_integration_id);
CREATE INDEX idx_synced_events_time_range ON synced_calendar_events(start_time, end_time);
CREATE INDEX idx_synced_events_external_id ON synced_calendar_events(external_event_id);

COMMENT ON TABLE synced_calendar_events IS 'Local copies of calendar events synced from Google/Microsoft for faster access';
COMMENT ON COLUMN synced_calendar_events.external_event_id IS 'Event ID from the external calendar provider';
COMMENT ON COLUMN synced_calendar_events.attendees IS 'JSON array of attendee objects';
COMMENT ON COLUMN synced_calendar_events.metadata IS 'Provider-specific event metadata (conference links, recurrence, etc.)';

-- ============================================================================
-- Calendar Sync Status Table
-- Track last sync time and errors for each calendar integration
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(50) DEFAULT 'pending', -- 'success', 'error', 'pending'
  last_sync_error TEXT,
  events_synced INTEGER DEFAULT 0,
  next_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- One status row per integration
  UNIQUE(calendar_integration_id)
);

CREATE INDEX idx_calendar_sync_integration ON calendar_sync_status(calendar_integration_id);
CREATE INDEX idx_calendar_sync_next_sync ON calendar_sync_status(next_sync_at);

COMMENT ON TABLE calendar_sync_status IS 'Track sync status for each calendar integration';
COMMENT ON COLUMN calendar_sync_status.last_sync_status IS 'Status of last sync attempt';
COMMENT ON COLUMN calendar_sync_status.events_synced IS 'Number of events synced in last sync';

-- ============================================================================
-- Client Calendar Events Table
-- Link client-related events to calendar events (e.g., appointments, calls)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_integration_id UUID REFERENCES calendar_integrations(id) ON DELETE SET NULL,
  external_event_id VARCHAR(255), -- ID from Google/Microsoft
  event_type VARCHAR(50) NOT NULL, -- 'appointment', 'call', 'meeting', 'follow_up'
  summary VARCHAR(500) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(500),
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  outcome TEXT, -- Notes about what happened
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_calendar_client ON client_calendar_events(client_id);
CREATE INDEX idx_client_calendar_user ON client_calendar_events(user_id);
CREATE INDEX idx_client_calendar_time ON client_calendar_events(start_time, end_time);
CREATE INDEX idx_client_calendar_status ON client_calendar_events(status);
CREATE INDEX idx_client_calendar_type ON client_calendar_events(event_type);

COMMENT ON TABLE client_calendar_events IS 'Client-related calendar events (appointments, calls, meetings)';
COMMENT ON COLUMN client_calendar_events.external_event_id IS 'ID of corresponding event in Google/Microsoft calendar';
COMMENT ON COLUMN client_calendar_events.event_type IS 'Type of client interaction';
COMMENT ON COLUMN client_calendar_events.outcome IS 'What happened during the event (notes, action items)';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Note: GRANT statements are commented out for standard PostgreSQL
-- Uncomment if you're using Supabase or have an 'authenticated' role

-- All authenticated users can manage their own calendar integrations
-- GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_integrations TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON synced_calendar_events TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_sync_status TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON client_calendar_events TO authenticated;

-- ============================================================================
-- Sample data for testing (optional)
-- ============================================================================

-- Uncomment to add sample calendar event types
-- INSERT INTO client_calendar_events (client_id, user_id, event_type, summary, start_time, end_time, status)
-- SELECT
--   c.id,
--   u.id,
--   'appointment',
--   'Initial consultation with ' || c.first_name || ' ' || c.last_name,
--   CURRENT_TIMESTAMP + INTERVAL '1 day',
--   CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '1 hour',
--   'scheduled'
-- FROM clients c
-- CROSS JOIN users u
-- WHERE u.role = 'agent'
-- LIMIT 5;

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_calendar_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_integrations_updated_at
BEFORE UPDATE ON calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION update_calendar_integration_timestamp();

CREATE TRIGGER synced_events_updated_at
BEFORE UPDATE ON synced_calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_calendar_integration_timestamp();

CREATE TRIGGER sync_status_updated_at
BEFORE UPDATE ON calendar_sync_status
FOR EACH ROW
EXECUTE FUNCTION update_calendar_integration_timestamp();

CREATE TRIGGER client_calendar_updated_at
BEFORE UPDATE ON client_calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_calendar_integration_timestamp();

-- ============================================================================
-- Migration complete!
-- ============================================================================

-- To run this migration:
-- psql -U postgres -d pro_irp -f backend/migrations/004-calendar-integrations.sql
