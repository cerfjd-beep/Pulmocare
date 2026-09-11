CREATE FUNCTION private.valid_answer(answer jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_typeof(answer) = 'object'
    AND answer->>'state' IN ('none','selected')
    AND jsonb_typeof(answer->'items') = 'array'
    AND CASE WHEN jsonb_typeof(answer->'items') = 'array' THEN
      ((answer->>'state' = 'none' AND jsonb_array_length(answer->'items') = 0)
       OR (answer->>'state' = 'selected' AND jsonb_array_length(answer->'items') > 0))
    ELSE false END
    AND CASE WHEN jsonb_typeof(answer->'items') = 'array' THEN NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(answer->'items') item
      WHERE jsonb_typeof(item) <> 'string' OR length(trim(item #>> '{}')) = 0
    ) ELSE false END, false)
$$;
REVOKE ALL ON FUNCTION private.valid_answer(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.valid_answer(jsonb) TO pulmocare_executor;

CREATE FUNCTION public.submit_request(request uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.service_requests; intake public.clinical_intakes;
BEGIN
  SELECT * INTO r FROM public.service_requests WHERE id = request FOR UPDATE;
  IF NOT FOUND OR NOT private.owns_patient(r.patient_id, 'request_service') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF r.status <> 'draft' OR r.requested_service_id IS NULL OR r.address_id IS NULL THEN
    RAISE EXCEPTION 'Incomplete or submitted request' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO intake FROM public.clinical_intakes
  WHERE request_id = request ORDER BY revision DESC LIMIT 1;
  IF NOT FOUND OR intake.completed_at IS NULL OR intake.questionnaire_version <> 'intake-v1'
    OR NOT private.valid_answer(intake.symptoms) OR NOT private.valid_answer(intake.history)
    OR NOT EXISTS (SELECT 1 FROM public.consents WHERE patient_id = r.patient_id
      AND purpose = 'service_request' AND revoked_at IS NULL)
    OR NOT EXISTS (SELECT 1 FROM public.services WHERE id = r.requested_service_id AND active)
  THEN RAISE EXCEPTION 'Incomplete questionnaire or consent' USING ERRCODE = '23514'; END IF;
  UPDATE public.service_requests SET status = 'submitted', submitted_at = now() WHERE id = request;
  PERFORM private.log_event('request_submitted', 'service_requests', request, ARRAY['status']);
END;
$$;
ALTER FUNCTION public.submit_request(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.submit_request(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_request(uuid) TO authenticated;

CREATE FUNCTION public.assign_reviewer(request uuid, reviewer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; assignment uuid;
BEGIN
  actor := private.require_role('operations_admin');
  PERFORM 1 FROM public.service_requests WHERE id = request
    AND status IN ('submitted','in_review','medical_review') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid request state' USING ERRCODE = '23514'; END IF;
  PERFORM 1 FROM public.professionals p JOIN public.profiles pr ON pr.id = p.profile_id
  WHERE p.id = reviewer AND p.active AND pr.active AND p.verification_status = 'verified'
    AND EXISTS (SELECT 1 FROM public.role_assignments ra WHERE ra.profile_id = p.profile_id
      AND ra.role = 'clinical_reviewer' AND ra.revoked_at IS NULL) FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reviewer not habilitated' USING ERRCODE = '23514'; END IF;
  INSERT INTO public.request_assignments(request_id, professional_id, purpose, assigned_by)
  VALUES (request, reviewer, 'review', actor)
  ON CONFLICT (request_id, professional_id, purpose) WHERE revoked_at IS NULL
    DO NOTHING RETURNING id INTO assignment;
  UPDATE public.service_requests SET status = 'in_review' WHERE id = request;
  PERFORM private.log_event('reviewer_assigned', 'service_requests', request);
  RETURN coalesce(assignment, (SELECT id FROM public.request_assignments
    WHERE request_id = request AND professional_id = reviewer
      AND purpose = 'review' AND revoked_at IS NULL));
END;
$$;
ALTER FUNCTION public.assign_reviewer(uuid, uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.assign_reviewer(uuid, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.assign_reviewer(uuid, uuid) TO authenticated;

CREATE FUNCTION public.record_assessment(
  request uuid, intake uuid, protocol uuid, decision text, rationale text, expires_at timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result_id uuid; latest uuid; r public.service_requests;
BEGIN
  IF NOT private.assigned(request, 'review') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.service_requests WHERE id = request FOR UPDATE;
  IF r.status <> 'in_review' OR decision NOT IN
    ('eligible','medical_review','urgent_referral','insufficient_data') THEN
    RAISE EXCEPTION 'Invalid decision or request state' USING ERRCODE = '23514';
  END IF;
  SELECT id INTO latest FROM public.clinical_intakes WHERE request_id = request
  ORDER BY revision DESC LIMIT 1;
  IF latest IS DISTINCT FROM intake OR NOT EXISTS (
    SELECT 1 FROM public.clinical_intakes WHERE id = intake AND completed_at IS NOT NULL
  ) OR NOT EXISTS (SELECT 1 FROM public.patients WHERE id = r.patient_id AND birth_date IS NOT NULL)
    OR NOT EXISTS (SELECT 1 FROM public.clinical_protocol_versions
      WHERE id = protocol AND status = 'approved') THEN
    RAISE EXCEPTION 'Incomplete intake or unapproved protocol' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.assessments(request_id, intake_id, protocol_id, assessed_by,
    result, rationale, valid_until, created_by)
  VALUES (request, intake, protocol, private.professional_for_role('clinical_reviewer'),
    decision, rationale, expires_at, private.current_profile()) RETURNING id INTO result_id;
  UPDATE public.service_requests SET status = CASE decision
    WHEN 'eligible' THEN 'approved' WHEN 'medical_review' THEN 'medical_review'
    WHEN 'urgent_referral' THEN 'referred' ELSE 'in_review' END WHERE id = request;
  PERFORM private.log_event('assessment_recorded', 'assessments', result_id);
  RETURN result_id;
END;
$$;
ALTER FUNCTION public.record_assessment(uuid, uuid, uuid, text, text, timestamptz)
OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.record_assessment(uuid, uuid, uuid, text, text, timestamptz)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.record_assessment(uuid, uuid, uuid, text, text, timestamptz)
TO authenticated;

CREATE FUNCTION public.read_clinical_request(request uuid, purpose text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE response jsonb;
BEGIN
  IF purpose NOT IN ('review','treatment') OR purpose IS NULL
    OR NOT private.assigned(request, purpose) THEN
    -- Return a generic denial so the audit record can commit (an exception would roll it back).
    IF private.current_profile() IS NOT NULL THEN
      PERFORM private.log_event('clinical_read_denied', 'service_requests', request);
    END IF;
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;
  SELECT jsonb_build_object('id', r.id, 'patient_id', r.patient_id,
    'intake', (SELECT to_jsonb(i) - ARRAY['created_by','updated_by']
      FROM public.clinical_intakes i WHERE i.request_id = r.id ORDER BY revision DESC LIMIT 1),
    'assessments', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]') FROM (
      SELECT id, result, rationale, assessed_at, valid_until FROM public.assessments
      WHERE request_id = r.id ORDER BY assessed_at DESC LIMIT 20
    ) a)) INTO response FROM public.service_requests r WHERE r.id = request;
  PERFORM private.log_event('clinical_read', 'service_requests', request);
  RETURN response;
END;
$$;
ALTER FUNCTION public.read_clinical_request(uuid, text) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.read_clinical_request(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.read_clinical_request(uuid, text) TO authenticated;
