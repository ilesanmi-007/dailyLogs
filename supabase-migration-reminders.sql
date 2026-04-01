-- Run this in your Supabase SQL Editor to add reminder columns
-- Dashboard > SQL Editor > New Query

-- Add reminder columns to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_time TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN;

-- Also ensure skipped/skip_reason columns exist (from earlier update)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS skipped BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS skip_reason TEXT;
