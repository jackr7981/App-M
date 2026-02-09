-- ==============================================================================
-- BD MARINER HUB - COMPLETE BACKEND RESET & SETUP
-- WARNING: This script drops existing tables 'profiles' and 'documents'.
-- Run this in the Supabase SQL Editor.
-- ==============================================================================

-- 1. CLEANUP (Start Fresh)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.documents;
DROP TABLE IF EXISTS public.profiles;

-- 2. CREATE PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  department text,
  rank text,
  cdc_number text,
  mobile_number text,
  date_of_birth date,
  profile_picture_url text,
  sea_service_history jsonb DEFAULT '[]'::jsonb,
  preferred_ship_type text,
  is_open_for_work boolean DEFAULT false,
  is_onboard boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE DOCUMENTS TABLE
CREATE TABLE public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text,
  document_number text,
  expiry_date date,
  file_path text NOT NULL,
  page_paths text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ENABLE RLS (Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- This fixes the issue where a user signs up but has no profile row to update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. POLICIES (Access Rights)

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents
CREATE POLICY "Users can view own documents" 
  ON public.documents FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" 
  ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
  ON public.documents FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
  ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- 7. STORAGE SETUP
-- We try to insert buckets, if they exist we catch the error silently or just ensure policies
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Drop first to avoid duplicates if re-running)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Documents are accessible by owner" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- Recreate Storage Policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can upload an avatar" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Documents are accessible by owner" ON storage.objects FOR SELECT USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );
CREATE POLICY "Users can update own documents" ON storage.objects FOR UPDATE USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 8. GRANT PERMISSIONS (Fixes 'permission denied' API errors)
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.documents TO anon, authenticated, service_role;
