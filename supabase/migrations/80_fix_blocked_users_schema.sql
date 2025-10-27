-- Fix blocked_users table schema
-- The table was created from an older migration with different column names
-- This migration adds missing columns without recreating the table

-- Add notes column if it doesn't exist
ALTER TABLE blocked_users 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN blocked_users.notes IS 'Optional private notes about why the user was blocked';
COMMENT ON COLUMN blocked_users.created_at IS 'Timestamp when the user was blocked';

