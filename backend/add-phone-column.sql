-- Add phone column to users table for click-to-call functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add comment
COMMENT ON COLUMN users.phone IS 'Agent phone number for click-to-call functionality';
