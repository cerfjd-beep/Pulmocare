-- Private evidence for professional authorization. Existing clinical documents stay inaccessible.
ALTER TABLE public.documents ADD COLUMN credential_kind text
 CHECK (credential_kind IS NULL OR (credential_kind IN ('degree','license')
   AND category='credential' AND mime_type IN ('image/jpeg','image/png')));
GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA public,private TO pulmocare_executor;
GRANT USAGE ON SCHEMA storage TO pulmocare_executor;
GRANT SELECT ON storage.objects TO pulmocare_executor;
CREATE POLICY executor_credential_objects ON storage.objects FOR SELECT TO pulmocare_executor
 USING (bucket_id='credentials');

CREATE FUNCTION public.reserve_provider_photo(photo_kind text, photo_mime text, photo_size bigint, photo_hash text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := private.current_profile(); professional uuid; path text;
BEGIN
 IF actor IS NULL OR photo_kind IS NULL OR photo_kind NOT IN ('degree','license')
  OR photo_mime IS NULL OR photo_mime NOT IN ('image/jpeg','image/png')
  OR photo_size IS NULL OR photo_size NOT BETWEEN 1 AND 3145728
  OR photo_hash IS NULL OR photo_hash !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'Invalid photo' USING ERRCODE='42501';
 END IF;
 SELECT id INTO professional FROM public.professionals
 WHERE profile_id=actor AND active AND verification_status='pending' FOR UPDATE;
 IF professional IS NULL THEN RAISE EXCEPTION 'Pending application required' USING ERRCODE='42501'; END IF;
 path := actor::text || '/' || gen_random_uuid()::text || CASE photo_mime WHEN 'image/png' THEN '.png' ELSE '.jpg' END;
 INSERT INTO public.documents(owner_profile_id,professional_id,category,bucket_id,object_path,
 mime_type,size_bytes,checksum_sha256,uploaded_at,credential_kind)
 VALUES(actor,professional,'credential','credentials',path,photo_mime,photo_size,photo_hash,now(),photo_kind);
 PERFORM private.log_event('provider_photo_reserved','professionals',professional);
 RETURN path;
END;
$$;

CREATE FUNCTION private.can_read_provider_photo(object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.documents d
 WHERE d.bucket_id='credentials' AND d.object_path=object_name
 AND d.credential_kind IS NOT NULL AND d.scan_status<>'rejected'
 AND (d.owner_profile_id=private.current_profile() OR private.has_role('access_admin')));
$$;
ALTER FUNCTION private.can_read_provider_photo(text) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION private.can_read_provider_photo(text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION private.can_read_provider_photo(text) TO authenticated;
CREATE POLICY credential_photo_read ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='credentials' AND private.can_read_provider_photo(name));

CREATE OR REPLACE FUNCTION private.can_upload_document(bucket text, object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.documents d
 WHERE d.bucket_id=bucket AND d.object_path=object_name AND d.scan_status='pending'
 AND d.owner_profile_id=private.current_profile()
 AND split_part(object_name,'/',1)=private.current_profile()::text
 AND ((d.category='prescription' AND private.owns_patient(d.patient_id,'request_service'))
 OR (d.category='credential' AND EXISTS(SELECT 1 FROM public.professionals p
   WHERE p.id=d.professional_id AND p.profile_id=private.current_profile() AND p.active
   AND (d.credential_kind IS NULL OR p.verification_status='pending')))
 OR (d.category='billing_support' AND private.has_role('billing_admin'))));
$$;

CREATE FUNCTION public.list_provider_photos(target uuid DEFAULT NULL)
RETURNS TABLE(id uuid, credential_kind text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF private.current_profile() IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF target IS NOT NULL AND NOT private.has_role('access_admin') THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT DISTINCT ON(d.credential_kind) d.id,d.credential_kind,d.created_at
 FROM public.documents d JOIN public.professionals p ON p.id=d.professional_id
 WHERE d.credential_kind IS NOT NULL AND d.scan_status<>'rejected'
 AND ((target IS NULL AND p.profile_id=private.current_profile()) OR p.id=target)
 AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=d.bucket_id AND o.name=d.object_path)
 ORDER BY d.credential_kind,d.created_at DESC,d.id;
END;
$$;

CREATE FUNCTION public.get_provider_photo(target uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE path text;
BEGIN
 SELECT object_path INTO path FROM public.documents WHERE id=target
 AND bucket_id='credentials' AND private.can_read_provider_photo(object_path);
 IF path IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM private.log_event('provider_photo_read','documents',target);
 RETURN path;
END;
$$;

-- Enforce evidence even when an administrator calls the RPC outside the website.
CREATE FUNCTION private.require_provider_photos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.verification_status='verified' AND OLD.verification_status<>'verified' AND
  (SELECT count(DISTINCT d.credential_kind) FROM public.documents d
   WHERE d.professional_id=NEW.id AND d.credential_kind IS NOT NULL AND d.scan_status<>'rejected'
   AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=d.bucket_id AND o.name=d.object_path)) <> 2 THEN
  RAISE EXCEPTION 'Upload degree and professional license before approval' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
ALTER FUNCTION private.require_provider_photos() OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION private.require_provider_photos() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER require_provider_photos BEFORE UPDATE OF verification_status ON public.professionals
FOR EACH ROW EXECUTE FUNCTION private.require_provider_photos();
ALTER FUNCTION public.reserve_provider_photo(text,text,bigint,text) OWNER TO pulmocare_executor;
ALTER FUNCTION public.list_provider_photos(uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION public.get_provider_photo(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.reserve_provider_photo(text,text,bigint,text),public.list_provider_photos(uuid),public.get_provider_photo(uuid)
 FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_provider_photo(text,text,bigint,text),public.list_provider_photos(uuid),public.get_provider_photo(uuid)
 TO authenticated;
REVOKE CREATE ON SCHEMA public,private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
NOTIFY pgrst,'reload schema';
