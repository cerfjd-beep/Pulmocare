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
