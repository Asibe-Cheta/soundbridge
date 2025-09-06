-- Simple version: Just add the genres column
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS genres JSONB DEFAULT '[]'::jsonb;
