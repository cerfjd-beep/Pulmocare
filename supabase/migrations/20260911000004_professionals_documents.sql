CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id),
  display_name text NOT NULL,
  specialty text NOT NULL,
  registration_ref text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','suspended')),
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professionals FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.professionals
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  patient_id uuid REFERENCES public.patients(id),
  professional_id uuid REFERENCES public.professionals(id),
  category text NOT NULL CHECK (category IN
    ('prescription','credential','clinical_attachment','billing_support')),
  bucket_id text NOT NULL,
  object_path text NOT NULL CHECK (object_path ~
    '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg)$'),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/png','image/jpeg')),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','clean','rejected')),
  uploaded_at timestamptz NOT NULL,
  UNIQUE (bucket_id, object_path),
  UNIQUE (id, patient_id),
  CHECK (category <> 'prescription' OR patient_id IS NOT NULL),
  CHECK (category <> 'clinical_attachment' OR patient_id IS NOT NULL),
  CHECK (category <> 'credential' OR professional_id IS NOT NULL),
  CHECK (bucket_id = CASE category
    WHEN 'prescription' THEN 'prescriptions'
    WHEN 'credential' THEN 'credentials'
    WHEN 'clinical_attachment' THEN 'clinical-attachments'
    WHEN 'billing_support' THEN 'billing-support' END)
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documents FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.service_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  competency_id uuid NOT NULL REFERENCES public.competencies(id),
  UNIQUE (service_id, competency_id)
);
ALTER TABLE public.service_requirements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_requirements FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.service_requirements
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.professional_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  competency_id uuid NOT NULL REFERENCES public.competencies(id),
  document_id uuid REFERENCES public.documents(id),
  issued_at date NOT NULL,
  expires_at date,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','expired')),
  CHECK (expires_at IS NULL OR expires_at >= issued_at),
  CHECK (status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
ALTER TABLE public.professional_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_credentials FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.professional_credentials
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.professional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  kind text NOT NULL CHECK (kind IN ('available','unavailable')),
  CHECK (ends_at > starts_at)
);
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_availability FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.professional_availability
FOR EACH ROW EXECUTE FUNCTION private.stamp();
