-- Run this in Supabase SQL Editor to add skip feature columns

-- Add skipped column
ALTER TABLE activities ADD COLUMN IF NOT EXISTS skipped BOOLEAN NOT NULL DEFAULT false;

-- Add skip_reason column
ALTER TABLE activities ADD COLUMN IF NOT EXISTS skip_reason TEXT;
