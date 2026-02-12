-- Add batch column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS batch text;
