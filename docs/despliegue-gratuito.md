# Despliegue gratuito y escalamiento de Pulmocare

Fecha de revisión: 7 de septiembre de 2026.
Estado: plan inicial vigente; no se han creado cuentas ni desplegado recursos.

## Decisión

Comenzar con Render Free para Next.js y Supabase Free para PostgreSQL, Auth y Storage.
Esta decisión sustituye el inicio con Vercel Pro y Supabase Pro del análisis anterior.
El objetivo de esta etapa es desarrollar y demostrar la aplicación con datos ficticios.

| Componente                                 | Servicio inicial                   | Base mensual |
| ------------------------------------------ | ---------------------------------- | ------------ |
| Web de pacientes, administración y equipo  | Un servicio Next.js en Render Free | $0           |
| Backend HTTP                               | Rutas API del mismo servicio       | Incluido     |
| Base de datos, cuentas y archivos privados | Supabase Free                      | $0           |
| Desarrollo y pruebas                       | Entorno local                      | $0           |

Costo de infraestructura inicial: $0 dentro de las cuotas disponibles.
Usar la dirección del proveedor al publicar la demo; el dominio propio queda para después.
La separación de interfaces se mantiene. Al implementar cuentas, cada operación debe
validar permisos en servidor y en la base de datos.

## Límites que debemos aceptar

Render Free se suspende después de 15 minutos sin tráfico y tarda aproximadamente un minuto
al reactivarse. Incluye 750 horas por workspace al mes; también limita transferencia y builds.
El disco es efímero. Su documentación lo destina a pruebas, no a producción.
La base PostgreSQL gratuita de Render vence a los 30 días; elegimos Supabase para la base.
Sin medio de pago, agotar ciertas cuotas puede suspender servicios o builds; con facturación
habilitada puede haber cargos adicionales. Revisar límites de gasto antes de activarla.
[Condiciones de Render Free](https://render.com/docs/free).

Supabase Free incluye 500 MB de base, 1 GB de archivos, 5 GB de transferencia y otros
5 GB de transferencia con caché. Permite dos proyectos activos, puede pausarse después de
una semana de inactividad y no incluye respaldos automáticos.
[Planes de Supabase](https://supabase.com/pricing).

No convertir cuotas de usuarios registrados en una promesa de pacientes concurrentes:
medir consultas, archivos, memoria, solicitudes y tiempos de respuesta de Pulmocare.
La capacidad de compilación y ejecución en Render Free aún debe probarse con un despliegue.

## Funciones de la primera etapa

- Mantener calculadora de traslado en modo simulado, identificada como tal.
- Implementar las migraciones y permisos de [base de datos](base-de-datos/README.md).
- Probar autenticación y recetas ficticias con almacenamiento privado.
- Mantener pagos, facturación y mensajes en simulación mientras no se integren proveedores.
- Probar el seguimiento con trabajos persistidos y ejecución controlada durante desarrollo.

La geolocalización del navegador aporta coordenadas con consentimiento; no aporta tráfico.
La congestión real requiere el proveedor de rutas y su presupuesto independiente.
Google Routes, WhatsApp, SMS, correo transaccional, dominio y comisiones de pago no se
consideran incluidos en los $0. Su activación tendrá cuotas y costos revisados por separado.

El prototipo actual usa memoria y no tiene autenticación. Publicarlo no conecta Supabase
ni habilita automáticamente persistencia, permisos, pagos o seguimiento real.

## Preparación pendiente para publicar la demo

1. Implementar y comprobar las migraciones localmente; usar datos ficticios reproducibles.
2. Preparar repositorio y cuentas bajo control de la organización.
3. Crear Supabase Free y aplicar migraciones, RLS y buckets privados cuando se configure.
4. Conectar sesiones y persistencia; mantener credenciales privilegiadas solo en servidor.
5. Configurar Render como servicio web Node.js, con build de Next.js y Node.js 24.
6. Adaptar el arranque a 0.0.0.0 y al puerto PORT: hoy npm start escucha en 127.0.0.1.
7. Comprobar inicio, memoria, API, acceso por roles y recuperación después de una suspensión.
8. Medir latencia desde El Salvador y revisar consumo después de cada sesión de pruebas.

Elegir regiones cercanas entre aplicación y base al crearlas; verificar su disponibilidad.
La selección previa de Vercel iad1 no configura ni determina la región de Render.
Esta lista es trabajo pendiente, no una declaración de despliegue completado.

## Cuándo escalar

| Etapa                       | Configuración de referencia    | Base mensual |
| --------------------------- | ------------------------------ | ------------ |
| Desarrollo y demostración   | Render Free + Supabase Free    | $0           |
| Demo con servidor continuo  | Render Starter + Supabase Free | Desde $7     |
| Piloto operativo preparado  | Render Starter + Supabase Pro  | Desde $32    |
| Mayor memoria de aplicación | Render Standard + Supabase Pro | Desde $50    |

Render publica Starter a $7 y Standard a $25 mensuales por instancia.
Supabase Pro parte de $25 por mes con el primer proyecto incluido.
[Instancias de Render](https://render.com/articles/render-vs-railway),
[Supabase Pro](https://supabase.com/pricing).

Estas sumas no incluyen excedentes, impuestos, integraciones, workers ni proyectos extra.
Starter tiene 512 MB: su suficiencia debe medirse, no está garantizada.
Cambiar de plan conserva la arquitectura; no exige reescribir las pantallas ni el modelo SQL.

Revisar el escalamiento por necesidad operativa, incluso con pocos usuarios:

- Servidor continuo antes de depender de webhooks de pagos y seguimiento automatizado.
- Respaldos y restauración verificados antes de almacenar expedientes reales.
- Revisar capacidad al aproximarse al 80 % de una cuota; es un umbral interno propuesto.
- Aumentar recursos cuando las mediciones muestren falta de memoria o tiempos inaceptables.

Pagar un plan no completa los pendientes clínicos y técnicos del [plan](plan.md).
Los respaldos SQL no incluyen los archivos de Storage: planificar también su copia.
[Alcance de los respaldos](https://supabase.com/docs/guides/platform/backups).

## Otras opciones

Vercel Hobby restringe su uso a proyectos personales no comerciales, por lo que no es
la base gratuita elegida para Pulmocare.
[Condiciones de Hobby](https://vercel.com/docs/plans/hobby).

Cloudflare Workers es una alternativa que requiere adaptar y verificar el despliegue de
Next.js en su entorno. Su guía actual recomienda vinext. No se ha validado Pulmocare allí;
para esta etapa se prioriza ejecutar el servidor Next.js existente con menos cambios.
[Next.js en Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).

El [análisis de planes pagados](despliegue.md) queda como referencia para etapas posteriores.
No es necesario cambiar de proveedor al comenzar a pagar si Render cubre las mediciones.
