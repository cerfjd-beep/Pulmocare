CREATE FUNCTION private.guard_history() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE previous jsonb := to_jsonb(OLD);
BEGIN
  IF TG_TABLE_NAME = 'clinical_intakes' AND previous->>'completed_at' IS NOT NULL THEN
    RAISE EXCEPTION 'Completed intake is immutable' USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'clinical_encounters' AND previous->>'status' = 'signed' THEN
    RAISE EXCEPTION 'Signed encounter is immutable' USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'clinical_protocol_versions' AND previous->>'status' <> 'draft' THEN
    RAISE EXCEPTION 'Approved protocol is immutable' USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'service_price_versions' AND previous->>'status' <> 'draft' THEN
    RAISE EXCEPTION 'Published price is immutable' USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'travel_tariff_versions' AND previous->>'status' <> 'draft' THEN
    RAISE EXCEPTION 'Published tariff is immutable' USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'business_quotes' AND previous->>'status' = 'accepted' THEN
    RAISE EXCEPTION 'Accepted business quote is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_history() FROM PUBLIC;

CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.clinical_intakes
FOR EACH ROW EXECUTE FUNCTION private.guard_history();
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.clinical_encounters
FOR EACH ROW EXECUTE FUNCTION private.guard_history();
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.clinical_protocol_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_history();
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.service_price_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_history();
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.travel_tariff_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_history();
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.business_quotes
FOR EACH ROW EXECUTE FUNCTION private.guard_history();

CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION private.immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.clinical_amendments
FOR EACH ROW EXECUTE FUNCTION private.immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.clinical_releases
FOR EACH ROW EXECUTE FUNCTION private.immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION private.immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION private.immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON public.follow_up_responses
FOR EACH ROW EXECUTE FUNCTION private.immutable();

CREATE FUNCTION private.guard_vital() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target uuid;
BEGIN
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD.encounter_id ELSE NEW.encounter_id END;
  -- Lock parent to serialize concurrent signing and measurement edits.
  PERFORM 1 FROM public.clinical_encounters WHERE id = target AND status = 'draft' FOR UPDATE;
  IF NOT FOUND OR (TG_OP = 'UPDATE' AND NEW.encounter_id <> OLD.encounter_id) THEN
    RAISE EXCEPTION 'Encounter is immutable or invalid' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_vital() FROM PUBLIC;
CREATE TRIGGER protect_signed BEFORE INSERT OR UPDATE OR DELETE ON public.vital_signs
FOR EACH ROW EXECUTE FUNCTION private.guard_vital();

CREATE FUNCTION private.guard_patient() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.birth_date > current_date THEN
    RAISE EXCEPTION 'Birth date cannot be in the future' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_patient() FROM PUBLIC;
CREATE TRIGGER validate_birth BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION private.guard_patient();

CREATE FUNCTION private.guard_quote() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Offered quote is immutable' USING ERRCODE = '23514';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['status','accepted_at','accepted_by','updated_at','updated_by'])
      IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['status','accepted_at','accepted_by','updated_at','updated_by'])
      OR OLD.status <> 'offered' OR NEW.status NOT IN ('accepted','expired','cancelled') THEN
      RAISE EXCEPTION 'Invalid quote change' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_quote() FROM PUBLIC;
CREATE TRIGGER protect_offer BEFORE UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION private.guard_quote();

CREATE FUNCTION private.guard_quote_child() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target uuid;
BEGIN
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD.quote_id ELSE NEW.quote_id END;
  PERFORM 1 FROM public.quotes WHERE id = target AND status = 'draft' FOR UPDATE;
  IF NOT FOUND OR (TG_OP = 'UPDATE' AND NEW.quote_id <> OLD.quote_id) THEN
    RAISE EXCEPTION 'Offered quote detail is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_quote_child() FROM PUBLIC;
CREATE TRIGGER protect_offer BEFORE INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION private.guard_quote_child();
CREATE TRIGGER protect_offer BEFORE INSERT OR UPDATE OR DELETE ON public.travel_estimates
FOR EACH ROW EXECUTE FUNCTION private.guard_quote_child();
