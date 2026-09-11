CREATE FUNCTION private.current_profile() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() AND active
$$;

CREATE FUNCTION private.has_role(required_role text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_assignments
    WHERE profile_id = private.current_profile() AND role = required_role
      AND revoked_at IS NULL
  )
$$;

CREATE FUNCTION private.owns_patient(patient uuid, scope text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p WHERE p.id = patient AND p.active AND (
      p.profile_id = private.current_profile() OR EXISTS (
        SELECT 1 FROM public.caregiver_links c
        WHERE c.patient_id = p.id AND c.caregiver_id = private.current_profile()
          AND c.revoked_at IS NULL AND (c.expires_at IS NULL OR c.expires_at > now())
          AND scope = ANY(c.scopes)
      )
    )
  )
$$;

CREATE FUNCTION private.professional_for_role(required_role text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.professionals
  WHERE profile_id = private.current_profile() AND active
    AND verification_status = 'verified' AND private.has_role(required_role)
$$;

CREATE FUNCTION private.assigned(request uuid, purpose_required text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.request_assignments a
    WHERE a.request_id = request AND a.purpose = purpose_required AND a.revoked_at IS NULL
      AND a.professional_id = private.professional_for_role(
        CASE purpose_required WHEN 'review' THEN 'clinical_reviewer' ELSE 'therapist' END
      )
  )
$$;

CREATE FUNCTION private.owns_request(request uuid, scope text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request
    AND private.owns_patient(r.patient_id, scope))
$$;

CREATE FUNCTION private.require_role(required_role text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.has_role(required_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN private.current_profile();
END;
$$;

CREATE FUNCTION private.log_event(
  event_action text, object_type text, object_id uuid, fields text[] DEFAULT NULL
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.audit_events
    (actor_profile_id, system_actor, action, entity_type, entity_id, changed_fields)
  VALUES (private.current_profile(),
    CASE WHEN private.current_profile() IS NULL THEN 'database_worker' END,
    event_action, object_type, object_id, fields)
$$;

-- Assign owners only to the known no-login role. This membership is removed in the last migration.
GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA public, private TO pulmocare_executor;
ALTER FUNCTION private.current_profile() OWNER TO pulmocare_executor;
ALTER FUNCTION private.has_role(text) OWNER TO pulmocare_executor;
ALTER FUNCTION private.owns_patient(uuid, text) OWNER TO pulmocare_executor;
ALTER FUNCTION private.professional_for_role(text) OWNER TO pulmocare_executor;
ALTER FUNCTION private.assigned(uuid, text) OWNER TO pulmocare_executor;
ALTER FUNCTION private.owns_request(uuid, text) OWNER TO pulmocare_executor;
ALTER FUNCTION private.require_role(text) OWNER TO pulmocare_executor;
ALTER FUNCTION private.log_event(text, text, uuid, text[]) OWNER TO pulmocare_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO pulmocare_executor;
GRANT EXECUTE ON FUNCTION private.current_profile(), private.has_role(text),
  private.owns_patient(uuid, text), private.assigned(uuid, text),
  private.professional_for_role(text), private.owns_request(uuid, text) TO authenticated;

CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated
USING (id = private.current_profile());
GRANT SELECT (id, display_name, active) ON public.profiles TO authenticated;

CREATE POLICY own_patient ON public.patients FOR SELECT TO authenticated
USING (private.owns_patient(id, 'request_service'));
GRANT SELECT (id, full_name, birth_date, sex, phone, email, active)
ON public.patients TO authenticated;

CREATE POLICY own_address ON public.addresses FOR SELECT TO authenticated
USING (private.owns_patient(patient_id, 'request_service'));
GRANT SELECT ON public.addresses TO authenticated;

CREATE POLICY own_request ON public.service_requests FOR SELECT TO authenticated
USING (private.owns_patient(patient_id, 'request_service'));
GRANT SELECT (id, patient_id, requested_service_id, status, submitted_at, preferred_at)
ON public.service_requests TO authenticated;

CREATE POLICY catalog ON public.services FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT (id, code, name, description, duration_minutes) ON public.services TO anon, authenticated;
CREATE POLICY published_prices ON public.service_price_versions FOR SELECT TO anon, authenticated
USING (status = 'published' AND valid_from <= now() AND (valid_until IS NULL OR valid_until > now()));
GRANT SELECT (id, service_id, amount_cents, currency, valid_from, valid_until)
ON public.service_price_versions TO anon, authenticated;

CREATE POLICY own_quote ON public.quotes FOR SELECT TO authenticated
USING (status <> 'draft' AND private.owns_request(request_id, 'manage_payments'));
GRANT SELECT (id, request_id, status, currency, service_cents, distance_cents,
  traffic_cents, tax_cents, total_cents, expires_at, accepted_at) ON public.quotes TO authenticated;

-- No SELECT on clinical tables: reads must use an authorized, audited RPC.
CREATE POLICY own_appointment ON public.appointments FOR SELECT TO authenticated
USING (private.owns_request(request_id, 'view_appointments'));
GRANT SELECT (id, request_id, starts_at, ends_at, status) ON public.appointments TO authenticated;

-- No direct business INSERT/UPDATE grants: transitions run only inside RPC transactions.
