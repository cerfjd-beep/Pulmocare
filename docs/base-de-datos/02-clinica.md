# Solicitud, evaluación y expediente clínico

Los campos clínicos se almacenan separados del resumen administrativo.
Aplicar las convenciones del [documento principal](README.md).

## Tablas de solicitud y evaluación

| Tabla                      | Campos principales                                                                                                                                                                                                       | Restricciones                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| service_requests           | patient_id → patients; requested_by → profiles; requested_service_id? → services; address_id? → addresses; status text; submitted_at? timestamptz; payment_preference? text; preferred_at? timestamptz                   | address_id debe pertenecer al paciente; creador autorizado                                          |
| clinical_intakes           | request_id → service_requests; revision integer; reason text; prescription_declared boolean; symptoms jsonb; history jsonb; questionnaire_version text; completed_at? timestamptz                                        | UNIQUE(request_id, revision); validar estructura contra la versión; revisiones completas inmutables |
| clinical_protocol_versions | code text; version integer; definition jsonb; status text; approved_by? → professionals; approved_at? timestamptz                                                                                                        | UNIQUE(code, version); draft, approved, retired; inmutable tras aprobación                          |
| request_assignments        | request_id → service_requests; professional_id → professionals; purpose text; assigned_by → profiles; assigned_at timestamptz; revoked_at? timestamptz                                                                   | purpose review o treatment; sin duplicado activo por solicitud/profesional/propósito                |
| assessments                | request_id → service_requests; intake_id → clinical_intakes; protocol_id → clinical_protocol_versions; assessed_by → professionals; result text; rationale text; assessed_at timestamptz; valid_until? timestamptz       | pending, eligible, medical_review, urgent_referral, insufficient_data; decisión emitida inmutable   |
| prescriptions              | request_id → service_requests; document_id → documents; prescription_date? date; diagnosis? text; indicated_therapy? text; review_status text; reviewed_by? → professionals; reviewed_at? timestamptz; review_note? text | pending, accepted, rejected; documento del mismo paciente; no aprobar sin campos revisados          |

La indicación declarada y el OCR son datos por revisar, nunca una decisión profesional.
No reutilizar el texto libre de status de React como una transición autorizada.
Si motivo/síntomas/receta cambian tras una decisión, invalidar su uso para nuevas reservas
y generar una nueva revisión append-only de clinical_intakes. Vincular cada assessment
con la revisión exacta que evaluó y comprobar que corresponde a la misma solicitud.
Solo la evaluación de la revisión completa actual puede habilitar la reserva.
El cuestionario distingue respuesta ausente, ninguno de los listados y selección de síntomas.
Un array vacío no equivale por sí solo a una respuesta negativa.
Una solicitud enviada no permite al paciente sobrescribir los datos clínicos revisados.

La alerta urgente debe poder mostrarse antes de crear una cuenta. No exigir guardar datos
identificables para mostrar la orientación de urgencia.
El resultado insufficient_data no se convierte en eligible.
Triaje rojo y alerta de seguimiento detienen el flujo ordinario y requieren el circuito
aprobado por el responsable clínico. No inventar umbrales en el esquema SQL.

## Estados de solicitud

- draft → submitted: cuestionario completo, identidad/vínculo válidos y consentimiento.
- submitted → in_review: asignación de revisión a un profesional habilitado.
- in_review → approved: evaluación eligible vigente de un revisor autorizado.
- in_review → medical_review o referred: decisión profesional o derivación urgente del flujo.
- medical_review → in_review: nueva información y nueva revisión.
- draft/submitted/in_review/medical_review/approved → cancelled: operación autorizada y auditada.
- referred y cancelled no se reabren silenciosamente; crear solicitud nueva o transición explícita.

service_requests.status resume el flujo; el razonamiento queda solo en assessments.
Las transiciones se efectúan en una operación transaccional, no mediante UPDATE libre.
Una aprobación vencida, profesional suspendido o requisito faltante impide confirmar atención.

## Encuentro clínico

| Tabla               | Campos principales                                                                                                                                                                                                                                                             | Restricciones                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| clinical_encounters | appointment_id → appointments; professional_id → professionals; started_at timestamptz; completed_at? timestamptz; procedure_text text; evolution_text text; recommendations_text text; status text; signed_at? timestamptz                                                    | appointment_id UNIQUE; draft, signed; profesional asignado                                  |
| vital_signs         | encounter_id → clinical_encounters; measured_at timestamptz; kind text; value numeric; unit text; context? jsonb                                                                                                                                                               | Catálogo tipo/unidad obligatorio; permite mediciones repetidas                              |
| clinical_amendments | encounter_id → clinical_encounters; author_id → professionals; target_field text; correction_text text; reason text; signed_at timestamptz                                                                                                                                     | Inserción únicamente; preservar original                                                    |
| clinical_releases   | encounter_id → clinical_encounters; released_by → professionals; released_at timestamptz; content_snapshot jsonb; version integer                                                                                                                                              | UNIQUE(encounter_id, version); solo documento firmado y contenido aprobado para paciente    |
| follow_ups          | encounter_id → clinical_encounters; due_at timestamptz; answered_at? timestamptz; improvement? text; persistent_symptoms? boolean; wants_new_visit? boolean; answers? jsonb; status text; assigned_to? → professionals; reviewed_at? timestamptz; reviewed_by? → professionals | pending, answered, review_required, closed; primer seguimiento UNIQUE(encounter_id, due_at) |

Signos iniciales: heart_rate (latidos/min), respiratory_rate (respiraciones/min),
systolic_bp y diastolic_bp (mmHg), temperature (°C), spo2 (%).
Conservar instante y contexto de medición; no sobrescribir «la última saturación».
Usar controles de formato/rango físico y protocolo clínico versionado por separado.
No convertir los límites demostrativos de VisitForm en reglas de diagnóstico.

La firma congela el encuentro y sus signos; corregir con adendas vinculadas a la medición
cuando target_field identifique un signo. No usar UPDATE para ocultar el valor anterior.
El paciente puede consultar información publicada en clinical_releases y sus respuestas;
no accede a borradores internos ni notas de otro paciente.
Definir qué información se publica antes del piloto.

## Seguimiento y responsabilidad

En una misma transacción: firmar encuentro, completar cita, crear seguimiento a +24 h desde
completed_at y emitir trabajo outbox único.
Una respuesta persistente o solicitud de nueva visita genera revisión asignable; no diagnostica.
Guardar que el equipo revisó y cerró la alerta; enviar un mensaje no equivale a resolverla.
La modificación de respuestas se versiona y puede reabrir una alerta ya revisada.
Sin respuesta, generar recordatorio según política aprobada y evitar duplicados.
