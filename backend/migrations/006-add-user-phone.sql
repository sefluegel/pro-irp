-- Migration 006: Add phone number to users table
-- This enables click-to-call functionality

-- Add phone column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add comment
COMMENT ON COLUMN users.phone IS 'Agent phone number for click-to-call functionality';

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'phone'
  ) THEN
    RAISE NOTICE '✓ phone column added to users table';
  ELSE
    RAISE EXCEPTION '✗ Failed to add phone column';
  END IF;
END $$;
