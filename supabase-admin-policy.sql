-- Run this in Supabase SQL Editor to add admin read access
-- This allows the admin (samsonademola56@gmail.com) to read ALL activities

-- First, drop the existing read policy
DROP POLICY IF EXISTS "Users can read own activities" ON activities;

-- Recreate it: users can read their own, OR the admin can read all
CREATE POLICY "Users can read own activities"
  ON activities FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'samsonademola56@gmail.com'
  );
