# Permisos, aislamiento y trazabilidad

La matriz describe acceso funcional, no concesiones SELECT globales.
Todo acceso no indicado se deniega. Aplicar RLS en cada tabla de aplicación desde
la migración que la crea, junto con GRANT/REVOKE explícitos.
Las interfaces diferenciadas no constituyen seguridad de datos.

## Matriz de acceso

| Área                            | Paciente/cuidador autorizado          | Administración operativa                            | Revisor/terapeuta                          | Finanzas                          |
| ------------------------------- | ------------------------------------- | --------------------------------------------------- | ------------------------------------------ | --------------------------------- |
| Catálogo publicado              | Lectura pública de campos comerciales | Lectura; edición con permiso de catálogo            | Lectura                                    | Lectura                           |
| Perfil y contacto               | Propios o vínculo con alcance         | Datos necesarios para coordinar                     | Asignados, mínimos necesarios              | Datos mínimos del pagador         |
| Roles y acceso                  | Sin autoasignación                    | Sin asignación por defecto                          | Sin asignación                             | Sin asignación                    |
| Solicitudes                     | Crear y consultar propias             | Estado, servicio, horario, dirección para coordinar | Asignadas según propósito                  | Referencias necesarias para venta |
| Síntomas, antecedentes, recetas | Cargar/consultar propios según flujo  | Sin acceso por defecto                              | Revisor asignado o tratamiento autorizado  | Sin acceso                        |
| Decisión clínica                | Resultado publicado propio            | Estado operativo derivado                           | Emitir solo con rol revisor y habilitación | Sin acceso                        |
| Agenda                          | Preferencias y citas propias          | Coordinar disponibilidad/asignación                 | Agenda propia; sin cambiar precio          | Estado de venta relacionado       |
| GPS del prestador               | Sin acceso por defecto                | Origen de visitas que coordina                      | Propio y visitas asignadas                 | Solo importes, sin coordenadas    |
| Cotizaciones                    | Consultar/aceptar propias vigentes    | Emitir mediante cálculo del servidor                | Lectura necesaria para coordinación        | Consultar ventas                  |
| Notas y signos                  | Solo publicación clínica autorizada   | Sin acceso por defecto                              | Encuentros asignados; firma/adendas        | Sin acceso                        |
| Pagos y DTE                     | Propios con alcance de pago           | Resumen de estado                                   | Sin datos bancarios                        | Conciliar, facturar y reembolsar  |
| Seguimiento                     | Responder propio                      | Estado de tarea                                     | Revisar respuestas asignadas               | Sin acceso                        |
| Auditoría                       | Sin acceso directo                    | Solo reporte operativo limitado                     | Sin acceso directo global                  | Solo reporte de su ámbito         |

access_admin administra asignaciones de rol mediante operación auditada, sin adquirir
automáticamente permiso para leer notas clínicas o cobros.
Una persona puede tener varios roles, concedidos explícitamente.
No existe un «administrador» genérico que omita todas las reglas.

## Reglas concretas de autorización

- Identificar a la persona con auth.uid(), vincularla por profiles.auth_user_id.
- Consultar role_assignments activas; no confiar en user_metadata editable por el usuario.
- Revocación efectiva en la siguiente operación, aunque el JWT aún tenga claims antiguos.
- Paciente propio: patients.profile_id corresponde al perfil autenticado y activo.
- Cuidador: vínculo no revocado, no vencido y con scope de la operación.
- Profesional: perfil activo, rol requerido, habilitación vigente y asignación no revocada.
- Separar lectura de listado de revisión (metadatos mínimos) de detalle clínico asignado.
- Aceptar patient_id, request_id o appointment_id no prueba que pertenezcan al solicitante.
- Políticas UPDATE con USING y WITH CHECK; impedir cambios de propietario/FK para eludir RLS.
- Evitar recursión de políticas en roles, profiles y vínculos con auxiliares mínimos.
- Indexar perfiles, vínculos y asignaciones usados en las comprobaciones.
- Usuario desactivado, vínculo revocado o profesional suspendido pierde acceso inmediatamente.
- El acceso histórico del profesional debe definirse por política explícita, no por haber
  atendido alguna vez al paciente.

## Rutas de lectura y escritura

El servidor de Next.js valida sesión y llama a funciones con JWT del usuario.
No usar la clave service_role para todas las consultas de pacientes: puede omitir RLS.
Reservar credenciales privilegiadas para workers y operaciones de mantenimiento acotadas.

Para datos clínicos auditables, denegar SELECT directo a anon/authenticated y exponer
funciones de lectura autorizadas que registren actor, finalidad, objeto y resultado.
Un trigger de escritura no registra lecturas SELECT.
Las funciones privilegiadas deben verificar autorización explícitamente; no asumir que
RLS aplica al propietario de la función. Exponer solamente los campos permitidos.

Preferir SECURITY INVOKER cuando los privilegios del llamador sean suficientes.
SECURITY DEFINER únicamente para operaciones acotadas que lo necesiten:
search_path vacío, nombres de esquema completos, propietario limitado, argumentos validados,
sin SQL dinámico construido con texto del cliente, EXECUTE revocado de PUBLIC y concedido
solo a roles requeridos. Probar intentos de escalamiento y acceso cruzado.
No permitir que el usuario elija qué rol interno ejecuta la función.

Vistas del panel administrativo: proyección explícita de columnas, sin SELECT * ni joins
que incorporen síntomas, recetas o notas. Si se usan vistas con lectura directa,
security_invoker=true y políticas/privilegios de las tablas base verificados.
Ninguna vista debe esquivar RLS por su propietario.

## Archivos

- Buckets privados; no URLs permanentes públicas para recetas o documentos.
- Autorizar carpeta y relación documental en INSERT y SELECT de storage.objects.
- La ruta usa identificadores opacos, sin nombres del paciente ni diagnósticos.
- UPDATE/DELETE de objetos clínicos firmados prohibidos al cliente.
- Expedir enlaces temporales solo tras comprobar permiso; duración corta configurable.
- Un enlace ya emitido puede seguir siendo válido hasta vencer: no prometer revocación instantánea.
- Denegar listado de documentos de otro paciente incluso si conoce el UUID.
- Eliminar objetos huérfanos mediante trabajo autorizado, no borrado indiscriminado.

## Auditoría y conservación

Guardar cambios de rol, consentimientos, revisiones, aceptación de precios, asignaciones,
firma/adendas, consulta clínica, conciliación y reembolsos.
Registrar nombres de campos cambiados y referencias; evitar copiar expedientes a logs.
El worker se identifica como actor del sistema y conserva correlation_id del evento.

La política de retención clínica, fiscal y de GPS debe definirse antes del piloto.
No fijar plazos legales por suposición. Borrar una cuenta no borra su expediente.
Probar restauración tanto de PostgreSQL como de los objetos de Storage; son respaldos
que requieren coordinación y verificación independientes.
