import { readFile, writeFile } from "node:fs/promises";
const sql = await readFile("supabase/migrations/20260913000028_service_pricing.sql", "utf8");
await writeFile(
  "supabase/install/07-precios-servicios.sql",
  `-- Run as postgres on an existing Pulmocare installation. No default prices are published.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
${sql}
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[],name text);
REVOKE ALL ON SCHEMA supabase_migrations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON supabase_migrations.schema_migrations FROM PUBLIC,anon,authenticated;
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES('20260913000028','service_pricing',ARRAY[$source$${sql}$source$]);
COMMIT;
SELECT 'Precios y descuentos habilitados' AS result;
`,
  "utf8",
);
