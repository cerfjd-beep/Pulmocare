# Accesos de Pulmocare

La aplicación usa Supabase Auth con correo y contraseña. Las contraseñas no se guardan en las tablas de Pulmocare. El registro público no concede permisos administrativos.

## Activación en Supabase

1. Si todavía no existen las tablas, ejecuta `supabase/install/pulmocare-inicial.sql` en SQL Editor como `postgres`. Si ya instalaste las primeras 25 migraciones, ejecuta únicamente `supabase/install/04-actualizar-perfiles.sql`. Si ya está aplicada la migración 26, continúa al siguiente paso. Ambos archivos rechazan instalaciones repetidas sin borrar datos.
2. En Authentication, habilita el proveedor Email y la confirmación de correo. Configura Site URL con la dirección HTTPS de producción de Vercel. Configura SMTP para enviar confirmaciones a los usuarios de producción. Conserva la plantilla estándar de confirmación; después de confirmar el correo, el usuario vuelve a `/ingresar` e inicia sesión con su contraseña.
3. En Vercel conserva `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` del mismo proyecto. No se necesita una clave secreta en el navegador. Despliega el commit que incluye estos cambios.
4. Crea la cuenta `13.guzman@gmail.com` en Authentication o en `/ingresar` y confirma el correo. Ejecuta `supabase/install/05-primer-administrador.sql` como `postgres`: crea directamente el perfil administrador sin exigir un perfil de paciente. Concede administración de accesos y operaciones; no concede acceso clínico general. Puede repetirse para la misma cuenta y rechaza inicializar otra si ya hay un administrador de accesos.
5. Vuelve a `/cuenta`: aparecerá Administradores. Desde `/admin` puedes revisar y aprobar o suspender los prestadores después de verificar su identidad y registro profesional.

## Perfiles

### Fotos del título y carnet

En una instalación existente con las migraciones 1–26, ejecutar
`supabase/install/06-documentos-terapeutas.sql` en SQL Editor como `postgres` y desplegar la aplicación.
El instalador inicial generado ya incluye esta migración para bases nuevas.

Después de solicitar autorización, el terapeuta carga en `/cuenta` una foto del título y una
del carnet profesional: JPG o PNG, máximo 3 MB cada una. Puede cargar por separado y reintentar
si falla una foto. Mientras esté pendiente puede enviar una nueva versión; se conserva el historial.
El administrador de accesos encuentra los enlaces en `/admin`. Las fotos son privadas; la política
de Storage permite leerlas únicamente al titular activo y al administrador de accesos.
Los enlaces requieren sesión y la ruta de lectura registra la consulta, entrega el archivo como
adjunto y desactiva la caché. No se marcan como escaneadas ni verificadas automáticamente.
La base de datos exige ambos archivos presentes en Storage antes de aprobar, incluso al llamar
directamente a `review_provider`. La revisión de autenticidad y vigencia sigue siendo manual.

Referencia: [control de acceso de Supabase Storage](https://supabase.com/docs/guides/storage/security/access-control).

| Perfil                         | Espacio      | Acceso                                                                        |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------- |
| Paciente o cuidador autorizado | `/mis-citas` | Solicitudes y citas permitidas por RLS                                        |
| Prestador                      | `/equipo`    | Estado de acreditación y asignaciones propias; sin datos clínicos compartidos |
| Administrador                  | `/admin`     | Operaciones, accesos o facturación según los roles asignados                  |

El usuario crea una cuenta común después de confirmar el correo. Elegir prestador envía una solicitud pendiente, sin acceso al espacio profesional ni roles clínicos. Su estado se consulta en `/cuenta`. El administrador de accesos debe comprobar identidad, título y autorización profesional vigente con la entidad emisora antes de aprobar; el formulario exige confirmar esa revisión y la acción de servidor la valida. La plataforma no consulta automáticamente registros profesionales ni acredita por sí sola los documentos. La aprobación administrativa queda auditada en la base de datos. Solo un profesional verificado con un rol clínico activo puede entrar a `/equipo`; las competencias y la asignación de pacientes conservan sus controles existentes. Editar los metadatos de Supabase Auth no concede permisos. La suspensión bloquea el espacio profesional y las asignaciones y no puede revertirse repitiendo el registro.

Las páginas y acciones verifican identidad y permisos en el servidor; la base de datos vuelve a comprobarlos en cada consulta. Las cuentas desactivadas no pueden utilizar los espacios protegidos. Una cuenta con varios perfiles puede elegir su espacio en `/cuenta`. Cerrar sesión elimina la sesión local.

## Alcance y comprobación

### Error al consultar perfiles después de ingresar

Se reprodujo en el proyecto remoto `get_my_access()` con una cuenta temporal:
`42501: permission denied for schema auth`. La contraseña y la sesión funcionan;
el ejecutor de las funciones no puede resolver la identidad de Supabase.

Ejecutar la versión corregida de `supabase/install/09-acceso-identidad.sql` como
`postgres`. El primer intento de conceder acceso a `auth` fue rechazado por el
proyecto remoto y revertido. La corrección lee el identificador de la sesión que
PostgREST ya verificó (`request.jwt.claims.sub`), dentro del esquema privado de
Pulmocare. Adapta cinco funciones conservando sus permisos y validaciones, sin
dar acceso a `auth.users` ni cambiar contraseñas o roles de personas. El archivo
muestra el estado y los roles de la cuenta administradora designada. Puede
repetirse. Después, recargar `/cuenta`.

Referencia: [contexto de la solicitud en PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html).

Si la cuenta aún no tiene perfil administrativo, revisar el resultado antes de
aplicar `05-primer-administrador.sql` según el procedimiento de activación.

Si ese archivo devuelve `Access administrator already initialized`, existe una
asignación administrativa previa y no corresponde repetir la inicialización.
Para la cuenta expresamente autorizada `13.guzman@gmail.com`, ejecutar
`supabase/install/10-habilitar-administrador.sql` como `postgres`. Exige correo
confirmado y perfil activo; añade `access_admin` y `operations_admin`, registra
la asignación y conserva tanto los administradores existentes como el rol de
paciente. Una segunda ejecución no duplica roles ni eventos de auditoría.

### Recuperación de contraseña

El enlace «Olvidé mi contraseña» abre `/recuperar`. El usuario solicita su correo;
Supabase verifica el enlace con PKCE en `/auth/recovery` y permite elegir la nueva
contraseña en `/nueva-clave`. Debe abrir el correo en el navegador donde lo solicitó.
Al guardar se cierran las sesiones y se vuelve a ingresar.

Configurar en Authentication → URL Configuration:

- Site URL: `https://pulmocare-alpha.vercel.app`
- Redirect URLs: añadir `https://pulmocare-alpha.vercel.app/auth/recovery`

Con `SUPABASE_ACCESS_TOKEN` disponible localmente, `node scripts/configure-supabase-auth.mjs`
aplica estos dos ajustes y conserva las demás redirecciones autorizadas. El token de
administración no se incluye en Vercel ni en el repositorio.

Se comprobó el acceso y cambio de contraseña en producción con cuentas temporales
eliminadas después de probar; se rechazaron solicitudes anónimas, de otro origen,
contraseñas no coincidentes y enlaces inválidos. El envío y apertura del correo
siguen pendientes de verificar con la configuración de redirección corregida.

Los paneles muestran registros reales o estados vacíos. El formulario `/solicitar` sigue siendo una demostración: no crea solicitudes clínicas reales. La interfaz de facturación y la captura de encuentros clínicos no forman parte de esta implementación de acceso.

Comprobar en producción con cuentas de prueba: registro y confirmación por correo, acceso como paciente, prestador pendiente, aprobación desde un administrador, suspensión, intento de abrir `/admin` como paciente y cierre de sesión. La prueba local PostgreSQL simula los contratos de Auth/Storage; no sustituye la prueba de envío de correo ni de cookies en el dominio de Vercel.

Referencias: [Supabase: acceso con contraseña](https://supabase.com/docs/guides/auth/passwords), [Next.js: autenticación y autorización](https://nextjs.org/docs/app/guides/authentication).
