INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('prescriptions', 'prescriptions', false, 5242880,
    ARRAY['application/pdf','image/jpeg','image/png']),
  ('credentials', 'credentials', false, 5242880,
    ARRAY['application/pdf','image/jpeg','image/png']),
  ('clinical-attachments', 'clinical-attachments', false, 5242880,
    ARRAY['application/pdf','image/jpeg','image/png']),
  ('billing-support', 'billing-support', false, 5242880,
    ARRAY['application/pdf','image/jpeg','image/png']);

CREATE FUNCTION private.can_upload_document(bucket text, object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.documents d
    WHERE d.bucket_id = bucket AND d.object_path = object_name AND d.scan_status = 'pending'
      AND d.owner_profile_id = private.current_profile()
      AND split_part(object_name, '/', 1) = private.current_profile()::text
      AND ((d.category = 'prescription' AND private.owns_patient(d.patient_id, 'request_service'))
        OR (d.category = 'credential' AND EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = d.professional_id AND p.profile_id = private.current_profile() AND p.active))
        OR (d.category = 'billing_support' AND private.has_role('billing_admin'))))
$$;
ALTER FUNCTION private.can_upload_document(text, text) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION private.can_upload_document(text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION private.can_upload_document(text, text) TO authenticated;
CREATE POLICY pulmocare_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (private.can_upload_document(bucket_id, name));
-- No client SELECT/UPDATE/DELETE policy. Clinical downloads require audited authorization
-- followed by short-lived server signing. Metadata reservation/scanning is server work.

CREATE FUNCTION public.finish_outbox(job uuid, worker text, attempt integer,
  succeeded boolean, error_code text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF error_code IS NOT NULL AND error_code !~ '^[A-Z0-9_]{1,80}$' THEN
    RAISE EXCEPTION 'Use an error code, not a provider payload' USING ERRCODE = '22023';
  END IF;
  UPDATE public.outbox_jobs SET
    status = CASE WHEN succeeded THEN 'succeeded' WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
    locked_until = NULL, worker_id = NULL, last_error_code = error_code,
    available_at = CASE WHEN succeeded THEN available_at ELSE now() + interval '1 minute' END
  WHERE id = job AND worker_id = worker AND attempts = attempt
    AND status = 'running' AND locked_until > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Lease expired or replaced' USING ERRCODE = '23514'; END IF;
END;
$$;
ALTER FUNCTION public.finish_outbox(uuid, text, integer, boolean, text) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.finish_outbox(uuid, text, integer, boolean, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_outbox(uuid, text, integer, boolean, text) TO service_role;

CREATE FUNCTION private.lock_availability() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE professional uuid;
BEGIN
  professional := CASE WHEN TG_OP = 'DELETE' THEN OLD.professional_id ELSE NEW.professional_id END;
  PERFORM 1 FROM public.professionals WHERE id = professional FOR UPDATE;
  IF TG_OP = 'UPDATE' AND NEW.professional_id <> OLD.professional_id THEN
    RAISE EXCEPTION 'Cannot transfer availability' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments WHERE professional_id = professional
    AND status IN ('held','confirmed','in_progress')) THEN
    RAISE EXCEPTION 'Reconcile active appointments before changing availability' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.lock_availability() FROM PUBLIC;
CREATE TRIGGER serialize_availability BEFORE INSERT OR UPDATE OR DELETE ON public.professional_availability
FOR EACH ROW EXECUTE FUNCTION private.lock_availability();

CREATE FUNCTION public.expire_holds() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE professional uuid; affected integer; total integer := 0;
BEGIN
  FOR professional IN SELECT DISTINCT professional_id FROM public.appointments
    WHERE status = 'held' AND hold_expires_at <= now() ORDER BY professional_id LIMIT 100
  LOOP
    PERFORM 1 FROM public.professionals WHERE id = professional FOR UPDATE;
    UPDATE public.appointments SET status = 'expired'
    WHERE professional_id = professional AND status = 'held' AND hold_expires_at <= now();
    GET DIAGNOSTICS affected = ROW_COUNT;
    total := total + affected;
  END LOOP;
  RETURN total;
END;
$$;
ALTER FUNCTION public.expire_holds() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.expire_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_holds() TO service_role;
