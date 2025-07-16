-- Check if there are any problematic triggers or functions
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_schema = 'auth'
ORDER BY t.trigger_name;