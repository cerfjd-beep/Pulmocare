# Agenda, traslado, finanzas y trabajos

Aplicar las convenciones del [documento principal](README.md).

## Tarifas y cotizaciones

| Tabla                  | Campos principales                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Restricciones                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| travel_tariff_versions | version text; rules jsonb; valid_from timestamptz; valid_until? timestamptz; status text; approved_by? → profiles; approved_at? timestamptz                                                                                                                                                                                                                                                                                                                                                                | version UNIQUE; draft, published, retired; esquema JSON validado                       |
| quotes                 | request_id → service_requests; professional_id? → professionals; status text; currency char(3); service_cents bigint; distance_cents bigint; traffic_cents bigint; tax_cents bigint; total_cents bigint; expires_at timestamptz; accepted_at? timestamptz; accepted_by? → profiles                                                                                                                                                                                                                         | draft, offered, accepted, expired, cancelled; total igual a suma de componentes        |
| quote_items            | quote_id → quotes; service_price_version_id? → service_price_versions; kind text; label text; quantity numeric; unit_cents bigint; amount_cents bigint                                                                                                                                                                                                                                                                                                                                                     | service, distance, traffic, tax; cantidades > 0; suma coherente con quote              |
| travel_estimates       | quote_id → quotes; tariff_id → travel_tariff_versions; provider text; source text; origin_latitude numeric; origin_longitude numeric; destination_latitude numeric; destination_longitude numeric; origin_kind text; captured_at? timestamptz; calculated_at timestamptz; appointment_at timestamptz; departure_at timestamptz; arrival_at timestamptz; distance_meters numeric; baseline_seconds numeric; duration_seconds numeric; delay_seconds numeric; buffer_seconds integer; expires_at timestamptz | quote_id UNIQUE; source live o simulation; valores no negativos; viaje real para cobro |

travel_estimates guarda el origen efectivo/propuesto, destino y métricas que sustentan
el precio. origin_kind: current_position, operating_base, previous_visit o planned_point.
El vínculo al profesional lo da quotes.professional_id; no confiar en un ID del navegador.
No compartir la geoposición del profesional con el paciente por defecto.
No guardar respuesta cruda del proveedor indiscriminadamente; definir qué métricas pueden
persistirse y su retención según las condiciones del proveedor antes del uso real.

Reglas JSON de tarifa: tramos en metros, centavos por tramo, centavos por minuto adicional,
tope de tráfico, moneda, cobertura y versión de algoritmo. Tramos crecientes, sin huecos
ni solapamientos ambiguos. La regla de los límites será la del cálculo actual.
La tarifa provisional vigente del código permanece draft: 0–5 km $0; >5–10 km $3;

> 10–25 km $5; demora $0.10/min; tope $5. No activarla como aprobada en producción.

Cotización ofrecida inmutable: recotizar crea otra fila. Una cotización aceptada no se
reescribe cuando cambian dirección, profesional, tráfico, impuestos o catálogo.
Cambios de condiciones requieren nueva oferta y aceptación explícita.
No usar servicio o traslado de simulación en una venta real.
Validar sumas mediante función transaccional/trigger; CHECK no consulta otras filas.
Configurar impuestos antes de producir ofertas cobrables; no asumir tax_cents=0 por defecto.

## Agenda y reserva

appointments:

- request_id → service_requests; quote_id → quotes; professional_id → professionals.
- approval_id → assessments; address_snapshot jsonb validado, con dirección y referencias.
- starts_at, ends_at, busy_from, busy_until de tipo timestamptz.
- status text; hold_expires_at? timestamptz; confirmed_at? timestamptz.
- replaces_appointment_id? → appointments; cancellation_reason? text.
- busy_from <= starts_at < ends_at <= busy_until.
- busy_from incorpora traslado/preparación; busy_until incorpora cierre y desplazamiento
  adicional reservado cuando la política operativa lo requiera.
- held, confirmed, in_progress, completed, expired, cancelled, rescheduled, no_show.

La preferencia del paciente está en service_requests.preferred_at, no bloquea agenda.
Crear la retención requiere profesional habilitado, disponibilidad y aprobación vigente.

Usar btree_gist y exclusión sobre professional_id y tstzrange(busy_from, busy_until, '[)')
para held, confirmed e in_progress. Los extremos adyacentes no se solapan.
La condición de exclusión no contiene now(): un trabajo marca held vencidas como expired.
Al reservar, expirar retenciones vencidas del recurso en la misma operación para liberar agenda.
Serializar reservas y cambios de disponibilidad por profesional y conservar la exclusión como
última barrera. Una búsqueda de horario en la interfaz no garantiza disponibilidad al guardar.
Validar que la ruta quepa entre visitas anteriores/posteriores; si no, recalcular y rechazar
la combinación. No suponer traslados independientes desde una base fija.

Confirmar exige que cita, solicitud, aprobación y cotización correspondan al mismo paciente,
servicio y profesional. Validar estas relaciones en la función transaccional y FK compuestas
cuando sea posible. Una misma quote aceptada no puede confirmar dos citas activas.
Reprogramación: cancelar/reemplazar la anterior y reservar la nueva de manera atómica.
Definir una duración configurable de retención antes de habilitar pagos reales.

## Ventas, pagos y documentos fiscales

| Tabla            | Campos principales                                                                                                                                                                                        | Restricciones                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| sales            | quote_id? → quotes; business_quote_id? → business_quotes; appointment_id? → appointments; company_id? → companies; payer_profile_id? → profiles; total_cents bigint; currency char(3); status text        | quote_id y business_quote_id UNIQUE cuando existan; exactamente uno completo; pending, payable, settled, void |
| payment_attempts | sale_id → sales; provider text; method text; idempotency_key text; external_reference? text; amount_cents bigint; currency char(3); status text; received_at? timestamptz                                 | UNIQUE(provider, idempotency_key); referencia externa única cuando exista                                     |
| payments         | sale_id → sales; attempt_id? → payment_attempts; provider text; external_reference text; amount_cents bigint; currency char(3); received_at timestamptz; recorded_by? → profiles                          | UNIQUE(provider, external_reference); dinero recibido confirmado                                              |
| payment_events   | provider text; event_id text; received_at timestamptz; processed_at? timestamptz; status text; payload_hash text                                                                                          | UNIQUE(provider, event_id); received, processed, failed; datos mínimos de evento                              |
| refunds          | payment_id → payments; provider text; external_reference? text; idempotency_key text; amount_cents bigint; status text; reason text                                                                       | pending, succeeded, failed; clave idempotente única por proveedor                                             |
| fiscal_documents | sale_id → sales; replaces_document_id? → fiscal_documents; document_type text; control_number? text; external_id? text; receipt_seal? text; status text; issued_at? timestamptz; document_id? → documents | pending, submitted, accepted, rejected; identificadores únicos por emisor/tipo cuando aplique                 |

La venta conserva los importes aceptados de su cotización, personal o empresarial.
Una business_quote aceptada queda inmutable y exige importe, moneda y evidencia de aceptación.

payment_attempts.status: pending, processing, succeeded, failed, expired.
Transferencia: pendiente hasta verificación bancaria. Contra entrega: registrar recibo por actor
autorizado. Empresa: crédito solo con política comercial, saldo y vencimiento establecidos.
Nunca inferir pago recibido por la preferencia del paciente ni por la página de éxito.

Verificar firma de webhook en servidor; deduplicar evento y bloquear la venta al aplicar saldo.
Pagos/devoluciones concurrentes no pueden exceder importes autorizados. Moneda debe coincidir.
Descontar solo devoluciones succeeded y reservar capacidad para pending.
Un pago tardío tras vencer la reserva requiere conciliación; no resucita un horario ocupado.
Los eventos fuera de orden no revierten un pago confirmado a pending.
Reintentar un DTE rechazado no debe crear otro cobro.
No sostener bloqueos de base de datos mientras se llama al procesador, mapas o Hacienda.

## Empresas y continuidad

| Tabla            | Campos principales                                                                                                                                                                                                               | Restricciones                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| companies        | legal_name text; tax_identifier? text; active boolean                                                                                                                                                                            | Sin acceso implícito a expedientes de empleados                                 |
| company_contacts | company_id → companies; name text; email text; phone? text; profile_id? → profiles                                                                                                                                               | Contacto y cuenta separados                                                     |
| business_quotes  | company_id → companies; contact_id → company_contacts; requested_service text; scope text; status text; offered_amount_cents? bigint; currency char(3); valid_until? timestamptz; accepted_at? timestamptz; acceptance_ref? text | requested, preparing, offered, accepted, declined; contacto de la misma empresa |
| outbox_jobs      | event_type text; aggregate_type text; aggregate_id uuid; idempotency_key text; payload jsonb; available_at timestamptz; attempts integer; locked_until? timestamptz; worker_id? text; status text; last_error_code? text         | clave UNIQUE; pending, running, succeeded, failed                               |
| notifications    | job_id → outbox_jobs; recipient_profile_id → profiles; channel text; template_version text; provider_reference? text; status text; sent_at? timestamptz; delivered_at? timestamptz                                               | email, whatsapp, sms; un envío lógico por trabajo/canal/destinatario            |
| audit_events     | actor_profile_id? → profiles; system_actor? text; action text; entity_type text; entity_id uuid; occurred_at timestamptz; correlation_id uuid; reason? text; changed_fields? text[]                                              | Solo inserción; sin secretos ni duplicación de notas clínicas                   |

Los identificadores polimórficos de auditoría/outbox no son FK: validarlos al crear eventos.
Usar trabajos con lease recuperable, reintentos limitados y bloqueo SKIP LOCKED para workers.
La entrega es al menos una vez; consumidor y proveedor deben tolerar idempotencia.
Un reintento no crea un segundo seguimiento ni mensaje lógico.
No insertar diagnósticos, recetas ni coordenadas en payload de notificaciones.
Separar el procesamiento del evento de la entrega final informada por el proveedor.
