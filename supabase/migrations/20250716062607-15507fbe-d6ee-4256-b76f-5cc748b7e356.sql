-- First, let's check if there are any auth triggers that might be broken
DO $$ 
DECLARE
    trigger_rec RECORD;
BEGIN
    -- Check for auth triggers
    FOR trigger_rec IN 
        SELECT trigger_name, event_object_table, action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'auth' OR action_statement LIKE '%handle_new_user%'
    LOOP
        RAISE NOTICE 'Found trigger: % on table: % with action: %', 
                     trigger_rec.trigger_name, 
                     trigger_rec.event_object_table, 
                     trigger_rec.action_statement;
    END LOOP;
END $$;