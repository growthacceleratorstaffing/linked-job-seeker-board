ALTER TABLE public.integration_settings DROP CONSTRAINT IF EXISTS integration_settings_integration_type_key;
DELETE FROM public.integration_settings WHERE user_id IS NULL;
ALTER TABLE public.integration_settings ADD CONSTRAINT integration_settings_user_type_key UNIQUE (user_id, integration_type);