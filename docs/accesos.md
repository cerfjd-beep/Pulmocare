# Accesos de Pulmocare

La aplicación usa Supabase Auth con correo y contraseña. Las contraseñas no se guardan en las tablas de Pulmocare. El registro público no concede permisos administrativos.

## Activación en Supabase

1. Si todavía no existen las tablas, ejecuta `supabase/install/pulmocare-inicial.sql` en SQL Editor como `postgres`. Si ya instalaste las primeras 25 migraciones, ejecuta únicamente `supabase/install/04-actualizar-perfiles.sql`. Si ya está aplicada la migración 26, continúa al siguiente paso. Ambos archivos rechazan instalaciones repetidas sin borrar datos.
2. En Authentication, habilita el proveedor Email y la confirmación de correo. Configura Site URL con la dirección HTTPS de producción de Vercel. Configura SMTP para enviar confirmaciones a los usuarios de producción. Conserva la plantilla estándar de confirmación; después de confirmar el correo, el usuario vuelve a `/ingresar` e inicia sesión con su contraseña.
3. En Vercel conserva `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` del mismo proyecto. No se necesita una clave secreta en el navegador. Despliega el commit que incluye estos cambios.
4. Crea tu cuenta en `/ingresar`, confirma el correo e inicia sesión. En `/cuenta`, completa un perfil de paciente. Para el primer administrador, reemplaza `REEMPLAZAR_CORREO_ADMIN` en `supabase/install/05-primer-administrador.sql` por ese correo y ejecuta el archivo como `postgres`. Esto concede administración de accesos y operaciones; no concede acceso clínico general. El procedimiento rechaza un segundo administrador inicial.
5. Vuelve a `/cuenta`: aparecerá Administradores. Desde `/admin` puedes revisar y aprobar o suspender los prestadores después de verificar su identidad y registro profesional.

## Perfiles

| Perfil                         | Espacio      | Acceso                                                                        |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------- |
| Paciente o cuidador autorizado | `/mis-citas` | Solicitudes y citas permitidas por RLS                                        |
| Prestador                      | `/equipo`    | Estado de acreditación y asignaciones propias; sin datos clínicos compartidos |
| Administrador                  | `/admin`     | Operaciones, accesos o facturación según los roles asignados                  |

El usuario crea una cuenta común y completa su perfil después de confirmar el correo. Elegir prestador crea un registro pendiente, sin roles clínicos. Un administrador de accesos puede aprobarlo como terapeuta; las competencias y la asignación de pacientes conservan sus controles existentes. Editar los metadatos de Supabase Auth no concede permisos. La suspensión profesional impide consultar asignaciones y no puede revertirse repitiendo el registro.

Las páginas y acciones verifican identidad y permisos en el servidor; la base de datos vuelve a comprobarlos en cada consulta. Las cuentas desactivadas no pueden utilizar los espacios protegidos. Una cuenta con varios perfiles puede elegir su espacio en `/cuenta`. Cerrar sesión elimina la sesión local.

## Alcance y comprobación

Los paneles muestran registros reales o estados vacíos. El formulario `/solicitar` sigue siendo una demostración: no crea solicitudes clínicas reales. La interfaz de facturación y la captura de encuentros clínicos no forman parte de esta implementación de acceso.

Comprobar en producción con cuentas de prueba: registro y confirmación por correo, acceso como paciente, prestador pendiente, aprobación desde un administrador, suspensión, intento de abrir `/admin` como paciente y cierre de sesión. La prueba local PostgreSQL simula los contratos de Auth/Storage; no sustituye la prueba de envío de correo ni de cookies en el dominio de Vercel.

Referencias: [Supabase: acceso con contraseña](https://supabase.com/docs/guides/auth/passwords), [Next.js: autenticación y autorización](https://nextjs.org/docs/app/guides/authentication).
