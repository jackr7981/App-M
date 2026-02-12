-- 1. Add Institution Column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution text;

-- 2. Add Batch Column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS batch text;

-- 3. Create Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution);

-- 4. Verify (Optional Select)
SELECT id, email, institution, batch FROM profiles LIMIT 5;
