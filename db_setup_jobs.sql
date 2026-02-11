-- JOB BOARD MIGRATION
-- Run this in Supabase SQL Editor

-- 1. Add Admin Role to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Create Job Postings Table
CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source text NOT NULL CHECK (source IN ('telegram', 'whatsapp', 'facebook', 'manual')),
    source_id text, -- External ID (e.g., Telegram Message ID)
    raw_content text NOT NULL,
    parsed_content jsonb DEFAULT '{}'::jsonb,
    -- parsed_content structure:
    -- {
    --   "rank": "Chief Officer",
    --   "vessel_type": "Oil Tanker",
    --   "salary": "$5000",
    --   "joining_date": "Urgent",
    --   "company": "ABC Shipping",
    --   "contact": "+88017..."
    -- }
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Public: Everyone can view 'approved' jobs
CREATE POLICY "Public jobs are viewable by everyone" 
ON public.job_postings FOR SELECT USING (status = 'approved');

-- Admin: Admins can do everything
CREATE POLICY "Admins can view all jobs" 
ON public.job_postings FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can insert jobs" 
ON public.job_postings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR source = 'telegram' -- Allow bot inserts (handled via service role key usually, but good to be explicit if using authenticated client)
);

CREATE POLICY "Admins can update jobs" 
ON public.job_postings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admins can delete jobs" 
ON public.job_postings FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Service Role (Edge Functions) bypasses RLS, so 'telegram' source inserts work.

-- 5. Storage for Job Images (Optional, for screenshots)
INSERT INTO storage.buckets (id, name, public) VALUES ('job_images', 'job_images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public job images" 
ON storage.objects FOR SELECT USING (bucket_id = 'job_images');

CREATE POLICY "Admins upload job images" 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'job_images' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
