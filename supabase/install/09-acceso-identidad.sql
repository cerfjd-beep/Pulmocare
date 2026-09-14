-- Run as postgres in Supabase SQL Editor. Safe to repeat; does not change passwords or roles.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
-- Read the subject already verified and installed by PostgREST for this request.
-- No permission on the managed auth schema or auth.users is required.
GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA private TO pulmocare_executor;
CREATE OR REPLACE FUNCTION private.request_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(
    nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''),
    nullif(current_setting('request.jwt.claim.sub', true), '')
  )::uuid;
$$;
ALTER FUNCTION private.request_user_id() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION private.request_user_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.request_user_id() TO pulmocare_executor, postgres;

-- Change only identity resolution in these five application functions.
-- CREATE OR REPLACE retains their owners, grants and authorization checks.
DO $repair$
DECLARE signature text; target regprocedure; definition text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'private.stamp()',
    'private.current_profile()',
    'public.register_patient(text,date)',
    'public.get_my_access()',
    'public.register_provider(text,text,text)'
  ] LOOP
    target := to_regprocedure(signature);
    IF target IS NULL THEN
      RAISE EXCEPTION 'Falta una función requerida: %', signature;
    END IF;
    definition := pg_get_functiondef(target);
    IF position('auth.uid()' IN definition) > 0 THEN
      EXECUTE replace(definition, 'auth.uid()', 'private.request_user_id()');
    ELSIF position('private.request_user_id()' IN definition) = 0 THEN
      RAISE EXCEPTION 'Definición inesperada; revisar antes de actualizar: %', signature;
    END IF;
  END LOOP;
END;
$repair$;
REVOKE CREATE ON SCHEMA private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
NOTIFY pgrst, 'reload schema';

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY, statements text[], name text
);
REVOKE ALL ON SCHEMA supabase_migrations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON supabase_migrations.schema_migrations FROM PUBLIC, anon, authenticated;
INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES ('20260913000030', 'auth_identity_access', ARRAY[$source$-- Read the subject already verified and installed by PostgREST for this request.
-- No permission on the managed auth schema or auth.users is required.
GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA private TO pulmocare_executor;
CREATE OR REPLACE FUNCTION private.request_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(
    nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''),
    nullif(current_setting('request.jwt.claim.sub', true), '')
  )::uuid;
$$;
ALTER FUNCTION private.request_user_id() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION private.request_user_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.request_user_id() TO pulmocare_executor, postgres;

-- Change only identity resolution in these five application functions.
-- CREATE OR REPLACE retains their owners, grants and authorization checks.
DO $repair$
DECLARE signature text; target regprocedure; definition text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'private.stamp()',
    'private.current_profile()',
    'public.register_patient(text,date)',
    'public.get_my_access()',
    'public.register_provider(text,text,text)'
  ] LOOP
    target := to_regprocedure(signature);
    IF target IS NULL THEN
      RAISE EXCEPTION 'Falta una función requerida: %', signature;
    END IF;
    definition := pg_get_functiondef(target);
    IF position('auth.uid()' IN definition) > 0 THEN
      EXECUTE replace(definition, 'auth.uid()', 'private.request_user_id()');
    ELSIF position('private.request_user_id()' IN definition) = 0 THEN
      RAISE EXCEPTION 'Definición inesperada; revisar antes de actualizar: %', signature;
    END IF;
  END LOOP;
END;
$repair$;
REVOKE CREATE ON SCHEMA private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
NOTIFY pgrst, 'reload schema';
$source$])
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
