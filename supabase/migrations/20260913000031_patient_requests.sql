GRANT pulmocare_executor TO postgres;
GRANT CREATE ON SCHEMA public, private TO pulmocare_executor;
ALTER TABLE public.service_requests ADD COLUMN submission_key uuid;
ALTER TABLE public.service_requests ADD COLUMN submission_details jsonb;
CREATE UNIQUE INDEX request_submission_key ON public.service_requests(requested_by, submission_key);

CREATE FUNCTION public.prepare_patient_request(payload jsonb, retry_key uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := private.current_profile(); patient uuid; request uuid; address uuid;
  service uuid; offer record; doc uuid; path text; existing public.service_requests;
  preferred timestamptz; born date; symptom_answer jsonb; history_answer jsonb;
BEGIN
  IF actor IS NULL OR NOT private.has_role('patient') THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT id INTO patient FROM public.patients WHERE profile_id=actor AND active;
  IF patient IS NULL OR retry_key IS NULL OR payload IS NULL OR jsonb_typeof(payload)<>'object'
    OR octet_length(payload::text)>20000 THEN RAISE EXCEPTION 'Invalid submission' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || retry_key::text,0));
  SELECT * INTO existing FROM public.service_requests WHERE requested_by=actor AND submission_key=retry_key;
  IF FOUND THEN
    IF existing.submission_details->'input' IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Submission changed' USING ERRCODE='40001'; END IF;
    RETURN jsonb_build_object('id',existing.id,'path',existing.submission_details->>'prescriptionPath','submitted',existing.status<>'draft');
  END IF;
  IF coalesce(payload->>'alarm','')<>'No' OR coalesce(payload->>'prescription','') NOT IN ('Sí','No')
    OR coalesce(payload->>'reason','') NOT IN ('Dificultad respiratoria','Exceso de secreciones','Uso de oxígeno','Asma','EPOC','Neumonía','Postoperatorio','Traqueostomía','Ventilación mecánica','Otro')
    OR coalesce(payload->'symptoms','[]'::jsonb) ? 'Dolor torácico'
    OR coalesce(payload->>'consent','')<>'true'
    OR length(trim(coalesce(payload->>'patient',''))) NOT BETWEEN 1 AND 100
    OR coalesce(payload->>'phone','') !~ '^\+[1-9][0-9]{7,14}$'
    OR length(trim(coalesce(payload->>'address',''))) NOT BETWEEN 1 AND 200
    OR length(trim(coalesce(payload->>'municipality',''))) NOT BETWEEN 1 AND 100
    OR length(trim(coalesce(payload->>'department',''))) NOT BETWEEN 1 AND 100
    OR length(coalesce(payload->>'reference',''))>200
    OR coalesce(payload->>'payment','') NOT IN ('Efectivo','Pago contra entrega','Tarjeta de crédito','Tarjeta de débito','Transferencia bancaria','Pago empresarial')
    THEN RAISE EXCEPTION 'Incomplete or unsafe request' USING ERRCODE='22023'; END IF;
  born := nullif(payload->>'birthDate','')::date;
  preferred := nullif(payload->>'slot','')::timestamptz;
  IF born IS NULL OR born>current_date OR born<current_date-interval '120 years'
    OR preferred IS NULL OR preferred<=now() OR preferred>now()+interval '180 days' THEN
    RAISE EXCEPTION 'Invalid dates' USING ERRCODE='22023'; END IF;
  symptom_answer := jsonb_build_object('state',CASE WHEN coalesce((payload->>'noSymptoms')::boolean,false) THEN 'none' ELSE 'selected' END,'items',payload->'symptoms');
  history_answer := jsonb_build_object('state',CASE WHEN coalesce((payload->>'noHistory')::boolean,false) THEN 'none' ELSE 'selected' END,'items',payload->'history');
  IF NOT private.valid_answer(symptom_answer) OR NOT private.valid_answer(history_answer) THEN RAISE EXCEPTION 'Incomplete answers' USING ERRCODE='22023'; END IF;
  SELECT * INTO offer FROM public.get_service_offers() WHERE code=payload->>'serviceId';
  IF NOT FOUND THEN RAISE EXCEPTION 'Service unavailable' USING ERRCODE='22023'; END IF;
  service := offer.id;
  UPDATE public.patients SET full_name=trim(payload->>'patient'), phone=payload->>'phone', birth_date=born WHERE id=patient;
  INSERT INTO public.addresses(patient_id,department_code,municipality_code,address_line,reference_notes)
    VALUES(patient,payload->>'department',payload->>'municipality',payload->>'address',payload->>'reference') RETURNING id INTO address;
  INSERT INTO public.service_requests(patient_id,requested_by,requested_service_id,address_id,payment_preference,preferred_at,submission_key)
    VALUES(patient,actor,service,address,payload->>'payment',preferred,retry_key) RETURNING id INTO request;
  INSERT INTO public.consents(patient_id,granted_by,purpose,policy_version,evidence_ref)
    VALUES(patient,actor,'service_request','patient-request-v1',request::text);
  INSERT INTO public.clinical_intakes(request_id,revision,reason,prescription_declared,symptoms,history,questionnaire_version,completed_at)
    VALUES(request,1,payload->>'reason',payload->>'prescription'='Sí',symptom_answer,history_answer,'intake-v1',now());
  IF payload->>'prescription'='Sí' THEN
    IF coalesce(payload->'file'->>'mime','') NOT IN ('application/pdf','image/jpeg','image/png')
      OR coalesce((payload->'file'->>'size')::bigint,0) NOT BETWEEN 1 AND 5242880
      OR coalesce(payload->'file'->>'hash','') !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'Invalid prescription' USING ERRCODE='22023'; END IF;
    path := actor::text || '/' || gen_random_uuid()::text || CASE payload->'file'->>'mime' WHEN 'image/png' THEN '.png' WHEN 'image/jpeg' THEN '.jpg' ELSE '.pdf' END;
    INSERT INTO public.documents(owner_profile_id,patient_id,category,bucket_id,object_path,mime_type,size_bytes,checksum_sha256,uploaded_at)
      VALUES(actor,patient,'prescription','prescriptions',path,payload->'file'->>'mime',(payload->'file'->>'size')::bigint,payload->'file'->>'hash',now()) RETURNING id INTO doc;
    INSERT INTO public.prescriptions(request_id,patient_id,document_id) VALUES(request,patient,doc);
  END IF;
  UPDATE public.service_requests SET submission_details=jsonb_build_object('input',payload,'serviceName',offer.name,'serviceCode',offer.code,
    'serviceCents',offer.amount_cents,'serviceScope',offer.scope,'prescriptionPath',path) WHERE id=request;
  RETURN jsonb_build_object('id',request,'path',path,'submitted',false);
END;
$$;

CREATE FUNCTION public.finish_patient_request(target uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.service_requests;
BEGIN
  SELECT * INTO r FROM public.service_requests WHERE id=target FOR UPDATE;
  IF NOT FOUND OR r.requested_by IS DISTINCT FROM private.current_profile() THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF r.status<>'draft' THEN RETURN r.id; END IF;
  IF r.submission_details IS NULL THEN RAISE EXCEPTION 'Invalid submission' USING ERRCODE='22023'; END IF;
  IF r.submission_details->>'prescriptionPath' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id='prescriptions' AND name=r.submission_details->>'prescriptionPath'
  ) THEN RAISE EXCEPTION 'Prescription upload required' USING ERRCODE='23514'; END IF;
  PERFORM public.submit_request(target);
  RETURN target;
END;
$$;
GRANT USAGE ON SCHEMA storage TO pulmocare_executor;
GRANT SELECT ON storage.objects TO pulmocare_executor;
CREATE POLICY executor_prescription_objects ON storage.objects FOR SELECT TO pulmocare_executor USING(bucket_id='prescriptions');

CREATE FUNCTION public.list_portal_requests(page_number integer DEFAULT 0) RETURNS TABLE(id uuid,patient_id uuid,patient_name text,service_name text,status text,preferred_at timestamptz,submitted_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF private.current_profile() IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT r.id,r.patient_id,p.full_name,coalesce(r.submission_details->>'serviceName',s.name),r.status,r.preferred_at,r.submitted_at
    FROM public.service_requests r JOIN public.patients p ON p.id=r.patient_id LEFT JOIN public.services s ON s.id=r.requested_service_id
    WHERE r.status<>'draft' AND (private.has_role('operations_admin') OR private.owns_patient(r.patient_id,'request_service'))
    ORDER BY r.submitted_at DESC,r.id DESC LIMIT 50 OFFSET greatest(0,least(coalesce(page_number,0),10000))*50;
END;
$$;

CREATE FUNCTION public.read_patient_submission(target uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.service_requests; result jsonb;
BEGIN
  SELECT * INTO r FROM public.service_requests WHERE id=target;
  IF NOT FOUND OR NOT (private.has_role('operations_admin') OR private.owns_patient(r.patient_id,'request_service')
    OR private.assigned(target,'review') OR private.assigned(target,'treatment')) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('id',r.id,'status',r.status,'submittedAt',r.submitted_at,'preferredAt',r.preferred_at,'patientId',r.patient_id,
    'patientName',p.full_name,'phone',p.phone,'birthDate',p.birth_date,'details',r.submission_details - 'prescriptionPath',
    'prescriptionId',(SELECT pr.document_id FROM public.prescriptions pr WHERE pr.request_id=target LIMIT 1)) INTO result
    FROM public.patients p WHERE p.id=r.patient_id;
  PERFORM private.log_event('patient_submission_read','service_requests',target);
  RETURN result;
END;
$$;

CREATE FUNCTION private.can_read_submission_file(object_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.documents d JOIN public.prescriptions p ON p.document_id=d.id
    WHERE d.bucket_id='prescriptions' AND d.object_path=object_name AND d.scan_status<>'rejected'
    AND (private.has_role('operations_admin') OR private.owns_patient(p.patient_id,'request_service')
      OR private.assigned(p.request_id,'review') OR private.assigned(p.request_id,'treatment')));
$$;
CREATE FUNCTION public.get_submission_file(target uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE path text;
BEGIN
  SELECT object_path INTO path FROM public.documents WHERE id=target AND category='prescription';
  IF path IS NULL OR NOT private.can_read_submission_file(path) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  PERFORM private.log_event('patient_prescription_read','documents',target);
  RETURN path;
END;
$$;
CREATE POLICY patient_submission_download ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='prescriptions' AND private.can_read_submission_file(name));

CREATE FUNCTION public.read_provider_profile(target uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF private.current_profile() IS NULL OR (target IS NOT NULL AND NOT private.has_role('access_admin')) THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('id',p.id,'name',p.display_name,'specialty',p.specialty,'registration',p.registration_ref,
    'status',p.verification_status,'active',p.active,'createdAt',p.created_at,
    'assignments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'purpose',a.purpose))
      FROM public.request_assignments a JOIN public.service_requests r ON r.id=a.request_id
      WHERE a.professional_id=p.id AND a.revoked_at IS NULL),'[]'::jsonb)) INTO result
    FROM public.professionals p WHERE (target IS NOT NULL AND p.id=target) OR (target IS NULL AND p.profile_id=private.current_profile());
  IF result IS NULL THEN RAISE EXCEPTION 'Not found' USING ERRCODE='22023'; END IF;
  PERFORM private.log_event('provider_profile_read','professionals',(result->>'id')::uuid);
  RETURN result;
END;
$$;

ALTER FUNCTION public.prepare_patient_request(jsonb,uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION public.finish_patient_request(uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION public.list_portal_requests(integer) OWNER TO pulmocare_executor;
ALTER FUNCTION public.read_patient_submission(uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION private.can_read_submission_file(text) OWNER TO pulmocare_executor;
ALTER FUNCTION public.get_submission_file(uuid) OWNER TO pulmocare_executor;
ALTER FUNCTION public.read_provider_profile(uuid) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.prepare_patient_request(jsonb,uuid),public.finish_patient_request(uuid),public.list_portal_requests(integer),
  public.read_patient_submission(uuid),private.can_read_submission_file(text),public.get_submission_file(uuid),public.read_provider_profile(uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_patient_request(jsonb,uuid),public.finish_patient_request(uuid),public.list_portal_requests(integer),
  public.read_patient_submission(uuid),private.can_read_submission_file(text),public.get_submission_file(uuid),public.read_provider_profile(uuid) TO authenticated;
REVOKE CREATE ON SCHEMA public,private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
NOTIFY pgrst,'reload schema';
