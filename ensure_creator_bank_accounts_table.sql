-- Ensure creator_bank_accounts table exists with correct structure
-- Run this first if the table doesn't exist

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS creator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bank account details (encrypted)
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL DEFAULT '', -- Encrypted account number
  routing_number_encrypted TEXT NOT NULL DEFAULT '', -- Encrypted routing number
  account_type TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings')),
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Stripe Connect integration
  stripe_account_id TEXT, -- Stripe Connect account ID
  stripe_bank_token TEXT, -- Stripe bank account token
  
  -- Verification status
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'rejected')),
  verification_attempts INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id) -- One bank account per user
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_user_id ON creator_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_bank_accounts_stripe_account_id ON creator_bank_accounts(stripe_account_id);

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_bank_accounts TO authenticated;

-- Success message
SELECT 'creator_bank_accounts table created/verified successfully!' as status;
