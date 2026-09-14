-- Run as postgres on an existing Pulmocare installation. No default prices are published.
BEGIN;
SELECT pg_advisory_xact_lock(11092026);
GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA public,private TO pulmocare_executor;
ALTER TABLE public.services ADD COLUMN billing_unit text NOT NULL DEFAULT 'session' CHECK(billing_unit IN ('session','phase'));
ALTER TABLE public.services ALTER COLUMN duration_minutes DROP NOT NULL;
ALTER TABLE public.service_price_versions ADD COLUMN scope text NOT NULL DEFAULT '';
INSERT INTO public.services(code,name,description,duration_minutes,billing_unit) VALUES
 ('rehab-assessment','Rehabilitación · evaluación y plan','Evaluación individual y definición de objetivos y plan de atención.',NULL,'phase'),
 ('rehab-active','Rehabilitación · intervención y reevaluación','Etapa adaptable a la evolución. La reevaluación determina continuidad, ajustes, pausa o alta.',NULL,'phase'),
 ('rehab-maintenance','Rehabilitación · consolidación y mantenimiento','Consolidación y seguimiento cuando estén indicados. No se activa automáticamente.',NULL,'phase');
CREATE TABLE private.nebulization_discount (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 percent numeric(5,2) NOT NULL CHECK(percent BETWEEN 0 AND 100),
 revision uuid NOT NULL DEFAULT gen_random_uuid(),
 updated_by uuid REFERENCES public.profiles(id), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.nebulization_discount(singleton,percent) VALUES(true,0);
REVOKE ALL ON private.nebulization_discount FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,UPDATE ON private.nebulization_discount TO pulmocare_executor;

-- Only validity may be closed. Prices already used by quotes retain their original amounts.
CREATE FUNCTION private.guard_price_version() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.status<>'draft' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published price is immutable' USING ERRCODE='23514'; END IF;
  IF OLD.valid_until IS NOT NULL OR NEW.valid_until IS DISTINCT FROM statement_timestamp()
   OR NEW.valid_until<=OLD.valid_from
   OR (to_jsonb(NEW)-ARRAY['valid_until','updated_at','updated_by']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['valid_until','updated_at','updated_by']) THEN
   RAISE EXCEPTION 'Published price is immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_price_version() FROM PUBLIC;
DROP TRIGGER history ON public.service_price_versions;
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.service_price_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_price_version();

CREATE FUNCTION public.list_service_prices() RETURNS TABLE(
 service_id uuid,code text,name text,billing_unit text,amount_cents bigint,price_id uuid,scope text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT (private.has_role('operations_admin') OR private.has_role('billing_admin')) THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT s.id,s.code,s.name,s.billing_unit,p.amount_cents,p.id,p.scope
 FROM public.services s LEFT JOIN public.service_price_versions p ON p.service_id=s.id AND p.status='published'
 AND p.valid_from<=now() AND (p.valid_until IS NULL OR p.valid_until>now()) WHERE s.active ORDER BY s.code;
END;
$$;
CREATE FUNCTION public.publish_service_price(target uuid,amount bigint,expected uuid DEFAULT NULL,price_scope text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=private.current_profile(); previous uuid; result uuid; unit text;
BEGIN
 IF NOT (private.has_role('operations_admin') OR private.has_role('billing_admin')) THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF amount IS NULL OR amount NOT BETWEEN 0 AND 100000000 OR price_scope IS NULL OR length(price_scope)>2000 THEN
  RAISE EXCEPTION 'Invalid price' USING ERRCODE='22023'; END IF;
 SELECT billing_unit INTO unit FROM public.services WHERE id=target AND active FOR UPDATE;
 IF unit IS NULL OR (unit='phase' AND length(trim(price_scope))<10) THEN
  RAISE EXCEPTION 'Define phase scope before publishing' USING ERRCODE='22023'; END IF;
 SELECT id INTO previous FROM public.service_price_versions WHERE service_id=target AND status='published'
 AND valid_from<=statement_timestamp() AND (valid_until IS NULL OR valid_until>statement_timestamp());
 IF previous IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Price changed; reload' USING ERRCODE='40001'; END IF;
 UPDATE public.service_price_versions SET valid_until=statement_timestamp() WHERE id=previous;
 INSERT INTO public.service_price_versions(service_id,amount_cents,currency,valid_from,approved_by,approved_at,status,scope)
 VALUES(target,amount,'USD',statement_timestamp(),actor,statement_timestamp(),'published',trim(price_scope)) RETURNING id INTO result;
 PERFORM private.log_event('service_price_published','service_price_versions',result);
 RETURN result;
END;
$$;
CREATE FUNCTION public.get_nebulization_discount() RETURNS TABLE(percent numeric,revision uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT percent,revision FROM private.nebulization_discount;
$$;
CREATE FUNCTION public.set_nebulization_discount(discount numeric,expected uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous uuid; next_revision uuid:=gen_random_uuid();
BEGIN
 IF NOT (private.has_role('operations_admin') OR private.has_role('billing_admin')) THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF discount IS NULL OR discount NOT BETWEEN 0 AND 100 OR discount<>round(discount,2) THEN
  RAISE EXCEPTION 'Invalid discount' USING ERRCODE='22023'; END IF;
 SELECT revision INTO previous FROM private.nebulization_discount FOR UPDATE;
 IF previous IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Discount changed; reload' USING ERRCODE='40001'; END IF;
 UPDATE private.nebulization_discount SET percent=discount,revision=next_revision,updated_by=private.current_profile(),updated_at=now();
 PERFORM private.log_event('nebulization_discount_changed','pricing',next_revision);
END;
$$;
CREATE FUNCTION public.get_service_offers() RETURNS TABLE(
 id uuid,code text,name text,description text,duration_minutes integer,billing_unit text,amount_cents bigint,scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT s.id,s.code,s.name,s.description,s.duration_minutes,s.billing_unit,p.amount_cents,p.scope
 FROM public.services s LEFT JOIN public.service_price_versions p ON p.service_id=s.id AND p.status='published'
 AND p.valid_from<=now() AND (p.valid_until IS NULL OR p.valid_until>now()) WHERE s.active
 UNION ALL
 SELECT s.id,'nebulization-7-days','Nebulizaciones · tratamiento de 7 días',
 '7 sesiones: una diaria durante 7 días, según indicación profesional. Traslados aparte.',NULL,'package',
 round(p.amount_cents::numeric*7*(100-d.percent)/100)::bigint,
 'Precio individual × 7. Descuento: '||d.percent::text||'%. No incluye traslados.'
 FROM public.services s CROSS JOIN private.nebulization_discount d
 LEFT JOIN public.service_price_versions p ON p.service_id=s.id AND p.status='published'
 AND p.valid_from<=now() AND (p.valid_until IS NULL OR p.valid_until>now())
 WHERE s.code='nebulization' AND s.active;
$$;
ALTER FUNCTION public.list_service_prices() OWNER TO pulmocare_executor;
ALTER FUNCTION public.publish_service_price(uuid,bigint,uuid,text) OWNER TO pulmocare_executor;
ALTER FUNCTION public.get_nebulization_discount() OWNER TO pulmocare_executor;
ALTER FUNCTION public.set_nebulization_discount(numeric,uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION public.get_service_offers() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.list_service_prices(),public.publish_service_price(uuid,bigint,uuid,text),
 public.get_nebulization_discount(),public.set_nebulization_discount(numeric,uuid),public.get_service_offers() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_service_prices(),public.publish_service_price(uuid,bigint,uuid,text),public.set_nebulization_discount(numeric,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nebulization_discount(),public.get_service_offers() TO anon,authenticated;
REVOKE CREATE ON SCHEMA public,private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
NOTIFY pgrst,'reload schema';

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[],name text);
REVOKE ALL ON SCHEMA supabase_migrations FROM PUBLIC,anon,authenticated;
REVOKE ALL ON supabase_migrations.schema_migrations FROM PUBLIC,anon,authenticated;
INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES('20260913000028','service_pricing',ARRAY[$source$GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA public,private TO pulmocare_executor;
ALTER TABLE public.services ADD COLUMN billing_unit text NOT NULL DEFAULT 'session' CHECK(billing_unit IN ('session','phase'));
ALTER TABLE public.services ALTER COLUMN duration_minutes DROP NOT NULL;
ALTER TABLE public.service_price_versions ADD COLUMN scope text NOT NULL DEFAULT '';
INSERT INTO public.services(code,name,description,duration_minutes,billing_unit) VALUES
 ('rehab-assessment','Rehabilitación · evaluación y plan','Evaluación individual y definición de objetivos y plan de atención.',NULL,'phase'),
 ('rehab-active','Rehabilitación · intervención y reevaluación','Etapa adaptable a la evolución. La reevaluación determina continuidad, ajustes, pausa o alta.',NULL,'phase'),
 ('rehab-maintenance','Rehabilitación · consolidación y mantenimiento','Consolidación y seguimiento cuando estén indicados. No se activa automáticamente.',NULL,'phase');
CREATE TABLE private.nebulization_discount (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 percent numeric(5,2) NOT NULL CHECK(percent BETWEEN 0 AND 100),
 revision uuid NOT NULL DEFAULT gen_random_uuid(),
 updated_by uuid REFERENCES public.profiles(id), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.nebulization_discount(singleton,percent) VALUES(true,0);
REVOKE ALL ON private.nebulization_discount FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,UPDATE ON private.nebulization_discount TO pulmocare_executor;

-- Only validity may be closed. Prices already used by quotes retain their original amounts.
CREATE FUNCTION private.guard_price_version() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.status<>'draft' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published price is immutable' USING ERRCODE='23514'; END IF;
  IF OLD.valid_until IS NOT NULL OR NEW.valid_until IS DISTINCT FROM statement_timestamp()
   OR NEW.valid_until<=OLD.valid_from
   OR (to_jsonb(NEW)-ARRAY['valid_until','updated_at','updated_by']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['valid_until','updated_at','updated_by']) THEN
   RAISE EXCEPTION 'Published price is immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_price_version() FROM PUBLIC;
DROP TRIGGER history ON public.service_price_versions;
CREATE TRIGGER history BEFORE UPDATE OR DELETE ON public.service_price_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_price_version();

CREATE FUNCTION public.list_service_prices() RETURNS TABLE(
 service_id uuid,code text,name text,billing_unit text,amount_cents bigint,price_id uuid,scope text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT (private.has_role('operations_admin') OR private.has_role('billing_admin')) THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT s.id,s.code,s.name,s.billing_unit,p.amount_cents,p.id,p.scope
 FROM public.services s LEFT JOIN public.service_price_versions p ON p.service_id=s.id AND p.status='published'
 AND p.valid_from<=now() AND (p.valid_until IS NULL OR p.valid_until>now()) WHERE s.active ORDER BY s.code;
END;
$$;
CREATE FUNCTION public.publish_service_price(target uuid,amount bigint,expected uuid DEFAULT NULL,price_scope text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=private.current_profile(); previous uuid; result uuid; unit text;
BEGIN
 IF NOT (private.has_role('operations_admin') OR private.has_role('billing_admin')) THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF amount IS NULL OR amount NOT BETWEEN 0 AND 100000000 OR price_scope IS NULL OR length(price_scope)>2000 THEN
  RAISE EXCEPTION 'Invalid price' USING ERRCODE='22023'; END IF;
 SELECT billing_unit INTO unit FROM public.services WHERE id=target AND active FOR UPDATE;
 IF unit IS NULL OR (unit='phase' AND length(trim(price_scope))<10) THEN
  RAISE EXCEPTION 'Define phase scope before publishing' USING ERRCODE='22023'; END IF;
 SELECT id INTO previous FROM public.service_price_versions WHERE service_id=target AND status='published'
 AND valid_from<=statement_timestamp() AND (valid_until IS NULL OR valid_until>statement_timestamp());
 IF previous IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Price changed; reload' USING ERRCODE='40001'; END IF;
 UPDATE public.service_price_versions SET valid_until=statement_timestamp() WHERE id=previous;
 INSERT INTO public.service_price_versions(service_id,amount_cents,currency,valid_from,approved_by,approved_at,status,scope)
 VALUES(target,amount,'USD',statement_timestamp(),actor,statement_timestamp(),'published',trim(price_scope)) RETURNING id INTO result;
 PERFORM private.log_event('service_price_published','service_price_versions',result);
 RETURN result;
END;
$$;
CREATE FUNCTION public.get_nebulization_discount() RETURNS TABLE(percent numeric,revision uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT percent,revision FROM private.nebulization_discount;
$$;
CREATE FUNCTION public.set_nebulization_discount(discount numeric,expected uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous uuid; next_revision uuid:=gen_random_uuid();
BEGIN
 IF NOT (private.has_role('operations_admin') OR private.has_role('billing_admin')) THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF discount IS NULL OR discount NOT BETWEEN 0 AND 100 OR discount<>round(discount,2) THEN
  RAISE EXCEPTION 'Invalid discount' USING ERRCODE='22023'; END IF;
 SELECT revision INTO previous FROM private.nebulization_discount FOR UPDATE;
 IF previous IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Discount changed; reload' USING ERRCODE='40001'; END IF;
 UPDATE private.nebulization_discount SET percent=discount,revision=next_revision,updated_by=private.current_profile(),updated_at=now();
 PERFORM private.log_event('nebulization_discount_changed','pricing',next_revision);
END;
$$;
CREATE FUNCTION public.get_service_offers() RETURNS TABLE(
 id uuid,code text,name text,description text,duration_minutes integer,billing_unit text,amount_cents bigint,scope text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT s.id,s.code,s.name,s.description,s.duration_minutes,s.billing_unit,p.amount_cents,p.scope
 FROM public.services s LEFT JOIN public.service_price_versions p ON p.service_id=s.id AND p.status='published'
 AND p.valid_from<=now() AND (p.valid_until IS NULL OR p.valid_until>now()) WHERE s.active
 UNION ALL
 SELECT s.id,'nebulization-7-days','Nebulizaciones · tratamiento de 7 días',
 '7 sesiones: una diaria durante 7 días, según indicación profesional. Traslados aparte.',NULL,'package',
 round(p.amount_cents::numeric*7*(100-d.percent)/100)::bigint,
 'Precio individual × 7. Descuento: '||d.percent::text||'%. No incluye traslados.'
 FROM public.services s CROSS JOIN private.nebulization_discount d
 LEFT JOIN public.service_price_versions p ON p.service_id=s.id AND p.status='published'
 AND p.valid_from<=now() AND (p.valid_until IS NULL OR p.valid_until>now())
 WHERE s.code='nebulization' AND s.active;
$$;
ALTER FUNCTION public.list_service_prices() OWNER TO pulmocare_executor;
ALTER FUNCTION public.publish_service_price(uuid,bigint,uuid,text) OWNER TO pulmocare_executor;
ALTER FUNCTION public.get_nebulization_discount() OWNER TO pulmocare_executor;
ALTER FUNCTION public.set_nebulization_discount(numeric,uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION public.get_service_offers() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.list_service_prices(),public.publish_service_price(uuid,bigint,uuid,text),
 public.get_nebulization_discount(),public.set_nebulization_discount(numeric,uuid),public.get_service_offers() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_service_prices(),public.publish_service_price(uuid,bigint,uuid,text),public.set_nebulization_discount(numeric,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nebulization_discount(),public.get_service_offers() TO anon,authenticated;
REVOKE CREATE ON SCHEMA public,private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
NOTIFY pgrst,'reload schema';
$source$]);
COMMIT;
SELECT 'Precios y descuentos habilitados' AS result;
