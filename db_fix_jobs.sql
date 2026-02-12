-- 1. Add Admin Role to Profiles (Crucial for RLS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Create Job Postings Table (if not exists)
CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source text NOT NULL CHECK (source IN ('telegram', 'whatsapp', 'facebook', 'manual')),
    source_id text,
    raw_content text NOT NULL,
    parsed_content jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Create Policies (Drop if exists to avoid errors)
DROP POLICY IF EXISTS "Public jobs are viewable by everyone" ON public.job_postings;
CREATE POLICY "Public jobs are viewable by everyone" 
ON public.job_postings FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Service Role can insert jobs" ON public.job_postings;
CREATE POLICY "Service Role can insert jobs" 
ON public.job_postings FOR INSERT WITH CHECK (true);

-- Allow admins to view all (using existing is_admin column or just public for now for debugging if needed, but sticking to logic)
DROP POLICY IF EXISTS "Admins can view do everything" ON public.job_postings;
CREATE POLICY "Admins can view do everything" 
ON public.job_postings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Grant access
GRANT ALL ON public.job_postings TO postgres, service_role;
GRANT SELECT ON public.job_postings TO anon, authenticated;
