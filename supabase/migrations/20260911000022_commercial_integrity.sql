CREATE FUNCTION private.travel_cost(distance numeric, baseline numeric, duration numeric, rules jsonb)
RETURNS TABLE(distance_cents bigint, traffic_cents bigint)
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE band jsonb; upper_bound numeric; previous_bound numeric := -1;
  rate numeric; cap bigint; chosen bigint; band_cents bigint;
BEGIN
  IF rules->>'algorithm' IS DISTINCT FROM 'distance-traffic-v1'
    OR rules->>'currency' IS DISTINCT FROM 'USD'
    OR jsonb_typeof(rules->'bands') IS DISTINCT FROM 'array'
    OR distance IS NULL OR baseline IS NULL OR duration IS NULL
    OR distance < 0 OR baseline < 0 OR duration < 0
    OR distance >= 'Infinity' OR baseline >= 'Infinity' OR duration >= 'Infinity' THEN
    RAISE EXCEPTION 'Invalid tariff or metrics' USING ERRCODE = '23514';
  END IF;
  rate := (rules->>'traffic_cents_per_minute')::numeric;
  cap := (rules->>'max_traffic_cents')::bigint;
  IF rate IS NULL OR rate < 0 OR rate >= 'Infinity' OR cap IS NULL OR cap < 0 THEN
    RAISE EXCEPTION 'Invalid traffic tariff' USING ERRCODE = '23514';
  END IF;
  FOR band IN SELECT value FROM jsonb_array_elements(rules->'bands') LOOP
    upper_bound := (band->>'through_meters')::numeric;
    band_cents := (band->>'cents')::bigint;
    IF upper_bound IS NULL OR upper_bound <= previous_bound OR upper_bound < 0
      OR upper_bound >= 'Infinity' OR band_cents IS NULL OR band_cents < 0 THEN
      RAISE EXCEPTION 'Invalid distance bands' USING ERRCODE = '23514';
    END IF;
    IF chosen IS NULL AND distance <= upper_bound THEN chosen := band_cents; END IF;
    previous_bound := upper_bound;
  END LOOP;
  IF (rules->>'coverage_meters')::numeric IS DISTINCT FROM previous_bound THEN
    RAISE EXCEPTION 'Coverage must match the final band' USING ERRCODE = '23514';
  END IF;
  IF chosen IS NULL THEN RAISE EXCEPTION 'Outside tariff coverage' USING ERRCODE = '23514'; END IF;
  RETURN QUERY SELECT chosen, least(cap, round(greatest(0, duration - baseline) * rate / 60)::bigint);
END;
$$;
REVOKE ALL ON FUNCTION private.travel_cost(numeric, numeric, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.travel_cost(numeric, numeric, numeric, jsonb) TO pulmocare_executor;

CREATE FUNCTION private.validate_tariff() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM * FROM private.travel_cost(0, 0, 0, NEW.rules);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_tariff() FROM PUBLIC;
CREATE TRIGGER tariff_schema BEFORE INSERT OR UPDATE ON public.travel_tariff_versions
FOR EACH ROW EXECUTE FUNCTION private.validate_tariff();

CREATE FUNCTION private.check_offered_quote() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q public.quotes; t public.travel_estimates; rules jsonb; dc bigint; tc bigint;
  sc bigint; actual_dc bigint; actual_tc bigint; tax bigint;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = NEW.id;
  IF q.status NOT IN ('offered','accepted') THEN RETURN NULL; END IF;
  SELECT * INTO t FROM public.travel_estimates WHERE quote_id = q.id;
  SELECT v.rules INTO rules FROM public.travel_tariff_versions v
  WHERE v.id = t.tariff_id AND v.status = 'published';
  IF t.id IS NULL OR t.source <> 'live' OR rules IS NULL THEN
    RAISE EXCEPTION 'Live priced route required' USING ERRCODE = '23514';
  END IF;
  SELECT distance_cents, traffic_cents INTO dc, tc
  FROM private.travel_cost(t.distance_meters, t.baseline_seconds, t.duration_seconds, rules);
  SELECT coalesce(sum(amount_cents) FILTER (WHERE kind = 'service'), 0),
    coalesce(sum(amount_cents) FILTER (WHERE kind = 'distance'), 0),
    coalesce(sum(amount_cents) FILTER (WHERE kind = 'traffic'), 0),
    coalesce(sum(amount_cents) FILTER (WHERE kind = 'tax'), 0)
  INTO sc, actual_dc, actual_tc, tax FROM public.quote_items WHERE quote_id = q.id;
  IF (q.service_cents, q.distance_cents, q.traffic_cents, q.tax_cents)
    IS DISTINCT FROM (sc, actual_dc, actual_tc, tax)
    OR (dc, tc) IS DISTINCT FROM (q.distance_cents, q.traffic_cents) THEN
    RAISE EXCEPTION 'Quote total or tariff mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.check_offered_quote() FROM PUBLIC;
ALTER FUNCTION private.check_offered_quote() OWNER TO pulmocare_executor;
CREATE CONSTRAINT TRIGGER validate_offer AFTER INSERT OR UPDATE ON public.quotes
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.check_offered_quote();

CREATE FUNCTION private.check_sale() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - ARRAY['status','updated_at','updated_by'])
    IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','updated_at','updated_by']) THEN
    RAISE EXCEPTION 'Sale amounts and references are immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.quote_id IS NOT NULL THEN
    PERFORM 1 FROM public.quotes q WHERE q.id = NEW.quote_id AND q.status = 'accepted'
      AND q.total_cents = NEW.total_cents AND q.currency = NEW.currency;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sale does not match accepted quote' USING ERRCODE = '23514'; END IF;
    IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.appointments WHERE id = NEW.appointment_id AND quote_id = NEW.quote_id
    ) THEN RAISE EXCEPTION 'Sale appointment mismatch' USING ERRCODE = '23514'; END IF;
  ELSE
    PERFORM 1 FROM public.business_quotes WHERE id = NEW.business_quote_id AND status = 'accepted'
      AND offered_amount_cents = NEW.total_cents AND currency = NEW.currency
      AND company_id = NEW.company_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Business sale mismatch' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.check_sale() FROM PUBLIC;
CREATE TRIGGER sale_integrity BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION private.check_sale();

CREATE FUNCTION private.check_encounter_relation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target public.clinical_encounters;
BEGIN
  IF TG_TABLE_NAME = 'clinical_encounters' THEN
    PERFORM 1 FROM public.appointments WHERE id = NEW.appointment_id
      AND professional_id = NEW.professional_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Encounter professional mismatch' USING ERRCODE = '23514'; END IF;
  ELSE
    SELECT * INTO target FROM public.clinical_encounters WHERE id = NEW.encounter_id FOR UPDATE;
    IF target.status <> 'signed' THEN
      RAISE EXCEPTION 'Signed encounter required' USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'clinical_amendments' THEN
      IF NEW.vital_sign_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.vital_signs WHERE id = NEW.vital_sign_id AND encounter_id = NEW.encounter_id
      ) THEN RAISE EXCEPTION 'Amendment measurement mismatch' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.check_encounter_relation() FROM PUBLIC;
CREATE TRIGGER relation BEFORE INSERT OR UPDATE ON public.clinical_encounters
FOR EACH ROW EXECUTE FUNCTION private.check_encounter_relation();
CREATE TRIGGER relation BEFORE INSERT ON public.clinical_amendments
FOR EACH ROW EXECUTE FUNCTION private.check_encounter_relation();
CREATE TRIGGER relation BEFORE INSERT ON public.clinical_releases
FOR EACH ROW EXECUTE FUNCTION private.check_encounter_relation();
