CREATE TABLE private.booking_policy (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  hold_minutes integer NOT NULL CHECK (hold_minutes BETWEEN 1 AND 60),
  tax_basis_points integer NOT NULL CHECK (tax_basis_points BETWEEN 0 AND 10000),
  tax_policy_version text NOT NULL,
  allow_pay_on_visit boolean NOT NULL DEFAULT false,
  approved_by uuid NOT NULL REFERENCES public.profiles(id),
  approved_at timestamptz NOT NULL
);
REVOKE ALL ON private.booking_policy FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON private.booking_policy TO pulmocare_executor;
-- No policy is seeded. An accountable operator must approve commercial settings first.

CREATE FUNCTION public.offer_quote(quote uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.quotes; t public.travel_estimates; policy private.booking_policy;
  service_total bigint; distance_total bigint; traffic_total bigint; tax_total bigint;
BEGIN
  PERFORM private.require_role('operations_admin');
  SELECT * INTO policy FROM private.booking_policy;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commercial policy not configured' USING ERRCODE = '23514'; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = quote FOR UPDATE;
  IF NOT FOUND OR q.status <> 'draft' OR q.expires_at <= now() THEN
    RAISE EXCEPTION 'Invalid quote' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO t FROM public.travel_estimates WHERE quote_id = quote;
  IF NOT FOUND OR t.source <> 'live' OR t.expires_at < q.expires_at
    OR t.expires_at <= now() OR t.departure_at <= now() OR q.professional_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.travel_tariff_versions WHERE id = t.tariff_id
      AND status = 'published' AND valid_from <= now()
      AND (valid_until IS NULL OR valid_until > t.appointment_at)) THEN
    RAISE EXCEPTION 'Live route and published tariff required' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_requests r
    JOIN public.addresses a ON a.id = r.address_id AND a.patient_id = r.patient_id
    WHERE r.id = q.request_id AND a.active
      AND a.latitude = t.destination_latitude AND a.longitude = t.destination_longitude) THEN
    RAISE EXCEPTION 'Route destination differs from patient address' USING ERRCODE = '23514';
  END IF;
  SELECT coalesce(sum(amount_cents) FILTER (WHERE kind = 'service'), 0),
    coalesce(sum(amount_cents) FILTER (WHERE kind = 'distance'), 0),
    coalesce(sum(amount_cents) FILTER (WHERE kind = 'traffic'), 0),
    coalesce(sum(amount_cents) FILTER (WHERE kind = 'tax'), 0)
  INTO service_total, distance_total, traffic_total, tax_total
  FROM public.quote_items WHERE quote_id = quote;
  IF (service_total, distance_total, traffic_total, tax_total) IS DISTINCT FROM
    (q.service_cents, q.distance_cents, q.traffic_cents, q.tax_cents)
    OR q.tax_policy_version <> policy.tax_policy_version
    OR q.tax_cents <> round((q.service_cents + q.distance_cents + q.traffic_cents)::numeric
      * policy.tax_basis_points / 10000)
    OR NOT EXISTS (SELECT 1 FROM public.quote_items WHERE quote_id = quote AND kind = 'service')
    OR EXISTS (SELECT 1 FROM public.quote_items i
      JOIN public.service_price_versions p ON p.id = i.service_price_version_id
      JOIN public.service_requests r ON r.id = q.request_id
      WHERE i.quote_id = quote AND i.kind = 'service' AND
        (p.status <> 'published' OR p.valid_from > now()
          OR p.valid_until <= t.appointment_at OR p.currency <> q.currency
          OR p.service_id <> r.requested_service_id OR i.unit_cents <> p.amount_cents)) THEN
    RAISE EXCEPTION 'Invalid price breakdown' USING ERRCODE = '23514';
  END IF;
  UPDATE public.quotes SET status = 'offered' WHERE id = quote;
  PERFORM private.log_event('quote_offered', 'quotes', quote);
END;
$$;
ALTER FUNCTION public.offer_quote(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.offer_quote(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.offer_quote(uuid) TO authenticated;

CREATE FUNCTION public.accept_quote(quote uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.quotes; patient uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = quote FOR UPDATE;
  SELECT patient_id INTO patient FROM public.service_requests WHERE id = q.request_id;
  IF q.id IS NULL OR NOT private.owns_patient(patient, 'manage_payments') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF q.status = 'accepted' THEN RETURN; END IF;
  IF q.status <> 'offered' OR q.expires_at <= now() THEN
    RAISE EXCEPTION 'Offer expired or unavailable' USING ERRCODE = '23514';
  END IF;
  UPDATE public.quotes SET status = 'accepted', accepted_at = now(),
    accepted_by = private.current_profile() WHERE id = quote;
  PERFORM private.log_event('quote_accepted', 'quotes', quote);
END;
$$;
ALTER FUNCTION public.accept_quote(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.accept_quote(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.accept_quote(uuid) TO authenticated;

CREATE FUNCTION private.professional_eligible(professional uuid, service uuid, at_time timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.professionals p
    JOIN public.profiles pr ON pr.id = p.profile_id
    WHERE p.id = professional AND p.active AND pr.active AND p.verification_status = 'verified'
      AND EXISTS (SELECT 1 FROM public.role_assignments r WHERE r.profile_id = pr.id
        AND r.role = 'therapist' AND r.revoked_at IS NULL))
    AND NOT EXISTS (SELECT 1 FROM public.service_requirements r WHERE r.service_id = service
      AND NOT EXISTS (SELECT 1 FROM public.professional_credentials c
        WHERE c.professional_id = professional AND c.competency_id = r.competency_id
          AND c.status = 'verified' AND c.issued_at <= (at_time AT TIME ZONE 'America/El_Salvador')::date
          AND (c.expires_at IS NULL OR c.expires_at >=
            (at_time AT TIME ZONE 'America/El_Salvador')::date)))
$$;
REVOKE ALL ON FUNCTION private.professional_eligible(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.professional_eligible(uuid, uuid, timestamptz) TO pulmocare_executor;
