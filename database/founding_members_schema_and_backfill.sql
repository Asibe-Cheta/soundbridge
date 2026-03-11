-- =====================================================
-- Founding Members: table + backfill first 102 from waitlist
-- =====================================================
-- Purpose: Store the first 102 waitlist signups as founding members.
--          Frontend always displays "100"; the extra 2 are excluded emails
--          (asibechetachukwu@gmail.com, soundbridgeliveuk@gmail.com) for testing.
-- Run this on the same DB that has the waitlist table (e.g. Supabase SQL editor).
-- =====================================================

-- 1. Create founding_members table
-- ---------------------------------
CREATE TABLE IF NOT EXISTS founding_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    waitlist_signed_up_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE founding_members IS 'First 102 waitlist signups; frontend shows as 100 founding members (2 excluded emails used for testing).';
COMMENT ON COLUMN founding_members.email IS 'Normalized (lowercase) email from waitlist.';
COMMENT ON COLUMN founding_members.waitlist_signed_up_at IS 'Original signed_up_at from waitlist (for email merge / display).';
COMMENT ON COLUMN founding_members.user_id IS 'Set when user signs up with this email; used for badge and discount.';

CREATE INDEX IF NOT EXISTS idx_founding_members_email ON founding_members(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_founding_members_user_id ON founding_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_founding_members_waitlist_signed_up_at ON founding_members(waitlist_signed_up_at);

-- RLS: only backend/service role should read; no public insert/update
ALTER TABLE founding_members ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API and cron)
CREATE POLICY "Service role full access to founding_members"
    ON founding_members
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Optional: allow authenticated users to read only their own row (if user_id is set)
-- Uncomment if you want profile reads to resolve founding_member by user_id without service role:
-- CREATE POLICY "Users can read own founding_member row"
--     ON founding_members
--     FOR SELECT
--     TO authenticated
--     USING (user_id = auth.uid());

-- 2. Backfill: insert first 102 waitlist signups (by signed_up_at ASC)
-- ---------------------------------
-- Uses signed_up_at so we get the true “first 102” by signup order.
-- The two excluded emails (yours) are in this set for verification; frontend still says "100".
INSERT INTO founding_members (email, waitlist_signed_up_at)
SELECT
    LOWER(TRIM(w.email)),
    w.signed_up_at
FROM (
    SELECT email, signed_up_at
    FROM waitlist
    ORDER BY signed_up_at ASC NULLS LAST
    LIMIT 102
) w
ON CONFLICT (email) DO NOTHING;

-- 3. Optional: verify row count
-- ---------------------------------
-- SELECT COUNT(*) AS founding_member_count FROM founding_members;
-- SELECT email, waitlist_signed_up_at FROM founding_members ORDER BY waitlist_signed_up_at ASC;
