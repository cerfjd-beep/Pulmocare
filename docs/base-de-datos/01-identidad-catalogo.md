# Identidad, pacientes y catálogo

Aplicar las convenciones del [documento principal](README.md).
Los campos indicados se suman a id y a los campos comunes de trazabilidad.
No implementar niveles de acceso mediante el texto mostrado en los menús.

## Identidad y vínculos

| Tabla            | Campos principales                                                                                                                                                                                                                                                | Restricciones                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| profiles         | auth_user_id? → auth.users; display_name text; active boolean                                                                                                                                                                                                     | auth_user_id UNIQUE cuando exista; al eliminar una cuenta, SET NULL; conservar la identidad histórica                                        |
| role_assignments | profile_id → profiles; role text; granted_by → profiles; granted_at timestamptz; revoked_at? timestamptz                                                                                                                                                          | Roles patient, caregiver, operations_admin, clinical_reviewer, therapist, billing_admin, access_admin; una asignación activa por usuario/rol |
| patients         | profile_id? → profiles; full_name text; birth_date? date; sex? text; phone? text; email? text; active boolean                                                                                                                                                     | profile_id UNIQUE cuando exista; puede haber paciente sin cuenta; no deduplicar por nombre                                                   |
| caregiver_links  | caregiver_id → profiles; patient_id → patients; relationship text; scopes text[]; authorized_by → profiles; authorized_at timestamptz; revoked_at? timestamptz; expires_at? timestamptz                                                                           | Un vínculo activo por cuidador/paciente; autorización verificable; scopes de catálogo                                                        |
| consents         | patient_id → patients; granted_by → profiles; purpose text; policy_version text; granted_at timestamptz; revoked_at? timestamptz; evidence_ref? text                                                                                                              | La revocación no borra la evidencia histórica                                                                                                |
| addresses        | patient_id → patients; department_code text; municipality_code text; district_code? text; address_line text; references? text; latitude? numeric; longitude? numeric; coordinate_source? text; accuracy_meters? numeric; captured_at? timestamptz; active boolean | Coordenadas en pareja, latitud ±90 y longitud ±180; precisión >= 0                                                                           |

Reglas:

- La cuenta que solicita para un familiar no se convierte automáticamente en ese paciente.
- El enlace cuidador requiere verificación de representación; no basta indicar un patient_id.
- scopes iniciales: request_service, view_appointments, view_clinical_releases, manage_payments.
- birth_date puede faltar en un borrador, pero debe completarse antes de la evaluación clínica.
- Validar fecha de nacimiento no futura en la operación de escritura, sin calcular edad almacenada.
- sex y relationship usan catálogos acordados; incluir no informado cuando corresponda.
- Teléfono normalizado a E.164; correo validado por aplicación, sin usarlo como clave de paciente.
- No exponer fecha de nacimiento, teléfono o correo en búsquedas públicas.
- Acceso del profesional a una dirección únicamente por asignación vigente.
- El domicilio editable no modifica la dirección congelada de una visita ya coordinada.
- Usar catálogo territorial versionado; no introducir divisiones administrativas de memoria.
- Ubicación del prestador para una visita futura se registra en travel_estimates como origen
  previsto; no implementar seguimiento GPS continuo como requisito implícito.

## Catálogo de atención

| Tabla                     | Campos principales                                                                                                                                                                        | Restricciones                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| services                  | code text; name text; description text; duration_minutes integer; active boolean                                                                                                          | code UNIQUE; duración > 0; nombre no vacío                                                  |
| service_price_versions    | service_id → services; amount_cents bigint; currency char(3); valid_from timestamptz; valid_until? timestamptz; approved_by? → profiles; approved_at? timestamptz; status text            | draft, published, retired; versiones publicadas sin vigencias solapadas por servicio/moneda |
| competencies              | code text; name text                                                                                                                                                                      | code UNIQUE                                                                                 |
| service_requirements      | service_id → services; competency_id → competencies                                                                                                                                       | UNIQUE(service_id, competency_id)                                                           |
| professionals             | profile_id → profiles; display_name text; specialty text; registration_ref? text; verification_status text; active boolean                                                                | profile_id UNIQUE; pending, verified, suspended                                             |
| professional_credentials  | professional_id → professionals; competency_id → competencies; document_id? → documents; issued_at date; expires_at? date; verified_by? → profiles; verified_at? timestamptz; status text | pending, verified, rejected, expired; vigencia y verificación necesarias para asignar       |
| professional_availability | professional_id → professionals; starts_at timestamptz; ends_at timestamptz; kind text                                                                                                    | available, unavailable; ends_at > starts_at; inicialmente intervalos concretos              |

No publicar afiliaciones ni certificaciones por una carga de archivo sin revisión.
La pertenencia al rol therapist no sustituye la habilitación o competencia.
Asignar exige disponibilidad, verificación activa y todas las competencias del servicio.
Una indisponibilidad prevalece sobre un intervalo disponible.

## Documentos

documents:

- owner_profile_id → profiles; patient_id? → patients; professional_id? → professionals.
- category text: prescription, credential, clinical_attachment, billing_support.
- bucket_id text; object_path text; mime_type text; size_bytes bigint; checksum_sha256 text.
- scan_status text: pending, clean, rejected; uploaded_at timestamptz.
- UNIQUE(bucket_id, object_path); tamaño positivo; no guardar URLs firmadas duraderas.
- Propietario representa al cargador, no determina por sí solo todos los derechos de lectura.
- prescription requiere patient_id; credential requiere professional_id.
- billing_support no habilita acceso al expediente del paciente.
- Validar categoría, vínculo y destino antes de autorizar la carga y finalizar metadatos.

Usar buckets separados para recetas, acreditaciones y soporte financiero.
JPG, PNG y PDF hasta 5 MB para recetas, conforme al prototipo.
Validar contenido y análisis antes de marcar clean; MIME del navegador no es suficiente.
El alta del objeto y la fila no son una transacción única: usar estado pendiente y
limpieza de huérfanos, conservando trazabilidad. No modificar storage.objects manualmente.

## Semillas

Cargar los seis servicios existentes con códigos estables, precios provisionales y estado draft
de las tarifas: evaluation, nebulization, physio, aspiration, rehab y education.
Las duraciones del prototipo son datos de ejemplo, pendientes de validar operativamente.
No conceder roles administrativos a un correo fijo en la semilla.
El alta inicial de access_admin se hará por un procedimiento de servidor controlado.
