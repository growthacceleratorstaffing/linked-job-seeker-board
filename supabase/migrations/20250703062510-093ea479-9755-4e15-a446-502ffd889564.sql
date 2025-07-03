-- Update the existing handle_new_user function to work with workable integration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  
  -- Make the first user admin if no admin exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
    
    -- Also make them admin in workable_users table
    INSERT INTO public.workable_users (user_id, workable_email, workable_user_id, workable_role)
    VALUES (new.id, new.email, new.id::text, 'admin');
  ELSE
    -- Assign regular user role to subsequent users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
    
    -- Add them as general employee (viewer) in workable_users table
    INSERT INTO public.workable_users (user_id, workable_email, workable_user_id, workable_role)
    VALUES (new.id, new.email, new.id::text, 'viewer');
  END IF;
  
  RETURN new;
END;
$$;

-- Create trigger if it doesn't exist (this will replace existing one if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();