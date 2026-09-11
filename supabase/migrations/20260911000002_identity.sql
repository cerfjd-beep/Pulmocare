CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  role text NOT NULL CHECK (role IN ('patient', 'caregiver', 'operations_admin',
    'clinical_reviewer', 'therapist', 'billing_admin', 'access_admin')),
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.role_assignments FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.role_assignments
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE UNIQUE INDEX active_role ON public.role_assignments(profile_id, role)
WHERE revoked_at IS NULL;
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  profile_id uuid UNIQUE REFERENCES public.profiles(id),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 200),
  birth_date date,
  sex text,
  phone text CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.patients FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.caregiver_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  caregiver_id uuid NOT NULL REFERENCES public.profiles(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  relationship text NOT NULL CHECK (length(trim(relationship)) > 0),
  scopes text[] NOT NULL CHECK (cardinality(scopes) > 0 AND scopes <@
    ARRAY['request_service','view_appointments','view_clinical_releases','manage_payments']
    AND array_position(scopes, NULL) IS NULL),
  authorized_by uuid NOT NULL REFERENCES public.profiles(id),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > authorized_at),
  CHECK (revoked_at IS NULL OR revoked_at >= authorized_at)
);
ALTER TABLE public.caregiver_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.caregiver_links FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.caregiver_links
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE UNIQUE INDEX active_caregiver ON public.caregiver_links(caregiver_id, patient_id)
WHERE revoked_at IS NULL;
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  purpose text NOT NULL,
  policy_version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  evidence_ref text,
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consents FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.consents
FOR EACH ROW EXECUTE FUNCTION private.stamp();
