-- Migration 005: Add preferred_language column to clients table
-- This enables automatic translation of communications based on client language preference

-- ============================================================================
-- ADD PREFERRED_LANGUAGE COLUMN
-- ============================================================================

-- Add the preferred_language column to clients table
-- Default to 'en' (English) for existing clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Add check constraint to ensure only supported languages
ALTER TABLE clients
ADD CONSTRAINT check_preferred_language
CHECK (preferred_language IN ('en', 'es'));

-- Create index for language-based queries (useful for bulk communications)
CREATE INDEX IF NOT EXISTS idx_clients_preferred_language
ON clients(preferred_language);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
    AND column_name = 'preferred_language'
  ) THEN
    RAISE NOTICE '✓ preferred_language column added successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to add preferred_language column';
  END IF;
END $$;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Clients can now have a preferred language (en or es)
-- Communications will be automatically translated based on this preference
-- ============================================================================
