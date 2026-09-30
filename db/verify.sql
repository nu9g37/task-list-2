-- Confirm that Query Tool is connected to the intended database.
SELECT current_database() AS database_name;

-- Should list six tables after 0001_initial.sql has committed.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('user', 'session', 'account', 'verification', 'projects', 'tasks')
ORDER BY table_name;
