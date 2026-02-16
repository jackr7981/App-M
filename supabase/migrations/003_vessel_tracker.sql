-- ==============================================================================
-- BD MARINER HUB - VESSEL TRACKER FEATURE
-- Real-time AIS vessel tracking with caching and rate limiting
-- ==============================================================================

-- 1. CREATE VESSEL TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.vessel_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Vessel Identification
    vessel_name TEXT NOT NULL,
    imo_number TEXT,
    mmsi TEXT,
    call_sign TEXT,
    vessel_type TEXT,

    -- Position Data (Latitude/Longitude)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    speed_over_ground DECIMAL(5, 2),
    course_over_ground DECIMAL(5, 2),
    heading DECIMAL(5, 2),

    -- Voyage Data (JSONB for flexibility)
    voyage_data JSONB,

    -- Individual columns for fast queries
    status TEXT,
    destination TEXT,
    next_port TEXT,
    eta TIMESTAMPTZ,

    -- Weather Data
    wind_speed DECIMAL(5, 2),
    wind_direction DECIMAL(5, 2),
    sea_state TEXT,

    -- Metadata
    data_source TEXT DEFAULT 'vesselfinder',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for cache (one record per user per vessel)
    UNIQUE(user_id, vessel_name)
);

-- 2. CREATE FAVORITE VESSELS TABLE
CREATE TABLE IF NOT EXISTS public.favorite_vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vessel_name TEXT NOT NULL,
    mmsi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, vessel_name)
);

-- 3. CREATE VESSEL SEARCH HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.vessel_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    search_query TEXT NOT NULL,
    result_found BOOLEAN DEFAULT TRUE,
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE API RATE LIMITS TABLE
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, endpoint)
);

-- 5. ENABLE RLS (Security)
ALTER TABLE public.vessel_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_vessel_tracking_vessel_name ON public.vessel_tracking(vessel_name);
CREATE INDEX IF NOT EXISTS idx_vessel_tracking_mmsi ON public.vessel_tracking(mmsi) WHERE mmsi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vessel_tracking_user_last_updated ON public.vessel_tracking(user_id, last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_favorite_vessels_user_id ON public.favorite_vessels(user_id);

CREATE INDEX IF NOT EXISTS idx_vessel_search_history_user_search ON public.vessel_search_history(user_id, searched_at DESC);

-- 7. CREATE TRIGGER FOR AUTO-UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_vessel_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vessel_tracking_timestamp_trigger ON public.vessel_tracking;
CREATE TRIGGER update_vessel_tracking_timestamp_trigger
  BEFORE UPDATE ON public.vessel_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_vessel_tracking_timestamp();

-- 8. CREATE RATE LIMIT CHECKER FUNCTION
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 20
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit record
  SELECT request_count, last_reset_at
  INTO current_count, window_start
  FROM public.api_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (user_id, endpoint, request_count, last_reset_at)
    VALUES (p_user_id, p_endpoint, 1, NOW());
    RETURN TRUE;
  END IF;

  -- Check if window expired (1 hour)
  IF window_start < NOW() - INTERVAL '1 hour' THEN
    UPDATE public.api_rate_limits
    SET request_count = 1, last_reset_at = NOW()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN TRUE;
  END IF;

  -- Check if under limit
  IF current_count < p_max_requests THEN
    UPDATE public.api_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN TRUE;
  END IF;

  -- Rate limit exceeded
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CREATE RLS POLICIES

-- vessel_tracking
CREATE POLICY "Users can view own vessel data"
  ON public.vessel_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vessel data"
  ON public.vessel_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vessel data"
  ON public.vessel_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- favorite_vessels
CREATE POLICY "Users can view own favorite vessels"
  ON public.favorite_vessels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite vessels"
  ON public.favorite_vessels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite vessels"
  ON public.favorite_vessels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite vessels"
  ON public.favorite_vessels FOR DELETE
  USING (auth.uid() = user_id);

-- vessel_search_history
CREATE POLICY "Users can view own search history"
  ON public.vessel_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.vessel_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- api_rate_limits
CREATE POLICY "Users can view own rate limits"
  ON public.api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- 10. GRANT PERMISSIONS
GRANT ALL ON TABLE public.vessel_tracking TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.favorite_vessels TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vessel_search_history TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.api_rate_limits TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER) TO service_role;

-- 11. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE public.vessel_tracking IS 'Stores real-time vessel tracking data with 5-minute cache TTL. Web scraped from VesselFinder.com';
COMMENT ON COLUMN public.vessel_tracking.vessel_name IS 'Vessel name (uppercase) used as cache key';
COMMENT ON COLUMN public.vessel_tracking.voyage_data IS 'JSONB field containing all voyage-related data for flexibility';
COMMENT ON COLUMN public.vessel_tracking.last_updated IS 'Timestamp of last update; used for 5-minute cache validation';

COMMENT ON TABLE public.favorite_vessels IS 'User-saved favorite vessels for quick access and future notifications';
COMMENT ON TABLE public.vessel_search_history IS 'Search analytics; tracks all vessel searches for autocomplete and insights';
COMMENT ON TABLE public.api_rate_limits IS 'Rate limiting: max 20 requests per hour per user per endpoint (prevents IP bans from web scraping)';
COMMENT ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER) IS 'Checks and updates user rate limit; returns TRUE if allowed, FALSE if exceeded. Default: 20 requests/hour.';

-- 12. MIGRATION COMPLETE
-- Run this script in Supabase SQL Editor to deploy vessel tracker infrastructure
