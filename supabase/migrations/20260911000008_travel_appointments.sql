CREATE TABLE public.travel_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id),
  tariff_id uuid NOT NULL REFERENCES public.travel_tariff_versions(id),
  provider text NOT NULL,
  source text NOT NULL CHECK (source IN ('live','simulation')),
  origin_latitude numeric(9,6) NOT NULL CHECK (origin_latitude BETWEEN -90 AND 90),
  origin_longitude numeric(10,6) NOT NULL CHECK (origin_longitude BETWEEN -180 AND 180),
  destination_latitude numeric(9,6) NOT NULL CHECK (destination_latitude BETWEEN -90 AND 90),
  destination_longitude numeric(10,6) NOT NULL CHECK (destination_longitude BETWEEN -180 AND 180),
  origin_kind text NOT NULL CHECK (origin_kind IN
    ('current_position','operating_base','previous_visit','planned_point')),
  captured_at timestamptz,
  calculated_at timestamptz NOT NULL,
  appointment_at timestamptz NOT NULL,
  departure_at timestamptz NOT NULL,
  arrival_at timestamptz NOT NULL,
  distance_meters numeric NOT NULL CHECK (distance_meters >= 0 AND distance_meters < 'Infinity'),
  baseline_seconds numeric NOT NULL CHECK (baseline_seconds >= 0 AND baseline_seconds < 'Infinity'),
  duration_seconds numeric NOT NULL CHECK (duration_seconds >= 0 AND duration_seconds < 'Infinity'),
  delay_seconds numeric NOT NULL CHECK (delay_seconds >= 0 AND delay_seconds < 'Infinity'),
  buffer_seconds integer NOT NULL CHECK (buffer_seconds >= 0),
  expires_at timestamptz NOT NULL,
  CHECK (delay_seconds = greatest(0, duration_seconds - baseline_seconds)),
  CHECK (departure_at <= arrival_at AND arrival_at <= appointment_at),
  CHECK (expires_at > calculated_at),
  CHECK (arrival_at = departure_at + duration_seconds * interval '1 second')
);
ALTER TABLE public.travel_estimates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.travel_estimates FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.travel_estimates
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  request_id uuid NOT NULL REFERENCES public.service_requests(id),
  quote_id uuid NOT NULL,
  professional_id uuid NOT NULL REFERENCES public.professionals(id),
  approval_id uuid NOT NULL,
  address_snapshot jsonb NOT NULL CHECK (jsonb_typeof(address_snapshot) = 'object'
    AND address_snapshot ? 'address_line'),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  busy_from timestamptz NOT NULL,
  busy_until timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN
    ('held','confirmed','in_progress','completed','expired','cancelled','rescheduled','no_show')),
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  replaces_appointment_id uuid REFERENCES public.appointments(id),
  cancellation_reason text,
  FOREIGN KEY (quote_id, request_id, professional_id)
    REFERENCES public.quotes(id, request_id, professional_id),
  FOREIGN KEY (approval_id, request_id) REFERENCES public.assessments(id, request_id),
  CHECK (busy_from <= starts_at AND starts_at < ends_at AND ends_at <= busy_until),
  CHECK (status <> 'held' OR hold_expires_at IS NOT NULL),
  EXCLUDE USING gist (professional_id extensions.gist_uuid_ops WITH =,
    tstzrange(busy_from, busy_until, '[)') WITH &&)
    WHERE (status IN ('held','confirmed','in_progress'))
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointments FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.stamp();

CREATE UNIQUE INDEX one_active_appointment_per_quote ON public.appointments(quote_id)
WHERE status IN ('held','confirmed','in_progress','completed');
