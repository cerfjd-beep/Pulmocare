# Interfaces de Pulmocare

Requisito confirmado: interfaz para usuarios y página administrativa diferenciadas.
La identidad visual es compartida; la navegación y las responsabilidades son distintas.

## Pacientes y cuidadores

Rutas actuales: /, /solicitar y /mis-citas.
Incluyen servicios, solicitud, receta, ubicación, preferencias, estado y seguimiento.
El menú principal del paciente no incluye herramientas administrativas ni clínicas.

## Administración

Rutas actuales: /admin y /admin/traslados.
Incluyen resumen operativo, solicitudes, estados, catálogo de precios en consulta
y calculadora de traslados. Los importes estimados no se cuentan como ingresos cobrados.
Agenda real, asignaciones, edición de tarifas, facturas, pagos y usuarios se implementarán
en las siguientes etapas; no se simulan como funciones terminadas.

## Equipo clínico

Rutas actuales: /equipo y /equipo/traslado.
El equipo revisa la aplicabilidad y registra visitas y seguimiento.
La administración operativa no debe autorizar terapias por sí misma.
Se conserva la ruta de traslado anterior para no romper enlaces.

## Acceso y seguridad

Actualmente el enlace «Demo: administración» o «Demo: pacientes» permite recorrer
las vistas con datos ficticios. No representa inicio de sesión ni cambio de rol seguro.
El estado sigue compartido en memoria para observar una solicitud desde distintas vistas.

Antes de usar datos reales:

- Autenticar cada acceso y comprobar roles en servidor.
- Paciente: únicamente sus datos; cuidador: vínculo autorizado.
- Administrador: operaciones, tarifas, agenda y pagos según permisos.
- Profesional clínico: solicitudes y pacientes asignados.
- Restringir datos en API y PostgreSQL/RLS, no solo ocultarlos en pantalla.
- Sustituir el proveedor global de demo por consultas autorizadas por interfaz.
- Auditar accesos y cambios; impedir que el enlace entre vistas conceda privilegios.

Ocultar información clínica en el resumen administrativo actual es una decisión de
presentación. No es aislamiento de datos: el proveedor de demo es compartido.
