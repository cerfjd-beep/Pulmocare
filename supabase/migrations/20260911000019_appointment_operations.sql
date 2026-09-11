CREATE FUNCTION public.hold_appointment(quote uuid, approval uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.quotes; r public.service_requests; t public.travel_estimates;
  a public.assessments; address public.addresses; result_id uuid; finish timestamptz;
  policy private.booking_policy; previous public.appointments;
BEGIN
  PERFORM private.require_role('operations_admin');
  SELECT * INTO policy FROM private.booking_policy;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking policy not configured' USING ERRCODE = '23514'; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = quote;
  IF NOT FOUND OR q.professional_id IS NULL THEN
    RAISE EXCEPTION 'Invalid quote' USING ERRCODE = '23514';
  END IF;
  -- All booking/availability changes acquire this same resource lock first.
  PERFORM 1 FROM public.professionals WHERE id = q.professional_id FOR UPDATE;
  SELECT * INTO q FROM public.quotes WHERE id = quote FOR UPDATE;
  SELECT * INTO r FROM public.service_requests WHERE id = q.request_id FOR UPDATE;
  SELECT * INTO t FROM public.travel_estimates WHERE quote_id = quote;
  SELECT * INTO a FROM public.assessments WHERE id = approval;
  SELECT * INTO address FROM public.addresses WHERE id = r.address_id AND patient_id = r.patient_id;
  SELECT t.appointment_at + duration_minutes * interval '1 minute' INTO finish
  FROM public.services WHERE id = r.requested_service_id AND active;
  IF q.status <> 'accepted' OR q.expires_at <= now() OR r.status <> 'approved'
    OR t.id IS NULL OR t.source <> 'live' OR t.expires_at <= now() OR t.departure_at <= now()
    OR a.id IS NULL OR a.request_id <> r.id OR a.result <> 'eligible'
    OR a.valid_until < finish OR a.valid_until IS NULL OR finish IS NULL
    OR a.intake_id IS DISTINCT FROM (SELECT id FROM public.clinical_intakes
      WHERE request_id = r.id ORDER BY revision DESC LIMIT 1)
    OR address.id IS NULL OR NOT address.active
    OR address.latitude IS DISTINCT FROM t.destination_latitude
    OR address.longitude IS DISTINCT FROM t.destination_longitude
    OR NOT private.professional_eligible(q.professional_id, r.requested_service_id, finish)
    OR NOT EXISTS (SELECT 1 FROM public.professionals p JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE p.id = a.assessed_by AND p.active AND pr.active AND p.verification_status = 'verified')
    OR NOT EXISTS (SELECT 1 FROM public.request_assignments WHERE request_id = r.id
      AND professional_id = a.assessed_by AND purpose = 'review' AND revoked_at IS NULL)
    OR NOT EXISTS (SELECT 1 FROM public.professionals p
      JOIN public.role_assignments ra ON ra.profile_id = p.profile_id
      WHERE p.id = a.assessed_by AND ra.role = 'clinical_reviewer' AND ra.revoked_at IS NULL)
  THEN RAISE EXCEPTION 'Quote, approval or professional unavailable' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.professional_availability
    WHERE professional_id = q.professional_id AND kind = 'available'
      AND starts_at <= t.departure_at AND ends_at >= finish)
    OR EXISTS (SELECT 1 FROM public.professional_availability
      WHERE professional_id = q.professional_id AND kind = 'unavailable'
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(t.departure_at, finish, '[)')) THEN
    RAISE EXCEPTION 'Outside professional availability' USING ERRCODE = '23514';
  END IF;
  UPDATE public.appointments SET status = 'expired'
  WHERE professional_id = q.professional_id AND status = 'held' AND hold_expires_at <= now();
  SELECT * INTO previous FROM public.appointments
  WHERE professional_id = q.professional_id AND status IN ('held','confirmed','in_progress')
    AND busy_until <= t.departure_at ORDER BY busy_until DESC LIMIT 1;
  IF previous.id IS NOT NULL AND (t.origin_kind <> 'previous_visit'
    OR (previous.address_snapshot->>'latitude')::numeric IS DISTINCT FROM t.origin_latitude
    OR (previous.address_snapshot->>'longitude')::numeric IS DISTINCT FROM t.origin_longitude) THEN
    RAISE EXCEPTION 'Recalculate route from previous visit' USING ERRCODE = '23514';
  END IF;
  -- Inserting before an existing visit needs coordinated route recalculation, not a guessed origin.
  IF EXISTS (SELECT 1 FROM public.appointments WHERE professional_id = q.professional_id
    AND status IN ('held','confirmed','in_progress') AND starts_at >= finish) THEN
    RAISE EXCEPTION 'Replan subsequent route before inserting visit' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.appointments(request_id, quote_id, professional_id, approval_id,
    address_snapshot, starts_at, ends_at, busy_from, busy_until, status, hold_expires_at)
  VALUES (r.id, quote, q.professional_id, approval,
    jsonb_build_object('address_line', address.address_line, 'references', address.reference_notes,
      'latitude', address.latitude, 'longitude', address.longitude,
      'department_code', address.department_code, 'municipality_code', address.municipality_code),
    t.appointment_at, finish, t.departure_at, finish, 'held',
    least(now() + policy.hold_minutes * interval '1 minute', q.expires_at, t.departure_at))
  RETURNING id INTO result_id;
  PERFORM private.log_event('appointment_held', 'appointments', result_id);
  RETURN result_id;
END;
$$;
ALTER FUNCTION public.hold_appointment(uuid, uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.hold_appointment(uuid, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.hold_appointment(uuid, uuid) TO authenticated;

CREATE FUNCTION public.confirm_appointment(appointment uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.appointments; r public.service_requests; sale public.sales;
BEGIN
  PERFORM private.require_role('operations_admin');
  SELECT * INTO a FROM public.appointments WHERE id = appointment;
  PERFORM 1 FROM public.professionals WHERE id = a.professional_id FOR UPDATE;
  SELECT * INTO a FROM public.appointments WHERE id = appointment FOR UPDATE;
  SELECT * INTO r FROM public.service_requests WHERE id = a.request_id FOR UPDATE;
  IF a.status = 'confirmed' THEN RETURN; END IF;
  IF a.id IS NULL OR a.status <> 'held' OR a.hold_expires_at <= now()
    OR r.status <> 'approved' OR NOT private.professional_eligible(
      a.professional_id, r.requested_service_id, a.ends_at)
    OR NOT EXISTS (SELECT 1 FROM public.assessments x WHERE x.id = a.approval_id
      AND x.result = 'eligible' AND x.valid_until >= a.ends_at
      AND x.intake_id = (SELECT id FROM public.clinical_intakes
        WHERE request_id = r.id ORDER BY revision DESC LIMIT 1)
      AND EXISTS (SELECT 1 FROM public.professionals p
        JOIN public.profiles pr ON pr.id = p.profile_id
        JOIN public.role_assignments ra ON ra.profile_id = p.profile_id
        JOIN public.request_assignments ar ON ar.professional_id = p.id
        WHERE p.id = x.assessed_by AND p.active AND pr.active
          AND p.verification_status = 'verified' AND ra.role = 'clinical_reviewer'
          AND ra.revoked_at IS NULL AND ar.request_id = r.id
          AND ar.purpose = 'review' AND ar.revoked_at IS NULL)) THEN
    RAISE EXCEPTION 'Hold or approval is no longer valid' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO sale FROM public.sales WHERE quote_id = a.quote_id FOR UPDATE;
  IF NOT coalesce((sale.id IS NOT NULL AND sale.status = 'settled') OR
    (r.payment_preference = 'pay_on_visit' AND EXISTS (
      SELECT 1 FROM private.booking_policy WHERE allow_pay_on_visit)), false) THEN
    RAISE EXCEPTION 'Payment policy not satisfied' USING ERRCODE = '23514';
  END IF;
  UPDATE public.appointments SET status = 'confirmed', confirmed_at = now() WHERE id = appointment;
  INSERT INTO public.request_assignments(request_id, professional_id, purpose, assigned_by)
  VALUES (r.id, a.professional_id, 'treatment', private.current_profile())
  ON CONFLICT (request_id, professional_id, purpose) WHERE revoked_at IS NULL DO NOTHING;
  PERFORM private.log_event('appointment_confirmed', 'appointments', appointment);
END;
$$;
ALTER FUNCTION public.confirm_appointment(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.confirm_appointment(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_appointment(uuid) TO authenticated;
