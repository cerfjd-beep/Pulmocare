# Instrucción lista para la siguiente etapa

Usar el siguiente texto como encargo de implementación:

> Implementa la base de datos de Pulmocare en PostgreSQL/Supabase a partir de
> docs/base-de-datos/README.md y sus cinco documentos de especificación.
>
> Revisa las instrucciones del repositorio antes de editar. Mantén una sola base por ambiente
> para pacientes, administración y equipo clínico, con roles y políticas de acceso separados.
> Conserva los flujos de la aplicación y no conviertas datos ficticios en pacientes reales.
>
> Crea migraciones SQL pequeñas y reproducibles en supabase/migrations, sin aplicarlas
> a un ambiente remoto por el solo hecho de generarlas. Incluye tablas, FK, restricciones,
> índices, RLS, grants mínimos, archivos privados y funciones transaccionales.
>
> Implementa primero identidad/catálogo, después clínica, cotización y agenda, y finalmente
> finanzas, seguimiento y tareas. Respeta el orden de dependencias del plan de migraciones.
> No crees contraseñas propias ni concedas roles mediante metadata editable por el usuario.
>
> Mantén las decisiones clínicas separadas de la coordinación administrativa. El paciente
> solo accede a sus datos o a los autorizados por un vínculo de cuidador vigente.
>
> Conserva versiones de precios y protocolos. Guarda el contexto y desglose de la cotización
> de traslado aceptada: profesional, origen, destino, hora, proveedor, distancia, tiempos,
> tarifa y vencimiento. Los valores actuales de tráfico son provisionales.
>
> Evita reservas superpuestas mediante restricciones de base de datos. Pagos, reembolsos,
> webhooks y notificaciones deben ser idempotentes y tolerar concurrencia.
> No mantengas transacciones bloqueadas durante llamadas a servicios externos.
>
> Agrega semillas ficticias, pruebas SQL de permisos con distintas identidades, pruebas de
> concurrencia y tipos TypeScript generados. Ejecuta la validación en un ambiente local aislado.
> Si faltan herramientas o datos de negocio, completa lo independiente y señala exactamente
> qué queda sin verificar; no declares operativa una función solo por escribir su SQL.
>
> Entrega el resumen de migraciones, resultados de pruebas y pendientes de configuración.
> No cambies el diseño visual de la aplicación como parte de este encargo.

## Decisiones de negocio pendientes antes del piloto

- Identidad de la organización y responsable de acceso inicial.
- Región de alojamiento, retención, recuperación y condiciones de uso de datos de mapas.
- Responsable clínico y protocolos aprobados, incluyendo menores/cuidadores.
- Catálogo territorial y cobertura efectiva.
- Profesionales, acreditaciones y disponibilidad.
- Tarifas definitivas, impuestos, vigencia de ofertas, retenciones y política de cancelación.
- Pago contra entrega, crédito empresarial, conciliación y documentación fiscal.
- Alcance de publicación del expediente al paciente y acceso clínico histórico.

Estas decisiones no impiden preparar esquema, pruebas y semillas ficticias.
Sí impiden presentar esas configuraciones provisionales como aprobadas para atención real.
