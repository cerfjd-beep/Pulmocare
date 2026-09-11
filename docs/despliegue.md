# Análisis de despliegue de Pulmocare

Fecha de consulta: 7 de septiembre de 2026.
Estado: recomendación; no se han contratado servicios ni desplegado recursos.
Precios en USD, sujetos a cambios, impuestos y consumo. No representan una cotización cerrada.

## Decisión inicial actualizada

La preferencia vigente es comenzar gratis con Render Free y Supabase Free.
Consultar el [plan gratuito y escalamiento](despliegue-gratuito.md).
Las opciones pagadas de este documento se conservan como referencia futura.

## Recomendación anterior para operación pagada

Vercel Pro para el frontend y backend HTTP de Next.js.
Supabase Pro para PostgreSQL, Auth y Storage privado.
Para seguimiento, outbox persistente en PostgreSQL y un ejecutor periódico autenticado.
Agregar un worker dedicado cuando los trabajos necesiten ejecución continua o más capacidad.

La aplicación existente ya une páginas y rutas API con Next.js. No hay un backend Express,
NestJS u otro servicio independiente que sea necesario desplegar por separado.
Pacientes, administración y equipo clínico pueden vivir en un mismo proyecto web con
permisos de servidor; sus pantallas separadas no requieren tres servidores ni tres bases.

## Distribución propuesta

| Componente                  | Destino                                | Responsabilidad                                        |
| --------------------------- | -------------------------------------- | ------------------------------------------------------ |
| Frontend público y paciente | Vercel                                 | Sitio, solicitud, citas y seguimiento                  |
| Administración y clínica    | Mismo proyecto Vercel                  | /admin y /equipo con autenticación por rol             |
| Backend HTTP                | Funciones Node.js de Next.js en Vercel | Cotización, autorización, webhooks e integraciones     |
| Base relacional             | Supabase PostgreSQL                    | Solicitudes, agenda, clínica, cotizaciones y pagos     |
| Identidad                   | Supabase Auth                          | Cuentas, sesiones y MFA del personal                   |
| Documentos                  | Supabase Storage privado               | Recetas, acreditaciones y soporte financiero           |
| Trabajos pendientes         | Tabla outbox_jobs en PostgreSQL        | Persistencia, reintentos, deduplicación y vencimientos |
| Ejecutor inicial            | Supabase Cron + invocación autenticada | Procesar lotes pequeños de trabajos vencidos           |

Supabase Cron permite ejecutar funciones SQL y llamadas HTTP periódicas.
Propongo invocar un endpoint de procesamiento corto de Next.js para reutilizar TypeScript;
mantener operaciones externas fuera de las transacciones de reserva.
Guardar la credencial de invocación en un gestor de secretos, no como texto en migraciones.
[Cron](https://supabase.com/docs/guides/cron),
[programación y secretos](https://supabase.com/docs/guides/functions/schedule-functions).

El seguimiento «24 horas después» se guarda como due_at. El ejecutor consulta pendientes
periódicamente: no mantener una función dormida durante 24 horas.
Un horario programado no garantiza entrega exacta al segundo; registrar retrasos y fallos.

## Región inicial

Propongo Supabase East US / North Virginia (us-east-1) y backend Vercel iad1
(Washington D.C.). Ambas opciones están documentadas y permiten mantener aplicación
y base cerca entre sí.
[Regiones Supabase](https://supabase.com/docs/guides/platform/regions),
[región de funciones Vercel](https://vercel.com/docs/functions/configuring-functions/region).

Es una selección inicial razonada, no una medición de latencia desde El Salvador.
Medir p50/p95 de acceso, login, agenda y cotización con redes móviles locales antes del piloto.
Confirmar región exacta al crear el proyecto y requisitos de ubicación de datos de la organización.
La entrega global del contenido estático no significa que el expediente deba replicarse globalmente.
Cambiar región de base posteriormente requiere un plan de migración, no tratarlo como un ajuste trivial.

## Alternativas comparadas

| Alternativa                      | Base mensual de referencia                              | Ventaja para Pulmocare                                                         | Consideración                                                               |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Vercel Pro + Supabase Pro        | Desde $45                                               | Aprovecha directamente Next.js y los servicios de identidad/archivos previstos | Consumo adicional; trabajos persistentes fuera de memoria                   |
| Render web pagado + Supabase Pro | Desde $32 con instancia de $7; $50 con instancia de $25 | Proceso Node.js continuo y opción de workers separados                         | Dimensionar RAM, CPU y caché; confirmar cargos de workspace y transferencia |
| Railway Pro + Supabase Pro       | Desde $45, sujeto al consumo de Railway                 | Flexibilidad de servicios y despliegue Node.js                                 | $20 de Railway es mínimo con créditos, no tarifa ilimitada                  |

Son sumas de servicios de referencia, no ofertas equivalentes de capacidad o disponibilidad.
El mínimo Render de 512 MB no se considera validado para el tráfico o compilación de Pulmocare.
Los workers dedicados añaden su propio consumo/costo; no están incluidos como servicio extra.

Fuentes:
[Vercel](https://vercel.com/pricing),
[Supabase](https://supabase.com/pricing),
[Render, tarifas de instancias](https://render.com/articles/render-vs-railway),
[Render, compatibilidad Next.js](https://render.com/docs/deploy-nextjs-app),
[Railway](https://railway.com/pricing).

La valoración anterior de Vercel se basaba en su integración con Next.js.
Render sería la primera alternativa si se prioriza un proceso continuo con recursos fijos.
Railway sería útil si evolucionamos hacia varios servicios.
No migraría ahora a PostgreSQL de otro proveedor solo para unificar la factura:
habría que resolver también identidad, archivos y las integraciones Supabase previstas.
Un VPS propio añadiría administración de sistema, parches, respaldos y recuperación al equipo.

## Presupuesto de la alternativa Vercel Pro

- Vercel Pro: base $20/mes para un desarrollador.
- Supabase Pro: desde $25/mes; el crédito de cómputo cubre una instancia Micro.
- Base combinada: $45/mes, sin excedentes ni extras.
- Con segundo proyecto Micro para pruebas en la misma organización: aproximadamente $55/mes.
- Desarrolladores adicionales de Vercel pueden añadir costo; pacientes y terapeutas de la
  aplicación no son asientos de desarrollador de Vercel.

[Vercel](https://vercel.com/pricing),
[Supabase](https://supabase.com/pricing),
[cómputo y créditos](https://supabase.com/docs/guides/platform/manage-your-usage/compute).

No incluye dominio, correo transaccional, WhatsApp/SMS, Google Routes, comisiones de pago,
facturación electrónica, respaldos de objetos, monitoreo adicional ni trabajo de desarrollo.
El presupuesto real debe estimarse con visitas mensuales, cálculos de ruta por solicitud,
tamaño/cantidad de documentos, mensajes y concurrencia. No se dispone aún de esos volúmenes.
Configurar alertas y cuotas por proveedor; evitar un apagado automático no evaluado de la atención.

## Respaldo y recuperación

Supabase Pro incluye copias diarias con retención de siete días.
PITR tiene costo adicional desde $100/mes y requiere como mínimo cómputo Small.
Small ronda $15/mes, frente a $10 Micro; con el crédito de cómputo, Pro + Small
suma aproximadamente $30 antes de PITR.
[Planes](https://supabase.com/pricing),
[respaldos y requisitos PITR](https://supabase.com/docs/guides/platform/backups),
[cómputo](https://supabase.com/docs/guides/platform/manage-your-usage/compute).

Así, Vercel + Supabase Small + PITR parte de aproximadamente $150/mes,
o $160 al añadir un Micro de pruebas. Todavía excluye copias de archivos y otros consumos.
Con respaldo diario existe riesgo de perder cambios posteriores a la última copia.
Para operación clínica y pagos, definir pérdida de datos tolerable y tiempo de recuperación
antes de decidir si el respaldo diario es suficiente.

El respaldo de PostgreSQL no contiene los objetos de Storage; preparar copia de documentos
y ensayar la restauración de ambos.
[Limitación documentada](https://supabase.com/docs/guides/platform/backups).

Vercel Hobby se limita a uso personal no comercial: no lo usaría para la operación del negocio.
Supabase Free puede pausarse tras una semana de inactividad y no incluye respaldos automáticos;
reservarlo para pruebas ficticias que toleren esas condiciones.
[Hobby](https://vercel.com/docs/plans/hobby),
[Supabase Free](https://supabase.com/pricing).

## Ajustes concretos del proyecto antes del despliegue

1. Implementar la base y las migraciones de docs/base-de-datos, aún pendientes.
2. Reemplazar DemoProvider y el acceso por enlaces de demo con sesiones y permisos reales.
3. Mover el contador budget de /api/travel-quote a un límite persistente/compartido:
   hoy se reinicia con cada proceso y no coordina instancias.
4. Sustituir el código compartido de acceso a rutas por autorización del usuario del equipo.
5. Mantener Google Maps y credenciales privilegiadas solo en servidor; ninguna variable
   secreta con prefijo NEXT_PUBLIC_. Usar secretos independientes por ambiente.
6. Configurar Node.js 24 y región de funciones. El endpoint de rutas tiene maxDuration=40;
   verificar timeout de todo el recorrido y del cliente, no solo el límite de Vercel.
7. Subir recetas directamente a Storage mediante autorización temporal. No usar el disco
   local del servidor como almacenamiento clínico.
8. Para SQL directo desde funciones, usar el pooler adecuado y limitar conexiones;
   para Data API/RPC usar JWT del usuario con las políticas definidas.
9. Persistir outbox, idempotencia y reservas; no depender de setTimeout ni variables globales.
10. No cachear respuestas clínicas en CDN; evitar información sensible en logs.
11. Ejecutar pruebas de aislamiento, reserva concurrente, pago duplicado y restauración.
12. Para Render/Railway, adaptar el arranque: el script actual escucha en 127.0.0.1;
    el servicio publicado debe escuchar en 0.0.0.0 y en el puerto que asigne la plataforma.
    Vercel usa su integración Next.js, no ese proceso local de npm start.

[Node.js en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
[límites de funciones](https://vercel.com/docs/functions/limitations),
[conexiones Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Secuencia sugerida

1. Mantener desarrollo local mientras se construyen base y autenticación.
2. Preparar repositorio privado y ambientes de pruebas/producción con secretos distintos.
3. Desplegar pruebas con datos ficticios; las previews nunca usan la base de producción.
4. Medir latencia, consumo, límites y recuperación.
5. Confirmar presupuesto, región, política de respaldos y dominio de la organización.
6. Ejecutar migraciones revisadas y abrir un piloto controlado.
7. Añadir worker dedicado solo cuando el volumen o duración de trabajos lo justifique.

Las cuentas, dominio y facturación deben quedar bajo control de la organización.
Esta evaluación no autoriza contrataciones ni significa que la app esté lista para datos reales.
