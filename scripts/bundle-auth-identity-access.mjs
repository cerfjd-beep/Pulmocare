import { readFile, writeFile } from "node:fs/promises";

const sql = await readFile("supabase/migrations/20260913000030_auth_identity_access.sql", "utf8");
await writeFile(
  "supabase/install/09-acceso-identidad.sql",
  `-- Run as postgres in Supabase SQL Editor. Safe to repeat; does not change passwords or roles.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
${sql}
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY, statements text[], name text
);
REVOKE ALL ON SCHEMA supabase_migrations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON supabase_migrations.schema_migrations FROM PUBLIC, anon, authenticated;
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260913000030', 'auth_identity_access', ARRAY[$source$${sql}$source$])
ON CONFLICT (version) DO NOTHING;
COMMIT;
SELECT 'Consulta de perfiles habilitada' AS result;

-- Inspect only the designated administrator's status. No account permissions are changed.
SELECT u.email, u.email_confirmed_at IS NOT NULL AS email_confirmed,
  p.id IS NOT NULL AS has_profile, p.active AS profile_active,
  coalesce(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY[]::text[]) AS roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
LEFT JOIN public.role_assignments r ON r.profile_id = p.id AND r.revoked_at IS NULL
WHERE lower(u.email) = '13.guzman@gmail.com'
GROUP BY u.email, u.email_confirmed_at, p.id, p.active;
`,
  "utf8",
);
