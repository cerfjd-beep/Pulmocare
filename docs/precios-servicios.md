# Precios de servicios

Comprobación remota del 13 de septiembre de 2026: las funciones de cuentas,
paneles, documentos y precios están presentes; las operaciones restringidas
deniegan el acceso anónimo. El catálogo devuelve diez ofertas y la consulta del
descuento devuelve una configuración, ambas con HTTP 200. El sitio está publicado
en https://pulmocare-alpha.vercel.app; `/api/catalog` devuelve `ready` y el panel
de precios redirige a ingresar cuando no hay sesión. Esto comprueba disponibilidad
y protección anónima; no sustituye las pruebas con usuarios autenticados ni la
inspección SQL. `08-acceso-descuentos.sql` establece una política explícita para
el ejecutor y garantiza la configuración inicial sin sobrescribir descuentos.

Los administradores de operaciones y facturación pueden publicar precios desde
`/admin/precios`. Cada publicación crea una versión; los importes históricos se
conservan. La edición detecta cambios realizados por otro administrador.

El tratamiento de siete nebulizaciones se calcula como precio individual × 7 ×
(1 − descuento / 100). Los traslados se acuerdan por separado. Las etapas de
rehabilitación requieren definir su alcance antes de publicar una tarifa.

## Activación en una instalación existente

Ejecutar `supabase/install/07-precios-servicios.sql` como `postgres` en el editor
SQL del proyecto Supabase existente. El archivo aplica la migración 28 en una
transacción y no publica precios predeterminados. No ejecutar el instalador
inicial sobre una base existente.

Comprobar la activación con:

```powershell
node --env-file=.env.local scripts/check-service-pricing.mjs
```

Luego entrar como administrador y configurar precios, alcances y descuento.
Mientras falta la migración, el catálogo conserva compatibilidad con la versión
anterior y el panel de precios informa que requiere la actualización.

## Validación local

`npm run test:db -- --generate-types` aplica las migraciones en una base aislada,
regenera los tipos y prueba permisos, conservación del historial, conflictos de
edición y cálculo del tratamiento. `npm test`, `npm run typecheck`,
`npm run format:check` y `npm run build` validan la aplicación.
