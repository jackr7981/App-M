-- Make user an Admin (Required to view/manage Jobs)
-- Replace the email below with your login email if different
UPDATE public.profiles
SET is_admin = true
WHERE email IN ('admin@bdmarinerhub.com', 'jackr7981@gmail.com');

-- Verify
SELECT id, email, is_admin FROM public.profiles WHERE email IN ('admin@bdmarinerhub.com', 'jackr7981@gmail.com');
