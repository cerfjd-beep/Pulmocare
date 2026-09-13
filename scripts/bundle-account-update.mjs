import { readFile, writeFile } from "node:fs/promises";
const sql = await readFile("supabase/migrations/20260911000026_account_portals.sql", "utf8");
await writeFile(
  "supabase/install/04-actualizar-perfiles.sql",
  `-- Existing Pulmocare installation only. Run as postgres in Supabase SQL Editor.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
DO $check$
BEGIN
 IF to_regclass('public.profiles') IS NULL THEN
  RAISE EXCEPTION 'Install pulmocare-inicial.sql first; this is only an update';
 END IF;
 IF to_regprocedure('public.get_my_access()') IS NOT NULL THEN
  RAISE EXCEPTION 'Account update already installed; no changes made';
 END IF;
END;
$check$;
${sql}
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[], name text);
REVOKE ALL ON SCHEMA supabase_migrations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON supabase_migrations.schema_migrations FROM PUBLIC,anon,authenticated;
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES ('20260911000026','account_portals',ARRAY[$source$${sql}$source$]);
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT 'Account portals installed' AS result;
`,
  "utf8",
);
console.log("Generated account update for existing installations.");
