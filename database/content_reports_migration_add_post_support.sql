-- Migration: Add 'post' support to content_reports table
-- This migration updates the content_reports table to support reporting posts
-- Run this in Supabase SQL Editor

-- Step 1: Drop the foreign key constraint on content_id (it only references audio_tracks)
-- We need to make this more flexible since content_id can reference different tables
ALTER TABLE content_reports 
DROP CONSTRAINT IF EXISTS content_reports_content_id_fkey;

-- Step 2: Update the content_type CHECK constraint to include 'post'
ALTER TABLE content_reports 
DROP CONSTRAINT IF EXISTS content_reports_content_type_check;

ALTER TABLE content_reports 
ADD CONSTRAINT content_reports_content_type_check 
CHECK (content_type IN ('track', 'profile', 'comment', 'playlist', 'post'));

-- Step 3: Add ALL missing columns if they don't exist
-- Core columns
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS report_type VARCHAR(50);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal';

-- Reporter Information columns
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS reporter_id UUID;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS reporter_email VARCHAR(255);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS reporter_name VARCHAR(255);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS reporter_type VARCHAR(20) DEFAULT 'user';

-- Content Information columns
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS content_id UUID;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(20);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS content_title VARCHAR(500);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS content_url TEXT;

-- Report Details columns
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS report_reason TEXT;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS evidence_urls TEXT[];

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Copyright Specific Fields
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS copyrighted_work_title VARCHAR(500);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS copyrighted_work_owner VARCHAR(255);

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS copyright_evidence TEXT;

-- Processing Information columns
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS assigned_to UUID;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS review_notes TEXT;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS action_taken VARCHAR(100);

-- Timestamp columns
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Metadata and flags
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS auto_flagged BOOLEAN DEFAULT false;

ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS requires_legal_review BOOLEAN DEFAULT false;

-- Step 4: Drop problematic CHECK constraints that might be too restrictive
-- Drop the report_reason CHECK constraint if it exists (it might be too restrictive)
ALTER TABLE content_reports 
DROP CONSTRAINT IF EXISTS content_reports_report_reason_check;

-- Step 5: Make content_id nullable or remove the constraint entirely
-- Since content_id can reference different tables (posts, audio_tracks, profiles, etc.),
-- we'll remove the foreign key constraint. The application logic will handle validation.
-- Note: If you want to keep referential integrity, you could create separate columns
-- like post_id, track_id, etc., but for simplicity, we'll just remove the FK constraint.

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'content_reports'
  AND column_name IN ('content_type', 'content_id')
ORDER BY column_name;

-- Check constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'content_reports'
  AND tc.constraint_type = 'CHECK'
  AND cc.constraint_name LIKE '%content_type%';

