-- Fix creator_bank_accounts for Payment Methods screen (Nigeria / African creators)
-- Issue: GET creator_bank_accounts via Supabase direct query throws for some users instead of returning empty.
-- 1. Ensure table exists (same schema as create_revenue_system).
-- 2. Unify RLS so creators can read their own rows: auth.uid() = user_id (and JWT sub fallback for Bearer auth).
-- Run in Supabase SQL Editor or your migration runner.

-- ===================================
-- 1. Ensure table exists (no-op if already present)
-- ===================================
CREATE TABLE IF NOT EXISTS creator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT UNIQUE,
  stripe_account_status VARCHAR(50) DEFAULT 'pending',
  bank_name TEXT,
  account_last4 VARCHAR(4),
  account_holder_name TEXT,
  routing_number_last4 VARCHAR(4),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(50) DEFAULT 'pending',
  payout_enabled BOOLEAN DEFAULT FALSE,
  payout_schedule VARCHAR(50) DEFAULT 'weekly',
  minimum_payout_amount DECIMAL(10, 2) DEFAULT 10.00,
  metadata JSONB,
  connected_at TIMESTAMP,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add FK only if profiles exists and constraint not present (avoid breaking existing DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'creator_bank_accounts' AND constraint_name = 'creator_bank_accounts_user_id_fkey'
  ) AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE creator_bank_accounts
      ADD CONSTRAINT creator_bank_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignore if FK already exists or profiles missing
END $$;

CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_user_id ON creator_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_stripe_id ON creator_bank_accounts(stripe_account_id);

-- ===================================
-- 2. Enable RLS
-- ===================================
ALTER TABLE creator_bank_accounts ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 3. Drop all known policy name variants (from various scripts)
-- ===================================
DROP POLICY IF EXISTS "Users can view own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can view their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank account" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON creator_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON creator_bank_accounts;

-- ===================================
-- 4. Create single set of policies: auth.uid() = user_id (and JWT sub for Bearer)
-- ===================================
CREATE POLICY "creator_bank_accounts_select_own"
ON creator_bank_accounts FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'sub')::uuid = user_id
);

CREATE POLICY "creator_bank_accounts_insert_own"
ON creator_bank_accounts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'sub')::uuid = user_id
);

CREATE POLICY "creator_bank_accounts_update_own"
ON creator_bank_accounts FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'sub')::uuid = user_id
)
WITH CHECK (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'sub')::uuid = user_id
);

CREATE POLICY "creator_bank_accounts_delete_own"
ON creator_bank_accounts FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt() ->> 'sub')::uuid = user_id
);

-- ===================================
-- 5. Grants
-- ===================================
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_bank_accounts TO authenticated;
