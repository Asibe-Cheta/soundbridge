-- Migration: Create Custom Branding Table
-- Date: December 11, 2025
-- Description: Creates the custom_branding table that the RPC functions reference

-- Create custom_branding table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_branding (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  custom_logo_url TEXT,
  custom_logo_width INTEGER,
  custom_logo_height INTEGER,
  custom_logo_position TEXT DEFAULT 'top-left',
  primary_color TEXT DEFAULT '#EF4444',
  secondary_color TEXT DEFAULT '#1F2937',
  accent_color TEXT DEFAULT '#F59E0B',
  background_gradient JSONB,
  layout_style TEXT DEFAULT 'default',
  show_powered_by BOOLEAN DEFAULT TRUE,
  watermark_enabled BOOLEAN DEFAULT FALSE,
  watermark_opacity INTEGER DEFAULT 30,
  watermark_position TEXT DEFAULT 'bottom-right',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_branding_user_id ON custom_branding(user_id);

-- Enable RLS
ALTER TABLE custom_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view their own branding
CREATE POLICY IF NOT EXISTS "Users can view own branding"
ON custom_branding FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to insert their own branding
CREATE POLICY IF NOT EXISTS "Users can insert own branding"
ON custom_branding FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own branding
CREATE POLICY IF NOT EXISTS "Users can update own branding"
ON custom_branding FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow users to delete their own branding
CREATE POLICY IF NOT EXISTS "Users can delete own branding"
ON custom_branding FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow public read access (so others can see custom branding on profiles)
CREATE POLICY IF NOT EXISTS "Public can view branding"
ON custom_branding FOR SELECT
TO public
USING (true);
