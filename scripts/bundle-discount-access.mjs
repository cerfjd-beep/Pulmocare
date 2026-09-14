import { readFile, writeFile } from "node:fs/promises";

const sql = await readFile("supabase/migrations/20260913000029_discount_access.sql", "utf8");
await writeFile(
  "supabase/install/08-acceso-descuentos.sql",
  `-- Run as postgres after 07-precios-servicios.sql. Safe to repeat; preserves existing discounts.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
${sql}
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260913000029', 'discount_access', ARRAY[$source$${sql}$source$])
ON CONFLICT (version) DO NOTHING;
COMMIT;
SELECT 'Acceso a descuentos habilitado' AS result;
SELECT * FROM public.get_nebulization_discount();
`,
  "utf8",
);
