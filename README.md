# Pulmocare

Prototipo navegable de una plataforma de terapia respiratoria domiciliaria.

## Ejecutar

Requiere Node.js 24 para ejecutar también las pruebas TypeScript sin compilación previa. En PowerShell se usa `npm.cmd` para evitar
restricciones de ejecución del archivo npm.ps1.

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir http://127.0.0.1:3000. Para producción local: `npm.cmd run build` y `npm.cmd start`.

## Inicio de sesión y perfiles

En `/ingresar` puedes crear una cuenta con correo y contraseña. Tras confirmar el correo,
completa tu perfil en `/cuenta`. Los pacientes acceden a `/mis-citas`, los prestadores a
`/equipo` y los administradores autorizados a `/admin`. La navegación y las consultas respetan
los permisos guardados en Supabase. Ver [activación de perfiles y primer administrador](docs/accesos.md).

## Formulario de demostración

1. Elegir un servicio desde Inicio o entrar en Solicitar atención.
2. Responder con datos ficticios y una receta ficticia si se elige «Sí».
3. Completar ubicación, distancia simulada, servicio y horario de preferencia.
4. Completar la simulación. Esta solicitud no se guarda en la base de datos ni aparece en los paneles reales.

Los cambios viven exclusivamente en memoria. Se comparten entre rutas durante la sesión
y se eliminan al recargar. No se envían archivos, mensajes ni pagos.
El formulario requiere una cuenta de paciente; los paneles autenticados muestran datos reales o estados vacíos.
No introducir datos de pacientes reales.

El catálogo de inicio puede leerse desde Supabase con las variables públicas de `.env.example`.
El formulario de solicitud sigue en modo demostración. Ver
[conexión e instalación de Supabase](supabase/README.md) para crear las tablas y configurar Vercel.

## Validación

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run format:check
npm.cmd run build
```

## Alcance

Incluye inicio, seis servicios, cuestionario, bloqueo demostrativo ante señales de alarma,
selección local de archivo, ubicación manual, cotización, horarios ficticios, bandeja del
equipo, registro de visita, seguimiento y formulario empresarial de ejemplo.

Pendientes: activar y verificar la configuración remota, conectar el formulario clínico real,
protocolos clínicos aprobados, cobros, DTE y notificaciones de producción.
La instalación PWA y el comportamiento sin conexión se implementarán en una etapa posterior.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Plan vigente: inicio gratuito y escalamiento](docs/despliegue-gratuito.md)
- [Comparación de despliegue pagado y costos](docs/despliegue.md)
- [Modelo de datos y estados](docs/datos-y-estados.md)
- [Instrucciones de construcción de la base de datos](docs/base-de-datos/README.md)
- [Migraciones e instalación en Supabase](supabase/README.md)
- [Plan de implementación](docs/plan.md)

TypeScript estricto, módulos por área y formato de 100 caracteres como objetivo.
CSS propio para este prototipo: evita añadir configuración de Tailwind antes de necesitarla.

## Calculadora de traslado

Disponible en `/equipo/traslado` desde el panel del equipo. Incluye ambos puntos GPS,
fecha de visita, salida estimada, desglose por distancia y demora. Funciona en modo
simulado sin credenciales; el adaptador de Google Routes requiere acceso de servidor.

Ver [fórmula, configuración y límites](docs/calculo-traslado.md).
