-- Temporarily disable the trigger to isolate the auth issue
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Also temporarily disable the auto_confirm_user trigger if it exists
DROP TRIGGER IF EXISTS on_confirm_user ON auth.users;