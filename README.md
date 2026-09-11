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

## Recorrido de demostración

1. Elegir un servicio desde Inicio o entrar en Solicitar atención.
2. Responder con datos ficticios y una receta ficticia si se elige «Sí».
3. Completar ubicación, distancia simulada, servicio y horario de preferencia.
4. Crear la solicitud y abrir Mis solicitudes.
5. Abrir Panel del equipo, revisar el detalle y simular una revisión profesional.
6. Simular la visita, completar el registro y responder el seguimiento desde Mis solicitudes.

Los cambios viven exclusivamente en memoria. Se comparten entre rutas durante la sesión
y se eliminan al recargar. No se envían archivos, mensajes ni pagos.
Las vistas del paciente y equipo son demostrativas y no tienen autenticación.
No introducir datos de pacientes reales.

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

Pendientes: autenticación, PostgreSQL/Supabase, protocolos clínicos aprobados, mapa real,
agenda transaccional, cobros, DTE, notificaciones, permisos y auditoría de producción.
La instalación PWA y el comportamiento sin conexión se implementarán en una etapa posterior.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Plan vigente: inicio gratuito y escalamiento](docs/despliegue-gratuito.md)
- [Comparación de despliegue pagado y costos](docs/despliegue.md)
- [Modelo de datos y estados](docs/datos-y-estados.md)
- [Instrucciones de construcción de la base de datos](docs/base-de-datos/README.md)
- [Plan de implementación](docs/plan.md)

TypeScript estricto, módulos por área y formato de 100 caracteres como objetivo.
CSS propio para este prototipo: evita añadir configuración de Tailwind antes de necesitarla.

## Calculadora de traslado

Disponible en `/equipo/traslado` desde el panel del equipo. Incluye ambos puntos GPS,
fecha de visita, salida estimada, desglose por distancia y demora. Funciona en modo
simulado sin credenciales; el adaptador de Google Routes requiere acceso de servidor.

Ver [fórmula, configuración y límites](docs/calculo-traslado.md).
