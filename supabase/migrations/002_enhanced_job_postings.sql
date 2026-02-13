-- Enhanced Job Postings Schema
-- Adds tracking fields, individual columns for SHIPPED format, and performance optimizations

-- 1. Add new tracking and metadata columns
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS source_group_name TEXT,
  ADD COLUMN IF NOT EXISTS source_group_id TEXT,
  ADD COLUMN IF NOT EXISTS parsing_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_parsing_error TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Add individual columns for each SHIPPED format field (for faster queries)
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS rank TEXT,
  ADD COLUMN IF NOT EXISTS salary TEXT,
  ADD COLUMN IF NOT EXISTS joining_date TEXT,
  ADD COLUMN IF NOT EXISTS agency TEXT,
  ADD COLUMN IF NOT EXISTS mla_number TEXT,
  ADD COLUMN IF NOT EXISTS agency_address TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number TEXT,
  ADD COLUMN IF NOT EXISTS agency_email TEXT;

-- 3. Update status CHECK constraint to include new statuses
ALTER TABLE public.job_postings DROP CONSTRAINT IF EXISTS job_postings_status_check;
ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_status_check
  CHECK (status IN ('pending', 'parsed', 'published', 'approved', 'rejected', 'expired'));

-- 4. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_source_id ON job_postings(source_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_rank ON job_postings(rank) WHERE rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_agency ON job_postings(agency) WHERE agency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_source_group ON job_postings(source_group_id) WHERE source_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_published ON job_postings(published_at DESC) WHERE published_at IS NOT NULL;

-- 5. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON job_postings;
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Create materialized view for active/published jobs (performance optimization)
DROP MATERIALIZED VIEW IF EXISTS active_jobs;
CREATE MATERIALIZED VIEW active_jobs AS
SELECT
  id,
  rank,
  salary,
  joining_date,
  agency,
  mla_number,
  agency_address,
  mobile_number,
  agency_email,
  source,
  source_group_name,
  created_at,
  published_at,
  parsed_content
FROM job_postings
WHERE status IN ('published', 'approved', 'parsed')
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_active_jobs_rank ON active_jobs(rank) WHERE rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_active_jobs_agency ON active_jobs(agency) WHERE agency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_active_jobs_created_at ON active_jobs(created_at DESC);

-- 7. Create function to refresh materialized view (call this periodically)
CREATE OR REPLACE FUNCTION refresh_active_jobs()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW active_jobs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to increment parsing attempts (for atomic updates)
CREATE OR REPLACE FUNCTION increment_parsing_attempts(job_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE job_postings
  SET parsing_attempts = parsing_attempts + 1
  WHERE id = job_uuid
  RETURNING parsing_attempts INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to auto-expire old jobs (run daily via cron)
CREATE OR REPLACE FUNCTION auto_expire_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE job_postings
  SET status = 'expired'
  WHERE status IN ('published', 'approved', 'parsed')
    AND created_at < NOW() - INTERVAL '60 days'
    AND status != 'expired'
  RETURNING COUNT(*) INTO expired_count;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to sync parsed fields from JSONB to columns
CREATE OR REPLACE FUNCTION sync_parsed_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract fields from parsed_content JSONB and populate individual columns
  IF NEW.parsed_content IS NOT NULL THEN
    NEW.rank = COALESCE(NEW.rank, NEW.parsed_content->>'rank');
    NEW.salary = COALESCE(NEW.salary, NEW.parsed_content->>'salary');
    NEW.joining_date = COALESCE(NEW.joining_date, NEW.parsed_content->>'joining_date');
    NEW.agency = COALESCE(NEW.agency, NEW.parsed_content->>'agency');
    NEW.mla_number = COALESCE(NEW.mla_number, NEW.parsed_content->>'mla_number');
    NEW.agency_address = COALESCE(NEW.agency_address, NEW.parsed_content->>'address');
    NEW.mobile_number = COALESCE(NEW.mobile_number, NEW.parsed_content->>'mobile');
    NEW.agency_email = COALESCE(NEW.agency_email, NEW.parsed_content->>'email');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_parsed_fields_trigger ON job_postings;
CREATE TRIGGER sync_parsed_fields_trigger
  BEFORE INSERT OR UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION sync_parsed_fields();

-- 11. Grant necessary permissions
GRANT SELECT ON active_jobs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_active_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION auto_expire_old_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION increment_parsing_attempts(UUID) TO service_role;

-- 12. Add comment documentation
COMMENT ON TABLE job_postings IS 'Stores maritime job postings from various sources with AI-parsed structured data';
COMMENT ON COLUMN job_postings.parsed_content IS 'JSONB field containing all parsed fields from AI';
COMMENT ON COLUMN job_postings.parsing_attempts IS 'Number of times AI parsing was attempted (max 3)';
COMMENT ON COLUMN job_postings.source_group_name IS 'Name of the Telegram group where job was posted';
COMMENT ON COLUMN job_postings.expires_at IS 'Timestamp when job posting should be considered expired';
COMMENT ON MATERIALIZED VIEW active_jobs IS 'Materialized view of active job postings for fast queries. Refresh periodically.';

-- 13. Initial data migration: populate individual columns from existing parsed_content
UPDATE job_postings
SET
  rank = parsed_content->>'rank',
  salary = parsed_content->>'salary',
  joining_date = parsed_content->>'joining_date',
  agency = parsed_content->>'agency',
  mla_number = parsed_content->>'mla_number',
  agency_address = parsed_content->>'address',
  mobile_number = parsed_content->>'mobile',
  agency_email = parsed_content->>'email'
WHERE parsed_content IS NOT NULL
  AND (rank IS NULL OR salary IS NULL);

-- 14. Initial materialized view refresh
REFRESH MATERIALIZED VIEW active_jobs;

-- Migration complete!
