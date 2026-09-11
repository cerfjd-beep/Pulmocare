CREATE TABLE public.clinical_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id),
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  procedure_text text NOT NULL,
  evolution_text text NOT NULL,
  recommendations_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed')),
  signed_at timestamptz,
  CHECK (completed_at IS NULL OR completed_at >= started_at),
  CHECK (status <> 'signed' OR (signed_at IS NOT NULL AND completed_at IS NOT NULL))
);
ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinical_encounters FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.clinical_encounters
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters(id),
  measured_at timestamptz NOT NULL,
  kind text NOT NULL,
  value numeric NOT NULL CHECK (value >= 0 AND value < 'Infinity'),
  unit text NOT NULL,
  context jsonb CHECK (jsonb_typeof(context) = 'object'),
  CHECK ((kind IN ('systolic_bp','diastolic_bp') AND unit = 'mmHg')
    OR (kind = 'heart_rate' AND unit = 'beats/min')
    OR (kind = 'respiratory_rate' AND unit = 'breaths/min')
    OR (kind = 'temperature' AND unit = 'C')
    OR (kind = 'spo2' AND unit = '%' AND value <= 100))
);
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vital_signs FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.vital_signs
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.clinical_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters(id),
  author_id uuid NOT NULL REFERENCES public.professionals(id),
  target_field text NOT NULL,
  vital_sign_id uuid REFERENCES public.vital_signs(id),
  correction_text text NOT NULL CHECK (length(trim(correction_text)) > 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  signed_at timestamptz NOT NULL
);
ALTER TABLE public.clinical_amendments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinical_amendments FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.clinical_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters(id),
  released_by uuid NOT NULL REFERENCES public.professionals(id),
  released_at timestamptz NOT NULL,
  content_snapshot jsonb NOT NULL CHECK (jsonb_typeof(content_snapshot) = 'object'),
  version integer NOT NULL CHECK (version > 0),
  UNIQUE (encounter_id, version)
);
ALTER TABLE public.clinical_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinical_releases FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters(id),
  due_at timestamptz NOT NULL,
  answered_at timestamptz,
  improvement text,
  persistent_symptoms boolean,
  wants_new_visit boolean,
  answers jsonb CHECK (jsonb_typeof(answers) = 'object'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','answered','review_required','closed')),
  assigned_to uuid REFERENCES public.professionals(id),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.professionals(id),
  UNIQUE (encounter_id, due_at),
  CHECK (status <> 'closed' OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.follow_ups FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.follow_ups
FOR EACH ROW EXECUTE FUNCTION private.stamp();
