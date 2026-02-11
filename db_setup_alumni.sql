-- Add institution column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution text;

-- Create an index for faster filtering by institution
CREATE INDEX IF NOT EXISTS profiles_institution_idx ON profiles(institution);
