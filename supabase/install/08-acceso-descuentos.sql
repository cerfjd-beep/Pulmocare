-- Run as postgres after 07-precios-servicios.sql. Safe to repeat; preserves existing discounts.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
-- Explicit access for the limited RPC owner, including installations with automatic RLS.
ALTER TABLE private.nebulization_discount ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS executor_discount ON private.nebulization_discount;
CREATE POLICY executor_discount ON private.nebulization_discount
  TO pulmocare_executor USING (true) WITH CHECK (true);
GRANT SELECT, UPDATE ON private.nebulization_discount TO pulmocare_executor;
INSERT INTO private.nebulization_discount(singleton, percent)
VALUES (true, 0) ON CONFLICT (singleton) DO NOTHING;
NOTIFY pgrst, 'reload schema';

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260913000029', 'discount_access', ARRAY[$source$-- Explicit access for the limited RPC owner, including installations with automatic RLS.
ALTER TABLE private.nebulization_discount ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS executor_discount ON private.nebulization_discount;
CREATE POLICY executor_discount ON private.nebulization_discount
  TO pulmocare_executor USING (true) WITH CHECK (true);
GRANT SELECT, UPDATE ON private.nebulization_discount TO pulmocare_executor;
INSERT INTO private.nebulization_discount(singleton, percent)
VALUES (true, 0) ON CONFLICT (singleton) DO NOTHING;
NOTIFY pgrst, 'reload schema';
$source$])
ON CONFLICT (version) DO NOTHING;
COMMIT;
SELECT 'Acceso a descuentos habilitado' AS result;
SELECT * FROM public.get_nebulization_discount();
