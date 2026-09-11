# Arquitectura de Pulmocare

Estado: propuesta aceptada; implementación actual limitada al prototipo local.
Supuestos: El Salvador, USD, atención domiciliaria y responsable clínico por confirmar.

## Decisiones

- PWA como objetivo: una interfaz adaptable, accesible desde web y posteriormente instalable.
- Next.js App Router y TypeScript estricto; páginas públicas renderizadas en servidor.
- Interactividad solo en componentes que la necesitan.
- Monolito modular: una aplicación principal, módulos por dominio y PostgreSQL.
- Supabase como propuesta para identidad, datos y archivos; todavía no provisionado.
- CSS propio en el prototipo. Revisar Tailwind al consolidar el sistema de componentes.
- Proveedores externos detrás de adaptadores; ninguna dependencia comercial contratada.
- El prototipo usa memoria de React; no cookies clínicas, localStorage ni archivos persistidos.

## Módulos actuales

| Carpeta           | Responsabilidad               |
| ----------------- | ----------------------------- |
| app               | Páginas y estilos             |
| components        | Estructura visual compartida  |
| modules/services  | Catálogo e importes           |
| modules/intake    | Cuestionario y solicitud      |
| modules/demo      | Estado ficticio compartido    |
| modules/clinical  | Revisión y registro de visita |
| modules/follow-up | Solicitudes y seguimiento     |
| modules/business  | Solicitud empresarial         |

El proveedor de demostración será reemplazado por operaciones autenticadas del servidor.
No reutilizar sus controles de rol como seguridad real.

## Evaluación clínica

La solicitud no equivale a diagnóstico, autorización ni cita confirmada.
La receta no omite la comprobación inicial de señales de alarma.
El prototipo bloquea dificultad intensa declarada o dolor torácico y muestra orientación urgente.
Este mecanismo demuestra un flujo; no es un algoritmo de triaje validado ni exhaustivo.

Sin receta: valoración médica previa. Con receta: revisión profesional.
Traqueostomía y ventilación mecánica: revisión especializada.
Nunca convertir respuestas incompletas en aprobación.
Antes del piloto, un responsable clínico debe aprobar preguntas, umbrales, derivaciones,
contraindicaciones, alcance por servicio y mensajes. Guardar la versión de cada protocolo.
OCR futuro puede proponer campos, pero no validar autenticidad o pertinencia clínica.

## Seguridad de producción

- Autenticación, sesiones seguras y MFA para el equipo.
- Paciente: sus expedientes; cuidador: vínculo autorizado y revocable.
- Profesional: pacientes asignados; revisión clínica con permiso específico.
- Administración: operaciones; acceso clínico solo si cuenta con autorización adicional.
- Autorización en servidor y políticas RLS por registro, incluidas pruebas de denegación.
- Archivos privados, límites de tamaño y tipo, inspección de contenido y enlaces temporales.
- Cifrado en tránsito y reposo, secretos solo en servidor y registros sin datos clínicos.
- Auditoría de lectura y escritura, consentimiento versionado y correcciones clínicas trazables.
- Definir retención, eliminación, copias de seguridad y restauración conforme al contexto local.
- No almacenar tarjetas: usar checkout alojado por proveedor.
- No incluir diagnósticos ni recetas en WhatsApp, SMS o correos de recordatorio.
- No almacenar expedientes en caché del service worker.

## Recursos y operaciones

Carga diferida de mapas, paginación de expedientes e índices por paciente, fecha y estado.
Importes enteros en centavos; cotizaciones inmutables con versión de tarifa.
Notificaciones en una cola persistente, con reintentos, idempotencia y registro de fallos.
Seguimiento programado desde la finalización efectiva de la visita, no desde su reserva.
Revisar respuestas preocupantes mediante bandeja clínica y responsable asignado.
Monitorear errores, tiempos de respuesta y retrasos de tareas sin exponer información sensible.

## Referencias consultadas

- https://nextjs.org/docs/app/getting-started/installation
- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage
- https://medlineplus.gov/ency/article/003075.htm
- https://factura.gob.sv/wp-content/uploads/2021/11/FESVDGIIMH_GuiaIntegracionFacturaElectronicasSV.pdf

HealthCall y PathSync fueron mencionados como inspiración por el solicitante.
No se han verificado sus productos ni se depende de sus APIs.
