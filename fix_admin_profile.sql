DO $$
DECLARE
    -- REPLACE THIS WITH YOUR LOGIN EMAIL
    target_email TEXT := 'jackr7981@gmail.com'; 
    v_user_id UUID;
BEGIN
    -- 1. Get User ID from Auth
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NOT NULL THEN
        -- 2. Upsert Profile
        INSERT INTO public.profiles (id, email, first_name, last_name, is_admin)
        VALUES (
            v_user_id, 
            target_email, 
            'Admin', 
            'User', 
            true
        )
        ON CONFLICT (id) DO UPDATE
        SET is_admin = true;
        
        RAISE NOTICE 'SUCCESS: User % (ID: %) is now Admin.', target_email, v_user_id;
    ELSE
        RAISE NOTICE 'ERROR: User % not found in auth.users. Please sign up first.', target_email;
    END IF;
END $$;
