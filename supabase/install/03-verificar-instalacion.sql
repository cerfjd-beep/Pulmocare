-- No patient rows or credentials are read by these checks.
SELECT count(*) AS application_tables,
  count(*) FILTER (WHERE rowsecurity) AS protected_tables
FROM pg_tables WHERE schemaname = 'public';

SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version BETWEEN '20260911000001' AND '20260913000030' ORDER BY version;

SELECT id, public, file_size_limit FROM storage.buckets
WHERE id IN ('prescriptions','credentials','clinical-attachments','billing-support');

SELECT status, count(*) FROM public.service_price_versions GROUP BY status;
SELECT version, status FROM public.travel_tariff_versions;
SELECT count(*) AS administrative_assignments FROM public.role_assignments
WHERE role = 'access_admin' AND revoked_at IS NULL;

SELECT c.relname AS table_with_unexpected_client_writes
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE');

SELECT p.proname AS function_with_unexpected_public_execution
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
WHERE n.nspname = 'public' AND a.grantee = 0 AND a.privilege_type = 'EXECUTE';
