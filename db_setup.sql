-- ==============================================================================
-- BD Mariner Hub - Complete Database Setup Script
-- Run this in the Supabase SQL Editor
-- ==============================================================================

-- 1. Create Profiles Table (Idempotent)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  first_name text,
  last_name text,
  department text,
  rank text,
  cdc_number text,
  mobile_number text,
  date_of_birth date,
  profile_picture_url text,
  sea_service_history jsonb,
  preferred_ship_type text,
  is_open_for_work boolean default false,
  is_onboard boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Documents Table (Idempotent)
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  category text,
  document_number text,
  expiry_date date,
  file_path text,
  page_paths text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4. Grant Access to Authenticated Users (CRITICAL for API Access)
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.documents TO anon, authenticated, service_role;

-- 5. Create Policies (Drop existing first to avoid errors)

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Documents Policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- 6. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage Policies (Drop existing first)

-- Avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Documents
DROP POLICY IF EXISTS "Documents are accessible by owner" ON storage.objects;
CREATE POLICY "Documents are accessible by owner" ON storage.objects FOR SELECT USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents" ON storage.objects FOR UPDATE USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );
