# Modelo de datos y estados de producción

Diseño conceptual. No hay base de datos desplegada ni migraciones aplicadas.

La especificación detallada para implementar está en
[Instrucciones de construcción](base-de-datos/README.md).
Usar su diccionario para los nombres finales, tipos, permisos y orden de migraciones.

## Entidades

| Entidad                     | Campos y relaciones principales                                       |
| --------------------------- | --------------------------------------------------------------------- |
| users / roles               | Identidad del proveedor, roles y estado                               |
| patients                    | Usuario opcional, nombre, nacimiento, sexo, teléfono, correo          |
| caregiver_links             | Cuidador, paciente, alcance, autorización y revocación                |
| consents                    | Paciente, finalidad, versión, fecha y evidencia                       |
| addresses                   | Paciente, departamento, municipio, dirección, GPS, referencias        |
| service_requests            | Paciente, motivo, solicitante, estado y fecha                         |
| assessments                 | Solicitud, respuestas, protocolo, resultado, revisor y decisión       |
| prescriptions               | Solicitud, archivo privado, fecha, diagnóstico, indicación y revisión |
| services                    | Nombre, descripción, duración, competencias y estado                  |
| price_versions              | Servicio, precio en centavos, moneda y vigencia                       |
| professionals               | Usuario, especialidad, habilitación y estado                          |
| professional_skills         | Profesional, competencia y vigencia de acreditación                   |
| availability                | Profesional, intervalos, ausencias y zona                             |
| quotes / quote_items        | Solicitud, precios congelados, traslado, total, moneda y expiración   |
| appointments                | Solicitud, profesional, inicio, fin, traslado, estado y retención     |
| payments                    | Cita, proveedor, referencia única, método, importe y estado           |
| refunds                     | Pago, importe, motivo, referencia y estado                            |
| fiscal_documents            | Pago/venta, tipo DTE, identificador, sello y estado                   |
| clinical_encounters         | Cita, profesional, procedimiento, evolución y recomendaciones         |
| vital_signs                 | Encuentro, instante, tipo, valor y unidad                             |
| clinical_amendments         | Registro original, corrección, motivo, autor y fecha                  |
| follow_ups                  | Encuentro, vencimiento, respuestas, alerta y responsable              |
| outbox_jobs                 | Evento, clave idempotente, intentos, disponibilidad y estado          |
| notifications               | Destinatario, canal, plantilla, consentimiento y entrega              |
| audit_events                | Actor, acción, objeto, fecha y contexto mínimo                        |
| companies / business_quotes | Empresa, contacto, necesidad, alcance, precio y estado                |

Relaciones: paciente 1:N solicitudes; solicitud 1:N evaluaciones, recetas y cotizaciones;
solicitud 1:N citas; cita 1:N pagos e incidencias; cita 1:1 encuentro completado;
encuentro 1:N signos, correcciones y seguimientos.
Separar las cuentas del solicitante de la identidad del paciente.

## Estados separados

Solicitud:
borrador → enviada → revisión → aprobada / valoración médica previa / derivada / cancelada.

Una derivación urgente bloquea la contratación ordinaria y no espera pago ni registro.
La aprobación registra profesional, fecha, justificación y versión de protocolo.

Cita:
preferencia → retención temporal → confirmada → en atención → completada.
Alternativas: expirada, cancelada, reprogramada, no atendida.

Pago:
pendiente → procesando → pagado / fallido / expirado.
Después del pago: reembolso parcial / reembolsado.
Contra entrega y crédito empresarial pueden permitir confirmación con saldo pendiente
según una política comercial explícita.

DTE:
pendiente → enviado → aceptado / rechazado → reintento o corrección.
El error de facturación no debe cobrar nuevamente.

## Invariantes

- Solo un profesional habilitado y autorizado aprueba la aplicabilidad clínica.
- Restricción de solapamiento en PostgreSQL, incluyendo preparación y desplazamiento.
- Retención de horario con expiración, creación atómica y resolución de concurrencia.
- Recalcular cotizaciones en servidor; nunca confiar en importes del navegador.
- Identificador único de evento de pago y webhook autenticado.
- Pago recibido después de expirar el horario: conciliación y devolución o reubicación explícita.
- Un reintento no crea otra cita, otro cobro ni otra notificación.
- Fecha de nacimiento; edad calculada. Instantes UTC y presentación America/El_Salvador.
- Total cotizado preservado; cambios de catálogo no alteran ventas anteriores.
- Finalizar encuentro y crear evento de seguimiento en una misma transacción.
- Correcciones de expediente por adendas, sin sobrescribir silenciosamente la nota original.

## Tarifas del prototipo

Precios suministrados por el solicitante, sin validación comercial:
nebulización $15; aspiración $20; fisioterapia $25; rehabilitación $30;
educación $20; evaluación $25.

Traslado: 0–5 km $0; más de 5 hasta 10 km $3; más de 10 hasta 25 km $5.
El límite de 25 km es exclusivamente demostrativo. Definir base, cobertura real,
distancia por ruta, impuestos, cancelaciones y vigencia antes del lanzamiento.
