CREATE FUNCTION public.register_patient(display_name text, birth_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; patient uuid;
BEGIN
  IF auth.uid() IS NULL OR length(trim(display_name)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Valid authenticated identity required' USING ERRCODE = '42501';
  END IF;
  -- Concurrent retries for the same account cannot create duplicate identities.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  SELECT id INTO actor FROM public.profiles WHERE auth_user_id = auth.uid() AND active;
  IF actor IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Inactive identity' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.profiles(auth_user_id, display_name)
    VALUES (auth.uid(), register_patient.display_name) RETURNING id INTO actor;
  END IF;
  SELECT id INTO patient FROM public.patients WHERE profile_id = actor;
  IF patient IS NULL THEN
    INSERT INTO public.patients(profile_id, full_name, birth_date)
    VALUES (actor, display_name, register_patient.birth_date) RETURNING id INTO patient;
    INSERT INTO public.role_assignments(profile_id, role, granted_by)
    VALUES (actor, 'patient', actor) ON CONFLICT (profile_id, role)
      WHERE revoked_at IS NULL DO NOTHING;
    PERFORM private.log_event('patient_registered', 'patients', patient);
  END IF;
  RETURN patient;
END;
$$;
ALTER FUNCTION public.register_patient(text, date) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.register_patient(text, date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.register_patient(text, date) TO authenticated;

CREATE FUNCTION public.grant_role(target_profile uuid, assigned_role text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; assignment uuid;
BEGIN
  actor := private.require_role('access_admin');
  PERFORM 1 FROM public.profiles WHERE id = target_profile AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid target' USING ERRCODE = '23514'; END IF;
  INSERT INTO public.role_assignments(profile_id, role, granted_by)
  VALUES (target_profile, assigned_role, actor)
  ON CONFLICT (profile_id, role) WHERE revoked_at IS NULL DO NOTHING RETURNING id INTO assignment;
  IF assignment IS NULL THEN
    SELECT id INTO assignment FROM public.role_assignments
    WHERE profile_id = target_profile AND role = assigned_role AND revoked_at IS NULL;
  ELSE
    PERFORM private.log_event('role_granted', 'role_assignments', assignment);
  END IF;
  RETURN assignment;
END;
$$;
ALTER FUNCTION public.grant_role(uuid, text) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.grant_role(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.grant_role(uuid, text) TO authenticated;

CREATE FUNCTION public.revoke_access(object_type text, object_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_role('access_admin');
  IF object_type = 'role_assignments' THEN
    UPDATE public.role_assignments SET revoked_at = now()
    WHERE id = object_id AND revoked_at IS NULL;
  ELSIF object_type = 'caregiver_links' THEN
    UPDATE public.caregiver_links SET revoked_at = now()
    WHERE id = object_id AND revoked_at IS NULL;
  ELSE RAISE EXCEPTION 'Invalid object type' USING ERRCODE = '22023';
  END IF;
  IF FOUND THEN PERFORM private.log_event('access_revoked', object_type, object_id); END IF;
END;
$$;
ALTER FUNCTION public.revoke_access(text, uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.revoke_access(text, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_access(text, uuid) TO authenticated;

-- Bootstrap is deliberately unavailable to the application API. Run once via SQL administration.
CREATE FUNCTION private.bootstrap_access_admin(target_auth_user uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(11092026);
  IF EXISTS (SELECT 1 FROM public.role_assignments
    WHERE role = 'access_admin' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Access administrator already initialized' USING ERRCODE = '23514';
  END IF;
  SELECT id INTO STRICT target FROM public.profiles
  WHERE auth_user_id = target_auth_user AND active;
  INSERT INTO public.role_assignments(profile_id, role, granted_by)
  VALUES (target, 'access_admin', target);
  INSERT INTO public.audit_events(system_actor, action, entity_type, entity_id)
  VALUES ('sql_bootstrap', 'bootstrap_access_admin', 'profiles', target);
  RETURN target;
END;
$$;
REVOKE ALL ON FUNCTION private.bootstrap_access_admin(uuid)
FROM PUBLIC, anon, authenticated, service_role, pulmocare_executor;
