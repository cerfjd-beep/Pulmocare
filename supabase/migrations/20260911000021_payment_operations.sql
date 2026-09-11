-- Called only by a server worker AFTER provider signature verification.
-- No patient/admin browser may invoke this function, and no raw webhook body is stored.
CREATE FUNCTION public.apply_payment_event(
  provider_name text, event_reference text, payload_hash text, sale uuid,
  payment_reference text, amount bigint, currency_code text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.sales; event public.payment_events; payment public.payments; paid bigint;
BEGIN
  -- Stable ordering: provider event lock, then sale lock, then payment/refund locks.
  PERFORM pg_advisory_xact_lock(hashtextextended(provider_name || ':' || event_reference, 0));
  SELECT * INTO s FROM public.sales WHERE id = sale FOR UPDATE;
  IF NOT FOUND OR currency_code <> s.currency OR amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'Invalid payment' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO event FROM public.payment_events
  WHERE provider = provider_name AND event_id = event_reference;
  IF FOUND AND event.payload_hash <> apply_payment_event.payload_hash THEN
    RAISE EXCEPTION 'Event replay payload mismatch' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO payment FROM public.payments
  WHERE provider = provider_name AND external_reference = payment_reference;
  IF FOUND THEN
    IF payment.sale_id <> sale OR payment.amount_cents <> amount OR payment.currency <> currency_code THEN
      RAISE EXCEPTION 'Payment replay mismatch' USING ERRCODE = '23514';
    END IF;
    INSERT INTO public.payment_events(provider, event_id, payload_hash, status, processed_at)
    VALUES (provider_name, event_reference, apply_payment_event.payload_hash, 'processed', now())
    ON CONFLICT (provider, event_id) DO NOTHING;
    RETURN payment.id;
  END IF;
  IF event.id IS NOT NULL AND event.status = 'processed' THEN
    RAISE EXCEPTION 'Event already linked to another payment' USING ERRCODE = '23514';
  END IF;
  SELECT coalesce(sum(amount_cents), 0) INTO paid FROM public.payments WHERE sale_id = sale;
  IF s.status = 'void' OR paid + amount > s.total_cents THEN
    RAISE EXCEPTION 'Payment exceeds authorized balance' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.payments(sale_id, provider, external_reference, amount_cents, currency, received_at)
  VALUES (sale, provider_name, payment_reference, amount, currency_code, now()) RETURNING * INTO payment;
  INSERT INTO public.payment_events(provider, event_id, payload_hash, status, processed_at)
  VALUES (provider_name, event_reference, apply_payment_event.payload_hash, 'processed', now())
  ON CONFLICT (provider, event_id) DO UPDATE SET status = 'processed', processed_at = now();
  UPDATE public.sales SET status = CASE WHEN paid + amount = total_cents THEN 'settled' ELSE 'payable' END
  WHERE id = sale;
  INSERT INTO public.outbox_jobs(event_type, aggregate_type, aggregate_id, idempotency_key)
  VALUES ('payment_received', 'payments', payment.id, 'payment_received:' || payment.id);
  PERFORM private.log_event('payment_received', 'payments', payment.id);
  -- Never restore an expired appointment here. Operations reconcile late payments separately.
  RETURN payment.id;
END;
$$;
ALTER FUNCTION public.apply_payment_event(text, text, text, uuid, text, bigint, text)
OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.apply_payment_event(text, text, text, uuid, text, bigint, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_event(text, text, text, uuid, text, bigint, text)
TO service_role;

CREATE FUNCTION public.request_refund(payment uuid, amount bigint, request_key text, reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.payments; existing public.refunds; reserved bigint; refund_id uuid;
BEGIN
  PERFORM private.require_role('billing_admin');
  SELECT * INTO p FROM public.payments WHERE id = payment;
  PERFORM 1 FROM public.sales WHERE id = p.sale_id FOR UPDATE;
  SELECT * INTO p FROM public.payments WHERE id = payment FOR UPDATE;
  IF p.id IS NULL OR amount IS NULL OR amount <= 0 OR length(trim(request_key)) = 0 THEN
    RAISE EXCEPTION 'Invalid refund' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO existing FROM public.refunds WHERE provider = p.provider AND idempotency_key = request_key;
  IF FOUND THEN
    IF existing.payment_id <> payment OR existing.amount_cents <> amount THEN
      RAISE EXCEPTION 'Refund replay mismatch' USING ERRCODE = '23514';
    END IF;
    RETURN existing.id;
  END IF;
  SELECT coalesce(sum(amount_cents), 0) INTO reserved FROM public.refunds
  WHERE payment_id = payment AND status IN ('pending','succeeded');
  IF reserved + amount > p.amount_cents THEN
    RAISE EXCEPTION 'Refund exceeds available balance' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.refunds(payment_id, provider, idempotency_key, amount_cents, reason)
  VALUES (payment, p.provider, request_key, amount, reason) RETURNING id INTO refund_id;
  INSERT INTO public.outbox_jobs(event_type, aggregate_type, aggregate_id, idempotency_key)
  VALUES ('refund_requested', 'refunds', refund_id, 'refund_requested:' || refund_id);
  PERFORM private.log_event('refund_requested', 'refunds', refund_id);
  RETURN refund_id;
END;
$$;
ALTER FUNCTION public.request_refund(uuid, bigint, text, text) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.request_refund(uuid, bigint, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.request_refund(uuid, bigint, text, text) TO authenticated;

CREATE FUNCTION public.claim_outbox(worker text, batch_size integer DEFAULT 10)
RETURNS SETOF public.outbox_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF worker IS NULL OR length(trim(worker)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid worker identity' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY WITH candidates AS (
    SELECT id FROM public.outbox_jobs WHERE attempts < 5 AND available_at <= now()
      AND (status = 'pending' OR (status = 'running' AND locked_until <= now()))
    ORDER BY available_at, id LIMIT greatest(1, least(coalesce(batch_size, 10), 100))
    FOR UPDATE SKIP LOCKED
  ) UPDATE public.outbox_jobs j SET status = 'running', worker_id = worker,
    locked_until = now() + interval '2 minutes', attempts = attempts + 1
  FROM candidates c WHERE j.id = c.id RETURNING j.*;
END;
$$;
ALTER FUNCTION public.claim_outbox(text, integer) OWNER TO pulmocare_executor;
REVOKE ALL ON FUNCTION public.claim_outbox(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox(text, integer) TO service_role;
