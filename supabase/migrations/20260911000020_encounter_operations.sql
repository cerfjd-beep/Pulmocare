CREATE FUNCTION public.complete_encounter(encounter uuid, completed_at timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.clinical_encounters; a public.appointments; followup uuid;
BEGIN
  SELECT * INTO e FROM public.clinical_encounters WHERE id = encounter;
  SELECT * INTO a FROM public.appointments WHERE id = e.appointment_id FOR UPDATE;
  SELECT * INTO e FROM public.clinical_encounters WHERE id = encounter FOR UPDATE;
  IF e.id IS NULL OR e.professional_id IS DISTINCT FROM private.professional_for_role('therapist')
    OR e.professional_id IS DISTINCT FROM a.professional_id
    OR NOT private.assigned(a.request_id, 'treatment') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF e.status = 'signed' THEN
    SELECT id INTO followup FROM public.follow_ups
    WHERE encounter_id = encounter AND due_at = e.completed_at + interval '24 hours';
    RETURN followup;
  END IF;
  IF a.status NOT IN ('confirmed','in_progress') OR completed_at IS NULL
    OR completed_at < e.started_at OR completed_at > now() OR e.started_at < a.starts_at
    OR length(trim(e.procedure_text)) = 0 OR length(trim(e.evolution_text)) = 0
    OR length(trim(e.recommendations_text)) = 0 THEN
    RAISE EXCEPTION 'Encounter incomplete' USING ERRCODE = '23514';
  END IF;
  UPDATE public.clinical_encounters SET status = 'signed', signed_at = now(),
    completed_at = complete_encounter.completed_at WHERE id = encounter;
  UPDATE public.appointments SET status = 'completed' WHERE id = a.id;
  INSERT INTO public.follow_ups(encounter_id, due_at, assigned_to)
  VALUES (encounter, completed_at + interval '24 hours', e.professional_id)
  RETURNING id INTO followup;
  INSERT INTO public.outbox_jobs(event_type, aggregate_type, aggregate_id, idempotency_key,
    available_at, payload)
  VALUES ('follow_up_due', 'follow_ups', followup, 'follow_up:' || followup,
    completed_at + interval '24 hours', '{}');
  PERFORM private.log_event('encounter_signed', 'clinical_encounters', encounter);
  RETURN followup;
END;
$$;
ALTER FUNCTION public.complete_encounter(uuid, timestamptz) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.complete_encounter(uuid, timestamptz) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.complete_encounter(uuid, timestamptz) TO authenticated;

CREATE FUNCTION public.answer_follow_up(
  followup uuid, improvement text, persistent_symptoms boolean, wants_new_visit boolean, answers jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE patient uuid; revision_number integer; response_id uuid;
BEGIN
  PERFORM 1 FROM public.follow_ups WHERE id = followup FOR UPDATE;
  SELECT r.patient_id INTO patient FROM public.follow_ups f
  JOIN public.clinical_encounters e ON e.id = f.encounter_id
  JOIN public.appointments a ON a.id = e.appointment_id
  JOIN public.service_requests r ON r.id = a.request_id WHERE f.id = followup;
  IF NOT private.owns_patient(patient, 'view_clinical_releases') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(max(revision), 0) + 1 INTO revision_number
  FROM public.follow_up_responses WHERE follow_up_id = followup;
  INSERT INTO public.follow_up_responses(follow_up_id, revision, answered_by,
    improvement, persistent_symptoms, wants_new_visit, answers, created_by)
  VALUES (followup, revision_number, private.current_profile(), improvement,
    persistent_symptoms, wants_new_visit, answers, private.current_profile())
  RETURNING id INTO response_id;
  UPDATE public.follow_ups SET answered_at = now(),
    improvement = answer_follow_up.improvement,
    persistent_symptoms = answer_follow_up.persistent_symptoms,
    wants_new_visit = answer_follow_up.wants_new_visit, answers = answer_follow_up.answers,
    status = CASE WHEN answer_follow_up.persistent_symptoms OR answer_follow_up.wants_new_visit
      THEN 'review_required' ELSE 'answered' END,
    reviewed_at = NULL, reviewed_by = NULL WHERE id = followup;
  INSERT INTO public.outbox_jobs(event_type, aggregate_type, aggregate_id, idempotency_key)
  VALUES ('follow_up_answered', 'follow_ups', followup,
    'follow_up_answered:' || followup || ':' || revision_number);
  PERFORM private.log_event('follow_up_answered', 'follow_ups', followup);
  RETURN response_id;
END;
$$;
ALTER FUNCTION public.answer_follow_up(uuid, text, boolean, boolean, jsonb) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.answer_follow_up(uuid, text, boolean, boolean, jsonb)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.answer_follow_up(uuid, text, boolean, boolean, jsonb) TO authenticated;

CREATE FUNCTION public.read_clinical_release(release uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE patient uuid; content jsonb;
BEGIN
  SELECT r.patient_id, cr.content_snapshot INTO patient, content FROM public.clinical_releases cr
  JOIN public.clinical_encounters e ON e.id = cr.encounter_id
  JOIN public.appointments a ON a.id = e.appointment_id
  JOIN public.service_requests r ON r.id = a.request_id
  WHERE cr.id = release AND e.status = 'signed';
  IF NOT private.owns_patient(patient, 'view_clinical_releases') THEN
    IF private.current_profile() IS NOT NULL THEN
      PERFORM private.log_event('release_read_denied', 'clinical_releases', release);
    END IF;
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;
  PERFORM private.log_event('release_read', 'clinical_releases', release);
  RETURN content;
END;
$$;
ALTER FUNCTION public.read_clinical_release(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.read_clinical_release(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.read_clinical_release(uuid) TO authenticated;

CREATE FUNCTION public.list_operations_requests(page_size integer DEFAULT 50,
  before_time timestamptz DEFAULT 'infinity', before_id uuid DEFAULT 'ffffffff-ffff-ffff-ffff-ffffffffffff')
RETURNS TABLE(id uuid, status text, service_id uuid, preferred_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_role('operations_admin');
  RETURN QUERY SELECT r.id, r.status, r.requested_service_id, r.preferred_at, r.created_at
  FROM public.service_requests r WHERE (r.created_at, r.id) < (before_time, before_id)
  ORDER BY r.created_at DESC, r.id DESC LIMIT greatest(1, least(coalesce(page_size, 50), 100));
END;
$$;
ALTER FUNCTION public.list_operations_requests(integer, timestamptz, uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.list_operations_requests(integer, timestamptz, uuid)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_operations_requests(integer, timestamptz, uuid) TO authenticated;
