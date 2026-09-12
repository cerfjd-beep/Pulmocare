-- Three user-facing portals; permissions remain granular and database-controlled.
GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA public TO pulmocare_executor;

CREATE FUNCTION public.get_my_access() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT jsonb_build_object('profile_id', p.id, 'name', p.display_name, 'active', p.active,
   'roles', coalesce((SELECT jsonb_agg(r.role) FROM public.role_assignments r
     WHERE r.profile_id=p.id AND r.revoked_at IS NULL AND p.active), '[]'::jsonb),
   'professional_status', (SELECT CASE WHEN pr.active THEN pr.verification_status ELSE 'suspended' END
     FROM public.professionals pr WHERE pr.profile_id=p.id))
 FROM public.profiles p WHERE p.auth_user_id=auth.uid();
$$;

CREATE FUNCTION public.register_provider(full_name text, specialty text, registration_ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; professional uuid;
BEGIN
 IF auth.uid() IS NULL OR full_name IS NULL OR length(trim(full_name)) NOT BETWEEN 1 AND 200
   OR specialty IS NULL OR length(trim(specialty)) NOT BETWEEN 1 AND 200
   OR registration_ref IS NULL OR length(trim(registration_ref)) NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION 'Invalid registration' USING ERRCODE='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 SELECT id INTO actor FROM public.profiles WHERE auth_user_id=auth.uid() AND active;
 IF actor IS NULL THEN
   IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id=auth.uid()) THEN
     RAISE EXCEPTION 'Inactive identity' USING ERRCODE='42501';
   END IF;
   INSERT INTO public.profiles(auth_user_id,display_name) VALUES(auth.uid(),trim(full_name)) RETURNING id INTO actor;
 END IF;
 SELECT id INTO professional FROM public.professionals WHERE profile_id=actor;
 IF professional IS NULL THEN
   INSERT INTO public.professionals(profile_id,display_name,specialty,registration_ref)
     VALUES(actor,trim(full_name),trim(specialty),trim(registration_ref)) RETURNING id INTO professional;
   PERFORM private.log_event('provider_registered','professionals',professional);
 END IF;
 -- Registration NEVER grants a clinical role or reactivates a revoked account.
 RETURN professional;
END;
$$;

CREATE FUNCTION public.list_provider_registrations() RETURNS TABLE
 (id uuid, display_name text, specialty text, registration_ref text, verification_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM private.require_role('access_admin');
 RETURN QUERY SELECT p.id,p.display_name,p.specialty,p.registration_ref,p.verification_status
   FROM public.professionals p WHERE p.active ORDER BY p.created_at DESC LIMIT 100;
END;
$$;

CREATE FUNCTION public.review_provider(target uuid, approve boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; target_profile uuid;
BEGIN
 actor := private.require_role('access_admin');
 IF approve IS NULL THEN RAISE EXCEPTION 'Decision required' USING ERRCODE='22023'; END IF;
 SELECT p.profile_id INTO target_profile FROM public.professionals p
 JOIN public.profiles u ON u.id=p.profile_id AND u.active WHERE p.id=target AND p.active FOR UPDATE OF p;
 IF target_profile IS NULL OR target_profile=actor THEN
   RAISE EXCEPTION 'Invalid target' USING ERRCODE='42501';
 END IF;
 UPDATE public.professionals SET verification_status=CASE WHEN approve THEN 'verified' ELSE 'suspended' END WHERE id=target;
 IF approve THEN PERFORM public.grant_role(target_profile,'therapist'); END IF;
 PERFORM private.log_event(CASE WHEN approve THEN 'provider_verified' ELSE 'provider_suspended' END,'professionals',target);
END;
$$;

CREATE FUNCTION public.list_my_assignments() RETURNS TABLE(id uuid, status text, purpose text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT r.id,r.status,a.purpose FROM public.request_assignments a
 JOIN public.service_requests r ON r.id=a.request_id
 WHERE a.revoked_at IS NULL AND a.professional_id=private.professional_for_role(
   CASE WHEN a.purpose='review' THEN 'clinical_reviewer' ELSE 'therapist' END)
 ORDER BY a.assigned_at DESC LIMIT 100;
$$;

ALTER FUNCTION public.get_my_access() OWNER TO pulmocare_executor;
ALTER FUNCTION public.register_provider(text,text,text) OWNER TO pulmocare_executor;
ALTER FUNCTION public.list_provider_registrations() OWNER TO pulmocare_executor;
ALTER FUNCTION public.review_provider(uuid,boolean) OWNER TO pulmocare_executor;
ALTER FUNCTION public.list_my_assignments() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.get_my_access(), public.register_provider(text,text,text),
 public.list_provider_registrations(), public.review_provider(uuid,boolean), public.list_my_assignments()
 FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_access(), public.register_provider(text,text,text),
 public.list_provider_registrations(), public.review_provider(uuid,boolean), public.list_my_assignments()
 TO authenticated;
REVOKE CREATE ON SCHEMA public FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
