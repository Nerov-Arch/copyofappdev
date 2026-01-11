/*
  # Add Profile Completion Tracking

  1. Changes
    - Add `profile_completed` boolean to `user_profiles` table
    - Defaults to false for new users
    - Set to true after completing profile setup
  
  2. Purpose
    - Track whether user has completed initial profile setup
    - Determines whether to show onboarding or dashboard
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;
END $$;
