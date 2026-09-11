CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  requested_service_id uuid REFERENCES public.services(id),
  address_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft','submitted','in_review','approved','medical_review','referred','cancelled')),
  submitted_at timestamptz,
  payment_preference text,
  preferred_at timestamptz,
  UNIQUE (id, patient_id),
  FOREIGN KEY (address_id, patient_id) REFERENCES public.addresses(id, patient_id)
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_requests FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.clinical_protocol_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  code text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','retired')),
  approved_by uuid REFERENCES public.professionals(id),
  approved_at timestamptz,
  UNIQUE (code, version),
  CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
ALTER TABLE public.clinical_protocol_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinical_protocol_versions FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.clinical_protocol_versions
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.clinical_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  revision integer NOT NULL CHECK (revision > 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  prescription_declared boolean NOT NULL,
  symptoms jsonb NOT NULL CHECK (jsonb_typeof(symptoms) = 'object'),
  history jsonb NOT NULL CHECK (jsonb_typeof(history) = 'object'),
  questionnaire_version text NOT NULL,
  completed_at timestamptz,
  UNIQUE (request_id, revision),
  UNIQUE (id, request_id)
);
ALTER TABLE public.clinical_intakes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinical_intakes FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.clinical_intakes
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.request_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  purpose text NOT NULL CHECK (purpose IN ('review','treatment')),
  assigned_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);
ALTER TABLE public.request_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_assignments FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.request_assignments
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE UNIQUE INDEX active_assignment ON public.request_assignments
(request_id, professional_id, purpose) WHERE revoked_at IS NULL;
