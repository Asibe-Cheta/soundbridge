-- Waitlist Table Schema for SoundBridge
-- Stores email signups for early access waitlist

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT, -- "artist", "producer", "venue", "fan", "dj", "manager", "other"
    location TEXT, -- Legacy field - stores structured JSON: {"country": "United Kingdom", "state": "England", "city": "Wokingham"}
    country TEXT, -- Country name (e.g., "United Kingdom")
    state TEXT, -- State/Region/Province (e.g., "England", "Scotland", "Wales", "Northern Ireland")
    city TEXT, -- City name (e.g., "Wokingham", "London")
    genres TEXT[], -- music genres interested in
    referral_source TEXT, -- where they heard about us
    signed_up_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed BOOLEAN DEFAULT false, -- for double opt-in if needed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_signed_up_at ON waitlist(signed_up_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_role ON waitlist(role) WHERE role IS NOT NULL;

-- Note: country, state, and city indexes are created in the migration script
-- See: waitlist_migration_add_location_fields.sql

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert (for signup)
CREATE POLICY "Allow public waitlist signups" ON waitlist
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow service role to read all (for admin dashboard)
CREATE POLICY "Allow service role to read waitlist" ON waitlist
    FOR SELECT
    TO service_role
    USING (true);

-- Allow service role to update (for confirmation, etc.)
CREATE POLICY "Allow service role to update waitlist" ON waitlist
    FOR UPDATE
    TO service_role
    USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER waitlist_updated_at
    BEFORE UPDATE ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_waitlist_updated_at();

-- Grant necessary permissions
GRANT INSERT ON waitlist TO anon, authenticated;
GRANT SELECT, UPDATE ON waitlist TO service_role;

