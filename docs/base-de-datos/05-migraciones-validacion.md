# Orden de implementación y validación

Este documento prescribe la siguiente fase. No acredita ejecución de SQL ni despliegue.

## Preparación

1. Revisar esta especificación y registrar decisiones pendientes.
2. Comprobar versión real de PostgreSQL del proyecto Supabase y compatibilidad de extensiones.
3. Preparar entorno local aislado con Supabase CLI y dependencias de contenedores.
4. Crear migraciones bajo supabase/migrations con timestamp único.
5. Separar secretos locales de archivos versionados; no imprimir credenciales.
6. Si ya existe una base remota, inspeccionar historial y diferencias antes de modificarla.
7. No ejecutar reset contra pruebas compartidas o producción para «resolver» diferencias.

Usar archivos SQL por módulo, objetivo de 100 caracteres por línea y 200–250 líneas por
archivo. Dividir una fase en varias migraciones si hace falta; no compactar SQL para
cumplir artificialmente el límite. Cada tabla nace protegida por RLS y privilegios mínimos.

## Secuencia de migraciones

| Fase | Contenido                                                                   | Salida verificable                            |
| ---- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 001  | Extensiones necesarias, private, convenciones, helpers de timestamps        | Base vacía reproducible, sin permisos amplios |
| 002  | profiles, roles, pacientes, cuidadores, consentimientos y direcciones       | Acceso propio y revocación probados           |
| 003  | Servicios, precios, competencias, profesionales y documentos                | Catálogo y acreditaciones con políticas       |
| 004  | Requisitos de servicio, credenciales y disponibilidad                       | Habilitación y agenda inicial                 |
| 005  | Solicitudes, cuestionarios, protocolos, asignaciones, recetas, evaluaciones | Transiciones clínicas autorizadas             |
| 006  | Tarifas de traslado, quotes, quote_items y travel_estimates                 | Precios reproducibles e inmutables            |
| 007  | appointments, exclusiones y funciones de reserva                            | Sin dobles reservas concurrentes              |
| 008  | Encuentros, signos, adendas, publicaciones y seguimiento                    | Firma inmutable y publicación aislada         |
| 009  | Empresas, contactos y solicitudes empresariales                             | Relación empresa/contacto consistente         |
| 010  | Ventas, intentos, pagos, eventos, reembolsos y DTE                          | Conciliación e idempotencia                   |
| 011  | Outbox, notificaciones y auditoría                                          | Workers recuperables sin duplicación lógica   |
| 012  | Funciones integradoras, vistas administrativas y grants finales             | Cada interfaz recibe solo sus datos           |
| 013  | Índices ajustados a consultas, semillas ficticias y tipos generados         | Flujo completo probado                        |

Las FK dentro de cada fase se crean en orden de dependencia; agregar FK diferidas a una
migración posterior cuando haya una referencia circular legítima.
Las funciones que emiten auditoría/outbox se terminan después de crear estas tablas.
Hasta entonces no conceder operaciones de negocio incompletas al usuario final.

## Operaciones transaccionales obligatorias

| Operación           | Validación y escritura atómica                                             |
| ------------------- | -------------------------------------------------------------------------- |
| submit_request      | Identidad/vínculo, consentimiento, cuestionario completo y estado inicial  |
| assign_reviewer     | Rol operativo, habilitación, asignación y evento de auditoría              |
| record_assessment   | Revisor asignado, protocolo aprobado, decisión, estado y auditoría         |
| offer_quote         | Precios vigentes, ruta válida, desglose, versión y expiración              |
| accept_quote        | Propietario/vínculo, vigencia, importe congelado y evidencia de aceptación |
| hold_appointment    | Aprobación, disponibilidad, ruta, exclusión de horario y vencimiento       |
| confirm_appointment | Retención válida y política de pago satisfecha; no volver a cobrar         |
| apply_payment_event | Firma verificada antes de entrar, deduplicación, saldo y outbox            |
| complete_encounter  | Firma, cierre de cita, seguimiento +24 h y trabajo único                   |
| request_refund      | Límite disponible, importe reservado, idempotencia y evento                |
| revoke_access       | Rol/vínculo, fecha de revocación y auditoría                               |

No efectuar llamadas externas dentro de una transacción con locks.
Primero consultar proveedor, luego validar vigencia y escribir; si cambió el recurso,
rechazar o recalcular. Los eventos externos se reintentan de manera idempotente.

## Consultas e índices previstos

- service_requests(patient_id, created_at DESC) para el paciente.
- service_requests(status, created_at) para coordinación.
- request_assignments(professional_id, request_id) con filtro revoked_at IS NULL.
- role_assignments(profile_id, role) con filtro revoked_at IS NULL.
- caregiver_links(caregiver_id, patient_id) con filtro revoked_at IS NULL.
- appointments(professional_id, starts_at), además del GiST de exclusión.
- clinical_encounters(appointment_id) UNIQUE y vital_signs(encounter_id, measured_at).
- follow_ups(status, due_at) y outbox_jobs(status, available_at).
- audit_events(entity_type, entity_id, occurred_at) para trazabilidad.
- Claves únicas de eventos, referencias de pago e idempotencia de cada proveedor.

Agregar índices de FK usados por RLS y verificar planes con datos representativos.
No duplicar índices ya creados por UNIQUE/PK. Paginar por clave y fecha en listados largos.
No agregar un índice GPS ni suscripciones Realtime a todo el expediente sin una consulta
que lo justifique. La selección por cercanía podrá evaluarse con PostGIS más adelante.

## Pruebas de aceptación

### Integridad

- Reconstruir una base vacía con todas las migraciones, y repetir sin cambios de esquema.
- Rechazar FK inexistentes y vínculos entre solicitud, cita o receta de pacientes diferentes.
- Impedir dos perfiles de aplicación para el mismo auth_user_id.
- Distinguir paciente sin cuenta, cuidador y solicitante.
- Rechazar coordenadas incompletas y fuera de rango; aceptar cero.
- Mantener historial al desvincular una cuenta de Auth.
- No aceptar respuestas incompletas como ausencia de síntomas o antecedentes.

### Permisos

Usar sesiones reales de prueba: anónimo, dos pacientes, cuidador con y sin alcance,
administrador operativo, revisor asignado/no asignado, terapeuta y finanzas.
No limitar las pruebas al propietario de la base ni a service_role.

- Paciente A no lee/modifica datos ni archivos de B por tabla, RPC o URL.
- Cambiar patient_id, owner_profile_id o metadata del usuario no aumenta privilegios.
- Administrador operativo no consulta recetas, signos o notas privadas.
- Terapeuta no asignado o suspendido no firma ni consulta casos ajenos.
- Paciente no altera roles, precios, estados de pago ni decisiones clínicas.
- Cuidador revocado o vencido pierde acceso con una sesión todavía abierta.
- No hay fuga por vistas, conteos globales, búsquedas, errores o Storage.
- Lectura clínica autorizada produce auditoría; lectura directa está denegada.

### Concurrencia y dinero

- Dos conexiones intentan reservar el mismo profesional: solo una confirma la retención.
- Intervalos adyacentes se admiten; solapamientos de traslado también se rechazan.
- Una retención vencida se libera aunque el worker esté retrasado.
- Reprogramación fallida no pierde la reserva anterior.
- La misma cotización aceptada no financia dos citas activas.
- Límites de traslado: 5000, 5000.1, 10000, 10000.1 y 25000 metros.
- 8 km y 15 min de demora: traslado $4.50 con la tarifa de prueba.
- Ruta sin tráfico válido, simulada o fuera de cobertura no produce cotización cobrable.
- Cambiar tarifas o tráfico no modifica una oferta ya aceptada.
- Evento de pago repetido o fuera de orden no duplica dinero ni revierte confirmación.
- Dos devoluciones concurrentes nunca exceden el saldo disponible.
- Pago tardío no recupera un horario ocupado.
- Error de DTE no crea otro pago.

### Clínica y recuperación

- No reservar una terapia sin la evaluación y los requisitos aplicables.
- No sobrescribir encuentro ni signos firmados; adenda conserva autor y motivo.
- Completar visita dos veces crea un único seguimiento inicial y trabajo lógico.
- Worker interrumpido recupera lease; reintento no duplica mensaje lógico.
- Restaurar respaldo en ambiente aislado y comprobar relaciones y archivos.
- Probar carga representativa con índices y EXPLAIN; evitar consultas de expediente sin paginar.

## Datos iniciales y cierre

Semillas deterministas, totalmente ficticias, sin credenciales reales.
Tarifas, competencias y protocolos sin aprobación permanecen draft/pending.
No migrar automáticamente los datos React de una sesión de demostración.

Generar tipos TypeScript desde la base aplicada y reemplazar gradualmente DemoProvider
por repositorios autenticados de cada módulo. No volcar un estado global con todos los pacientes.

Antes de desplegar: entregar SQL y diff, resultados de pruebas, plan de recuperación,
ambiente de destino y efectos sobre datos existentes.
Registrar por separado lo diseñado, lo probado localmente y lo aplicado remotamente.
