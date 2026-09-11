CREATE TABLE public.outbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(payload) = 'object'),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_until timestamptz,
  worker_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed')),
  last_error_code text,
  CHECK (status <> 'running' OR (locked_until IS NOT NULL AND worker_id IS NOT NULL))
);
ALTER TABLE public.outbox_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outbox_jobs FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.outbox_jobs
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  job_id uuid NOT NULL REFERENCES public.outbox_jobs(id),
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
  template_version text NOT NULL,
  provider_reference text,
  status text NOT NULL CHECK (status IN ('pending','sent','delivered','failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  UNIQUE (job_id, channel, recipient_profile_id)
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  actor_profile_id uuid REFERENCES public.profiles(id),
  system_actor text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  reason text,
  changed_fields text[],
  CHECK (num_nonnulls(actor_profile_id, system_actor) = 1)
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_events FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.follow_up_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id),
  revision integer NOT NULL CHECK (revision > 0),
  answered_by uuid NOT NULL REFERENCES public.profiles(id),
  answered_at timestamptz NOT NULL DEFAULT now(),
  improvement text NOT NULL,
  persistent_symptoms boolean NOT NULL,
  wants_new_visit boolean NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  UNIQUE (follow_up_id, revision)
);
ALTER TABLE public.follow_up_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.follow_up_responses FROM PUBLIC, anon, authenticated, service_role;
