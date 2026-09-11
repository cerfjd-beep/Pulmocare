-- Existing prototype catalog only. Amounts and durations are provisional, not approved tariffs.
INSERT INTO public.services(id, code, name, description, duration_minutes) VALUES
  ('10000000-0000-4000-8000-000000000001', 'evaluation', 'Evaluación respiratoria',
    'El primer paso para conocer tus necesidades respiratorias.', 45),
  ('10000000-0000-4000-8000-000000000002', 'nebulization', 'Nebulización',
    'Administración de terapia inhalada según indicación profesional.', 30),
  ('10000000-0000-4000-8000-000000000003', 'physio', 'Fisioterapia respiratoria',
    'Técnicas que acompañan el cuidado de tu respiración.', 45),
  ('10000000-0000-4000-8000-000000000004', 'aspiration', 'Aspiración de secreciones',
    'Manejo de secreciones por un profesional capacitado.', 30),
  ('10000000-0000-4000-8000-000000000005', 'rehab', 'Rehabilitación pulmonar',
    'Acompañamiento para tu recuperación y actividad cotidiana.', 60),
  ('10000000-0000-4000-8000-000000000006', 'education', 'Educación respiratoria',
    'Orientación para pacientes y cuidadores en el hogar.', 40);

INSERT INTO public.service_price_versions
  (id, service_id, amount_cents, currency, valid_from, status) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    2500, 'USD', '2026-09-11T00:00:00Z', 'draft'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
    1500, 'USD', '2026-09-11T00:00:00Z', 'draft'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003',
    2500, 'USD', '2026-09-11T00:00:00Z', 'draft'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004',
    2000, 'USD', '2026-09-11T00:00:00Z', 'draft'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005',
    3000, 'USD', '2026-09-11T00:00:00Z', 'draft'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006',
    2000, 'USD', '2026-09-11T00:00:00Z', 'draft');

INSERT INTO public.travel_tariff_versions(id, version, rules, valid_from, status)
VALUES ('30000000-0000-4000-8000-000000000001', 'demo-distance-traffic-v1',
  '{"algorithm":"distance-traffic-v1","currency":"USD","bands":[
    {"through_meters":5000,"cents":0},{"through_meters":10000,"cents":300},
    {"through_meters":25000,"cents":500}],
    "traffic_cents_per_minute":10,"max_traffic_cents":500,"coverage_meters":25000}',
  '2026-09-11T00:00:00Z', 'draft');
