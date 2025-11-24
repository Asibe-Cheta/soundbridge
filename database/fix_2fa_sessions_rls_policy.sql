-- ================================================
-- Migration: Fix RLS Policy for two_factor_verification_sessions
-- Date: November 23, 2025
-- Purpose: Ensure service role can insert verification sessions
-- ================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role only for verification sessions" ON two_factor_verification_sessions;

-- Recreate policy to explicitly allow service role full access
-- This ensures service role can INSERT, SELECT, UPDATE, DELETE
CREATE POLICY "Service role only for verification sessions"
  ON two_factor_verification_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE two_factor_verification_sessions ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON POLICY "Service role only for verification sessions" ON two_factor_verification_sessions IS 
  'Allows service role (backend) full access to verification sessions. This is required for the login-initiate endpoint to create sessions.';

