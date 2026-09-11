-- Read-only preflight. Run in the intended Supabase project before the installation.
SELECT current_database() AS database, current_user AS sql_role, version() AS postgres_version;
SELECT name, default_version, installed_version FROM pg_available_extensions
WHERE name IN ('btree_gist', 'pgcrypto');
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname IN ('public', 'private', 'supabase_migrations')
ORDER BY schemaname, tablename;
SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'pulmocare_executor';
-- Existing tables or application migrations require a schema comparison before installation.
