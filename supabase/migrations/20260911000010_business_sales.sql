CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  legal_name text NOT NULL CHECK (length(trim(legal_name)) > 0),
  tax_identifier text,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companies FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  profile_id uuid REFERENCES public.profiles(id),
  UNIQUE (id, company_id)
);
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_contacts FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.company_contacts
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.business_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  contact_id uuid NOT NULL,
  requested_service text NOT NULL,
  scope text NOT NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','preparing','offered','accepted','declined')),
  offered_amount_cents bigint CHECK (offered_amount_cents >= 0),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  valid_until timestamptz,
  accepted_at timestamptz,
  acceptance_ref text,
  FOREIGN KEY (contact_id, company_id) REFERENCES public.company_contacts(id, company_id),
  CHECK (status NOT IN ('offered','accepted') OR
    (offered_amount_cents IS NOT NULL AND valid_until IS NOT NULL)),
  CHECK (status <> 'accepted' OR (accepted_at IS NOT NULL AND acceptance_ref IS NOT NULL))
);
ALTER TABLE public.business_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_quotes FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.business_quotes
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  quote_id uuid UNIQUE REFERENCES public.quotes(id),
  business_quote_id uuid UNIQUE REFERENCES public.business_quotes(id),
  appointment_id uuid REFERENCES public.appointments(id),
  company_id uuid REFERENCES public.companies(id),
  payer_profile_id uuid REFERENCES public.profiles(id),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','payable','settled','void')),
  CHECK (num_nonnulls(quote_id, business_quote_id) = 1)
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION private.stamp();
