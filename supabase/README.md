# Base de datos de Pulmocare

Implementación inicial de la especificación de `docs/base-de-datos/`.
Una sola base PostgreSQL por ambiente; pacientes, equipo y administración se separan con
roles, permisos por fila (RLS) y funciones autorizadas. El esquema no cambia el prototipo visual.

## Estado

- 43 tablas de aplicación, más la configuración comercial privada.
- 25 migraciones ordenadas; seis servicios y tarifas provisionales en `draft`.
- Cuatro buckets privados: recetas, acreditaciones, adjuntos clínicos y soporte financiero.
- Operaciones transaccionales para identidad/roles, solicitudes, revisión, ofertas y aceptación,
  retenciones y confirmación, firma/seguimiento, pagos/devoluciones y trabajos pendientes.
- No hay pacientes reales, roles administrativos automáticos ni protocolos clínicos aprobados.
- El catálogo de inicio y `/api/catalog` consultan Supabase cuando se configuran las variables
  públicas. Los precios borrador se muestran como «Precio por confirmar».
- Las solicitudes, visitas y paneles de demostración siguen usando `DemoProvider`; esta conexión
  de catálogo no activa por sí sola la persistencia clínica ni una pantalla de inicio de sesión.

**No aplicado al proyecto remoto.** El proyecto indicado es `dnxwecpzjobtnclyywkz`.
Las claves de la aplicación de `.env.local` no conceden administración SQL. En esta sesión
no hay conexión PostgreSQL remota, token de administración ni navegador conectado.

Comprobación remota del 11 de septiembre de 2026: Auth respondió HTTP 200 con la clave pública;
la consulta de servicios respondió HTTP 404 / `PGRST205` (tabla no disponible en Data API).

## Conexión de la aplicación y Vercel

En `.env.local` para desarrollo y en **Vercel → Project → Settings → Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dnxwecpzjobtnclyywkz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

En Vercel elegir Production y los ambientes Preview que se utilizarán. Volver a desplegar tras
cambiar variables. No copiar la clave secret/service_role al navegador ni al repositorio.
La aplicación utiliza únicamente la clave pública y las políticas de Supabase para el catálogo.
Los clientes de servidor y navegador están tipados; el proxy renueva las cookies para las rutas
que posteriormente usarán sesiones. La autorización clínica sigue dependiendo de los roles SQL.

Sin configuración, el inicio conserva el catálogo demostrativo. Con configuración incompleta,
tabla ausente o fallo de red, no afirma estar conectado ni sustituye datos remotos por ficticios:
`/api/catalog` devuelve HTTP 503 y un estado acotado; no imprime claves ni errores internos.
Con las migraciones aplicadas, devuelve HTTP 200, `status: ready` y los seis servicios.

```powershell
node scripts/check-supabase.mjs
```

El diagnóstico consulta únicamente configuración pública de Auth y servicios; no imprime
valores de variables. No ejecuta SQL de administración ni consulta expedientes.

## Instalación con SQL Editor

1. Abrir el proyecto **Pulmocare** en Supabase y seleccionar **SQL Editor → New query**.
2. Ejecutar `install/01-comprobar-proyecto.sql`. Revisar la versión y que no existan tablas
   de aplicación, esquema `private` o instalaciones anteriores de Pulmocare. Si existen,
   conservarlos y comparar el esquema antes de continuar.
3. Copiar todo `install/pulmocare-inicial.sql` a una consulta nueva y ejecutar como `postgres`.
   El archivo ejecuta las migraciones en una transacción e incluye el historial compatible
   con Supabase CLI. Un error revierte toda la instalación. No elimina tablas ni datos.
4. Ejecutar `install/03-verificar-instalacion.sql`. En una base nueva se esperan 43 tablas
   protegidas, 25 migraciones, cuatro buckets privados, seis precios `draft`, una tarifa
   `draft` y cero administradores asignados. Las últimas dos consultas deben devolver cero filas.
5. Conservar el resultado de esta verificación para registrar la instalación remota.

El instalador inicial se detiene si detecta una instalación anterior; no usarlo para actualizar
una base ya instalada. Las siguientes versiones se aplican con nuevas migraciones y comparación
de historial, nunca con un reset remoto. El archivo generado es reproducible:

```powershell
npm.cmd run db:bundle
```

## Pruebas y tipos

Validación local del 11 de septiembre de 2026: las 25 migraciones se aplicaron en
PostgreSQL 17.10 y el instalador completo pasó 25 comprobaciones de permisos, integridad,
concurrencia e idempotencia. Una segunda ejecución del instalador rechazó correctamente
la instalación existente. Esto no acredita ejecución ni pruebas de API en el proyecto remoto.

```powershell
npm.cmd run test:db
node scripts/test-database.mjs --generate-types
node scripts/test-database.mjs --bundle
npm.cmd run typecheck
npm.cmd test
```

El ejecutor usa PostgreSQL 17.10 nativo, instalado como dependencia de desarrollo. Crea un
directorio temporal y un puerto de loopback nuevos en cada ejecución, con contraseña aleatoria,
y detiene el servidor al terminar. No lee `.env.local` ni admite una URL de base remota.
En Windows puede necesitar ejecutarse fuera de un entorno aislado que impida iniciar PostgreSQL.
No instala un servicio permanente ni requiere Docker.

Las pruebas usan conexiones independientes para concurrencia y `SET LOCAL ROLE` con identidades
distintas para permisos. Los contratos mínimos de `auth.uid()`, `auth.users` y Storage son
fixtures locales: no sustituyen pruebas de extremo a extremo contra Supabase Auth, PostgREST,
Storage, enlaces firmados y sesiones reales. Nunca ejecutar `tests/database/platform.sql` en Supabase.

`src/integrations/supabase/database.types.ts` se genera inspeccionando el catálogo de la base
local aplicada, con tablas, relaciones y RPC. No es una confirmación del esquema remoto.
Los tipos describen la estructura; los permisos SQL siguen limitando las escrituras y lecturas.

## Decisiones y límites de esta etapa

- `addresses.reference_notes` representa el campo de referencias del domicilio; evita el nombre
  reservado SQL `references`. Las citas conservan una copia de dirección y coordenadas.
- `prescriptions.patient_id` permite FK compuestas para impedir cruces de paciente.
- Se agregan `follow_up_responses` para revisiones inmutables, `clinical_amendments.vital_sign_id`
  para vincular correcciones, `quotes.tax_policy_version` y `fiscal_documents.issuer_identifier`.
- El cuestionario `intake-v1` usa `{state: "none" | "selected", items: []}`. Ausencia de respuesta
  no significa respuesta negativa. No incluye reglas clínicas ni aprobaciones automáticas.
- El servidor deberá reservar metadatos de documentos, analizar contenido y firmar descargas
  tras autorización auditada. Se permite únicamente la carga de objetos previamente reservados
  y autorizados; no hay listado ni descarga directa por el cliente.
- Las cotizaciones borrador se preparan por un servidor controlado o administración SQL.
  `offer_quote` valida esos registros; el cliente no puede insertar métricas marcándolas como reales.
- Ninguna política comercial se inicializa. Antes de ofertas/reservas reales deben aprobarse
  impuestos, duración de retención, pagos contra entrega, tarifas, protocolos y competencias.
- La agenda impide solapamientos incluso con dos conexiones. Para insertar antes de una visita
  futura se exige replantear su ruta; no se implementa aún la reprogramación coordinada de rutas.
  Cambios de disponibilidad con citas activas se rechazan para no invalidarlas silenciosamente.
- `apply_payment_event` y los workers solo son ejecutables por `service_role`; falta integrar
  la verificación de firmas del proveedor, entrega de notificaciones, liquidación de devoluciones
  y emisión fiscal. El SQL no llama proveedores ni considera un pago como reserva automática.
- Las operaciones de creación/edición de borradores y de publicación clínica requieren los
  adaptadores de servidor autenticados de la siguiente etapa. Las tablas no tienen permisos
  de escritura directa para el navegador.
- Restauración de PostgreSQL y Storage, carga representativa, políticas de retención y pruebas
  completas del API de Supabase están pendientes. No hay habilitación para atención real.

## Primer administrador y recuperación

Tras implementar el inicio de sesión y registrar un perfil, el responsable de acceso puede
ejecutar `private.bootstrap_access_admin(uuid_de_auth)` desde administración SQL. Exige un
perfil activo y se detiene si ya existe un `access_admin`. No toma roles de metadata del usuario,
no elige un correo fijo y no otorga acceso clínico o financiero por ser administrador de acceso.

Antes de modificar una base con datos, obtener un respaldo y documentar la restauración en un
ambiente aislado. Si falla el instalador inicial antes del `COMMIT`, la transacción se revierte.
Si ya se instaló, corregir con una migración nueva: no borrar el esquema para repetir el proceso.

Referencias: [migraciones Supabase](https://supabase.com/docs/guides/local-development/database-migrations),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[pruebas de base de datos](https://supabase.com/docs/guides/database/testing),
[PostgreSQL local de pruebas](https://github.com/leinelissen/embedded-postgres).
