CREATE TABLE public.travel_tariff_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  version text NOT NULL UNIQUE,
  rules jsonb NOT NULL CHECK (jsonb_typeof(rules) = 'object'),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (status = 'draft' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
ALTER TABLE public.travel_tariff_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.travel_tariff_versions FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.travel_tariff_versions
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  professional_id uuid REFERENCES public.professionals(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','offered','accepted','expired','cancelled')),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  service_cents bigint NOT NULL CHECK (service_cents >= 0),
  distance_cents bigint NOT NULL CHECK (distance_cents >= 0),
  traffic_cents bigint NOT NULL CHECK (traffic_cents >= 0),
  tax_cents bigint NOT NULL CHECK (tax_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  tax_policy_version text NOT NULL CHECK (length(trim(tax_policy_version)) > 0),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  UNIQUE (id, request_id, professional_id),
  CHECK (total_cents = service_cents + distance_cents + traffic_cents + tax_cents),
  CHECK (status <> 'accepted' OR (accepted_at IS NOT NULL AND accepted_by IS NOT NULL)),
  CHECK (status = 'draft' OR professional_id IS NOT NULL)
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quotes FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  quote_id uuid NOT NULL REFERENCES public.quotes(id),
  service_price_version_id uuid REFERENCES public.service_price_versions(id),
  kind text NOT NULL CHECK (kind IN ('service','distance','traffic','tax')),
  label text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0 AND quantity < 'Infinity'),
  unit_cents bigint NOT NULL CHECK (unit_cents >= 0),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  CHECK (amount_cents = round(quantity * unit_cents)),
  CHECK (kind <> 'service' OR service_price_version_id IS NOT NULL)
);
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_items FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION private.stamp();
