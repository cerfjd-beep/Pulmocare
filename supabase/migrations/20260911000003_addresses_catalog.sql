CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  department_code text NOT NULL,
  municipality_code text NOT NULL,
  district_code text,
  address_line text NOT NULL CHECK (length(trim(address_line)) > 0),
  reference_notes text,
  latitude numeric(9,6),
  longitude numeric(10,6),
  coordinate_source text,
  accuracy_meters numeric CHECK (accuracy_meters >= 0 AND accuracy_meters < 'Infinity'),
  captured_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (id, patient_id),
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.addresses FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  code text NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.services FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.service_price_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  EXCLUDE USING gist (service_id extensions.gist_uuid_ops WITH =,
    currency extensions.gist_bpchar_ops WITH =,
    tstzrange(valid_from, valid_until, '[)') WITH &&) WHERE (status = 'published')
);
ALTER TABLE public.service_price_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_price_versions FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.service_price_versions
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  code text NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(trim(name)) > 0)
);
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.competencies FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.competencies
FOR EACH ROW EXECUTE FUNCTION private.stamp();
