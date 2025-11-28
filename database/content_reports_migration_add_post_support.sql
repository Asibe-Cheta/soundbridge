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

-- Step 3: Make content_id nullable or remove the constraint entirely
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

