-- Auth and Storage are managed by Supabase; never recreate them in migrations.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE SCHEMA private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;

-- No login, membership or bypass-RLS: owns only tightly scoped RPC functions.
CREATE ROLE pulmocare_executor NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public, private, auth TO pulmocare_executor;
GRANT EXECUTE ON FUNCTION auth.uid() TO pulmocare_executor;

CREATE FUNCTION private.stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_at := statement_timestamp();
  NEW.updated_by := (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() AND active
  );
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := statement_timestamp();
    NEW.created_by := NEW.updated_by;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.stamp() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.stamp() TO pulmocare_executor;

CREATE FUNCTION private.immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Record is immutable' USING ERRCODE = '23514';
END;
$$;
REVOKE ALL ON FUNCTION private.immutable() FROM PUBLIC;
