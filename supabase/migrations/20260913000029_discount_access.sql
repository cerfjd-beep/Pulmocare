-- Explicit access for the limited RPC owner, including installations with automatic RLS.
ALTER TABLE private.nebulization_discount ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS executor_discount ON private.nebulization_discount;
CREATE POLICY executor_discount ON private.nebulization_discount
  TO pulmocare_executor USING (true) WITH CHECK (true);
GRANT SELECT, UPDATE ON private.nebulization_discount TO pulmocare_executor;
INSERT INTO private.nebulization_discount(singleton, percent)
VALUES (true, 0) ON CONFLICT (singleton) DO NOTHING;
NOTIFY pgrst, 'reload schema';
