import { readFile, writeFile } from "node:fs/promises";
const sql = await readFile("supabase/migrations/20260913000031_patient_requests.sql", "utf8");
await writeFile(
  "supabase/install/11-solicitudes-pacientes.sql",
  `-- Ejecutar como postgres después de 09-acceso-identidad.sql.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
${sql}
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES('20260913000031','patient_requests',ARRAY[$source$${sql}$source$]);
COMMIT;
SELECT 'Solicitudes de pacientes y perfiles habilitados' AS result;
`,
  "utf8",
);
