CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  provider text NOT NULL,
  method text NOT NULL,
  idempotency_key text NOT NULL,
  external_reference text,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','succeeded','failed','expired')),
  received_at timestamptz,
  UNIQUE (provider, idempotency_key),
  UNIQUE (provider, external_reference),
  UNIQUE (id, sale_id)
);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.payment_attempts
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  attempt_id uuid,
  provider text NOT NULL,
  external_reference text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL CHECK (currency = 'USD'),
  received_at timestamptz NOT NULL,
  recorded_by uuid REFERENCES public.profiles(id),
  UNIQUE (provider, external_reference),
  FOREIGN KEY (attempt_id, sale_id) REFERENCES public.payment_attempts(id, sale_id)
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  provider text NOT NULL,
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed')),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  UNIQUE (provider, event_id)
);
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.payment_events
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  payment_id uuid NOT NULL REFERENCES public.payments(id),
  provider text NOT NULL,
  external_reference text,
  idempotency_key text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  UNIQUE (provider, idempotency_key),
  UNIQUE (provider, external_reference)
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refunds FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.refunds
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  replaces_document_id uuid REFERENCES public.fiscal_documents(id),
  document_type text NOT NULL,
  issuer_identifier text NOT NULL,
  control_number text,
  external_id text,
  receipt_seal text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','accepted','rejected')),
  issued_at timestamptz,
  document_id uuid REFERENCES public.documents(id),
  UNIQUE (issuer_identifier, document_type, control_number),
  UNIQUE (issuer_identifier, external_id)
);
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_documents FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.fiscal_documents
FOR EACH ROW EXECUTE FUNCTION private.stamp();
