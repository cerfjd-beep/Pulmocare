CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  intake_id uuid NOT NULL,
  protocol_id uuid NOT NULL REFERENCES public.clinical_protocol_versions(id),
  assessed_by uuid NOT NULL REFERENCES public.professionals(id),
  result text NOT NULL CHECK (result IN
    ('pending','eligible','medical_review','urgent_referral','insufficient_data')),
  rationale text NOT NULL CHECK (length(trim(rationale)) > 0),
  assessed_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  UNIQUE (id, request_id),
  FOREIGN KEY (intake_id, request_id) REFERENCES public.clinical_intakes(id, request_id),
  CHECK (valid_until IS NULL OR valid_until > assessed_at),
  CHECK (result <> 'eligible' OR valid_until IS NOT NULL)
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessments FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  document_id uuid NOT NULL,
  prescription_date date,
  diagnosis text,
  indicated_therapy text,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','accepted','rejected')),
  reviewed_by uuid REFERENCES public.professionals(id),
  reviewed_at timestamptz,
  review_note text,
  FOREIGN KEY (request_id, patient_id) REFERENCES public.service_requests(id, patient_id),
  FOREIGN KEY (document_id, patient_id) REFERENCES public.documents(id, patient_id),
  CHECK (review_status = 'pending' OR
    (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_note IS NOT NULL)),
  CHECK (review_status <> 'accepted' OR
    (prescription_date IS NOT NULL AND indicated_therapy IS NOT NULL))
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prescriptions FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION private.stamp();
