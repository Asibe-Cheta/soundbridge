-- User Blocks Schema for SoundBridge
-- Allows users to block other users to prevent interaction and hide content

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT, -- Optional reason for blocking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only block another user once
    UNIQUE(blocker_id, blocked_id),
    
    -- Prevent users from blocking themselves
    CHECK (blocker_id != blocked_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_created_at ON blocked_users(created_at DESC);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own blocks (who they've blocked)
CREATE POLICY "Users can view their own blocks" ON blocked_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = blocker_id);

-- Users can create blocks (block other users)
CREATE POLICY "Users can block others" ON blocked_users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can unblock" ON blocked_users
    FOR DELETE
    TO authenticated
    USING (auth.uid() = blocker_id);

-- Service role can read all blocks (for admin/moderation)
CREATE POLICY "Service role can read all blocks" ON blocked_users
    FOR SELECT
    TO service_role
    USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blocked_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER blocked_users_updated_at
    BEFORE UPDATE ON blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION update_blocked_users_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT SELECT ON blocked_users TO service_role;

-- Create a view to check if two users have a block relationship (bidirectional check)
CREATE OR REPLACE VIEW user_block_status AS
SELECT 
    blocker_id,
    blocked_id,
    created_at as blocked_at,
    reason
FROM blocked_users
UNION ALL
SELECT 
    blocked_id as blocker_id,
    blocker_id as blocked_id,
    created_at as blocked_at,
    reason
FROM blocked_users;

-- Helper function to check if user A is blocked by user B (or vice versa)
CREATE OR REPLACE FUNCTION is_user_blocked(user_a_id UUID, user_b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE (blocker_id = user_a_id AND blocked_id = user_b_id)
           OR (blocker_id = user_b_id AND blocked_id = user_a_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE blocked_users IS 'Stores user block relationships. When user A blocks user B, they will not see each other''s content or be able to interact.';
COMMENT ON COLUMN blocked_users.blocker_id IS 'The user who initiated the block';
COMMENT ON COLUMN blocked_users.blocked_id IS 'The user who was blocked';
COMMENT ON COLUMN blocked_users.reason IS 'Optional reason for blocking (for user reference only)';

