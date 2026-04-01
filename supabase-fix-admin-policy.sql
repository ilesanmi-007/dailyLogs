-- Run this in Supabase SQL Editor to REMOVE the admin read-all policy
-- This policy was accidentally letting admin see other users' activities on the main page

DROP POLICY IF EXISTS "Admin can read all activities" ON activities;

-- Verify: only these 4 policies should remain
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'activities';
