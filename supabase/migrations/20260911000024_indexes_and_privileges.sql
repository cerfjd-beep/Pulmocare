CREATE INDEX patient_requests ON public.service_requests(patient_id, created_at DESC, id DESC);
CREATE INDEX operations_requests ON public.service_requests(status, created_at, id);
CREATE INDEX professional_assignments ON public.request_assignments(professional_id, request_id)
WHERE revoked_at IS NULL;
CREATE INDEX professional_agenda ON public.appointments(professional_id, starts_at);
CREATE INDEX encounter_measurements ON public.vital_signs(encounter_id, measured_at);
CREATE INDEX pending_followups ON public.follow_ups(status, due_at);
CREATE INDEX pending_jobs ON public.outbox_jobs(status, available_at);
CREATE INDEX entity_audit ON public.audit_events(entity_type, entity_id, occurred_at);

-- Only migration-time identifiers from PostgreSQL's catalog; no client text is interpolated.
-- Skip any FK whose leading columns are already covered by an existing index.
DO $$
DECLARE fk record;
BEGIN
  FOR fk IN
    SELECT c.conrelid, c.conname, c.conkey, t.relname,
      string_agg(quote_ident(a.attname), ', ' ORDER BY keys.ordinality) AS columns
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY keys(attnum, ordinality)
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = keys.attnum
    WHERE n.nspname = 'public' AND c.contype = 'f'
      AND EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = t.oid AND polname = 'executor')
    GROUP BY c.conrelid, c.conname, c.conkey, t.relname
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = fk.conrelid
      AND i.indisvalid AND i.indpred IS NULL
      AND ARRAY(SELECT unnest((i.indkey::smallint[])[0:cardinality(fk.conkey)-1])) = fk.conkey) THEN
      EXECUTE format('CREATE INDEX %I ON public.%I (%s)',
        'fk_' || left(fk.relname, 25) || '_' || substr(md5(fk.conname), 1, 8),
        fk.relname, fk.columns);
    END IF;
  END LOOP;
END;
$$;

-- Functions retain their table-specific RLS policy but cannot create new objects or login.
REVOKE CREATE ON SCHEMA public, private FROM pulmocare_executor;
REVOKE pulmocare_executor FROM postgres;
