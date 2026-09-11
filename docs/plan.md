# Plan de implementación

## 1. Arquitectura y prototipo local

- [x] Documentación de módulos, permisos y estados.
- [x] Inicio adaptable y catálogo de seis servicios.
- [x] Recorrido de solicitud con validación básica y orientación de alarma.
- [x] Cotización por distancia simulada y preferencia de horario.
- [x] Solicitudes compartidas en memoria entre paciente y equipo.
- [x] Simulación de revisión, visita y seguimiento.
- [x] Formulario empresarial demostrativo.
- [ ] Validación del diseño con el responsable del proyecto.

## Despliegue inicial gratuito

- [x] Definir Render Free + Supabase Free y criterios de escalamiento.
- [ ] Validar compilación y ejecución en el servicio gratuito.
- [ ] Configurar base, autenticación y permisos con datos ficticios.
- [ ] Publicar la demo y medir consumo y reactivación después de inactividad.

Ver [despliegue gratuito](despliegue-gratuito.md). La operación real requiere completar
los controles y respaldos del piloto; no depende únicamente del número de usuarios.

## 2. MVP operativo

- Autenticación, pacientes/cuidadores, consentimiento y roles.
- Migraciones PostgreSQL, RLS y almacenamiento privado.
- Revisión de recetas y protocolo clínico aprobado.
- Agenda real con duración, traslados, cobertura y competencias.
- Expediente, auditoría y permisos probados con usuarios de distintos roles.
- Pruebas de reservas simultáneas y aislamiento de pacientes.

## 3. Integraciones

- Seleccionar mapas y definir coordenadas de la base operativa.
- Seleccionar proveedor de pagos disponible para la empresa en El Salvador.
- Webhooks verificados, pagos idempotentes, conciliación y reembolsos.
- Integración DTE con credenciales y documentación vigente.
- Correo, WhatsApp y SMS con plantillas y consentimiento por canal.
- Cola de trabajos, seguimiento a las 24 h y escalamiento de respuestas.
- Manifiesto, iconos e instalación PWA; caché limitada a recursos públicos.

## 4. Piloto y lanzamiento

- Aprobación clínica, alcance de servicios y cobertura.
- Revisión de privacidad, retención y condiciones comerciales.
- Certificaciones y afiliaciones verificadas antes de publicarlas.
- Restauración de copias, monitoreo, accesibilidad y pruebas con celulares.
- Piloto controlado y medición de tiempos, fallos y abandono del formulario.

## Preguntas que deben resolverse antes de producción

1. ¿Cuál es la base operativa y qué municipios se cubrirán?
2. ¿Quién aprueba los protocolos y revisa las solicitudes?
3. ¿Qué servicios requieren receta y cuáles tienen restricciones específicas?
4. ¿Qué empresa cobrará y emitirá documentos fiscales?
5. ¿Qué reglas regirán cancelaciones, reembolsos y crédito empresarial?
6. ¿Qué disponibilidad y habilitaciones tiene cada profesional?

Estas decisiones no bloquean el prototipo ficticio; sí condicionan la operación real.
