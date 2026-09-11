# Cálculo del costo de traslado

Implementado en src/modules/travel. Calculadora disponible en /equipo/traslado.
Este módulo calcula el recargo de ida; no confirma citas ni realiza cargos.

## Datos de entrada

1. Coordenadas del paciente: destino del servicio.
2. Coordenadas de salida del prestador: origen real o previsto para esa visita.
3. Fecha y hora de inicio de atención, mostradas en America/El_Salvador.
4. Tráfico estimado consultado al proveedor para la hora de salida calculada.

El botón GPS utiliza únicamente el dispositivo actual y pide permiso al navegador.
No obtiene remotamente la ubicación del paciente ni la del prestador.
Ambos pueden ingresar coordenadas manualmente. La posición actual del prestador no
necesariamente será su origen en una visita futura.

## Fórmula y valores provisionales

Recargo = cargo por distancia de ruta + cargo por demora adicional.
Total mostrado = precio del servicio + recargo.

Distancia por carretera, sin redondear antes de elegir el tramo:

| Distancia de ida        | Cargo                            |
| ----------------------- | -------------------------------- |
| 0 a 5 km                | $0                               |
| Más de 5 y hasta 10 km  | $3                               |
| Más de 10 y hasta 25 km | $5                               |
| Más de 25 km            | Revisión de cobertura; no cotiza |

Demora adicional = máximo(0, tiempo con tráfico − tiempo de referencia).
Cargo por tráfico = mínimo($5, demora en segundos × $0.10 / 60).
Redondeo único a centavos. No se cobra el tiempo base dos veces.

Ejemplo: 8 km, referencia de 20 min y viaje previsto de 35 min:
$3 por distancia + $1.50 por tráfico = $4.50 de recargo.
Evaluación de $25 + traslado de $4.50 = $29.50.

Los $0.10/min, el tope de $5 y la cobertura de 25 km son parámetros de demostración.
No se han aprobado como política comercial. Se configuran en pricing.ts.
No incluye regreso, peajes ni un cargo adicional por horario nocturno.
La hora afecta la previsión de tráfico; no añade otra tarifa horaria.

## Planificación de llegada

Google Routes para conducción utiliza departureTime; arrivalTime no aplica a DRIVE.
Se calcula primero una duración de referencia de consulta y se ajusta la salida:

salida = inicio de atención − margen de 10 min − duración prevista del viaje.

Se vuelve a consultar la ruta en la salida propuesta. Máximo cuatro llamadas,
con ocho segundos de timeout por llamada. Se acepta una llegada hasta un minuto
antes del margen objetivo. Las métricas devueltas corresponden a la misma salida
que se muestra. Si no converge, no hay cotización automática.

Se rechazan fechas pasadas, salidas imposibles y rutas fuera de cobertura.
La estimación vence a los diez minutos o a la salida propuesta, lo que ocurra antes.
Cambiar ubicaciones, fecha, servicio o modo invalida el resultado en pantalla.
Las respuestas atrasadas de una consulta no reemplazan datos nuevos.

## Modo de prueba

Funciona sin cuentas externas. Distancia sintética = distancia geodésica × 1.3.
Velocidad base ficticia: 30 km/h.
Multiplicador de tiempo ficticio: 1.65 de 6–9 y 16–19 h; 1.15 en otras horas.
No modela carreteras, fines de semana, cierres, clima ni congestión real.
No usar estos resultados para cobrar. Nunca se activa como fallback de Google.

## Consulta real

Adaptador: src/integrations/maps/google-routes.ts.
Endpoint: POST /api/travel-quote.

Configurar en .env.local, sin compartir secretos en el chat:

- GOOGLE_MAPS_API_KEY: clave de servidor con Routes API y facturación habilitadas.
- TRAVEL_QUOTE_ACCESS_TOKEN: código privado aleatorio de al menos 32 caracteres.

Reiniciar el servidor. Se habilitará Google Maps en la calculadora.
El operador introduce el código de acceso; la clave de Google nunca llega al navegador.
Solo se envían coordenadas y salida al proveedor, sin nombres ni diagnósticos.
El usuario debe seleccionar el modo real y calcular para hacer la consulta externa.

Se solicita DRIVE, TRAFFIC_AWARE_OPTIMAL y BEST_GUESS.
Campos mínimos: distanceMeters, duration, staticDuration y fallbackInfo.
El tiempo de referencia staticDuration es la base entregada por Google para esa ruta;
no debe interpretarse como una medición física universal de circulación libre.

Datos ausentes, rutas degradadas, timeout y fallos del proveedor devuelven un error;
nunca se convierten en traslado gratis. Tráfico futuro es una predicción.
No se realizaron llamadas reales durante el desarrollo; el adaptador se probó con respuestas controladas.

## Límites de operación actuales

El acceso por código privado y el límite local de 30 cálculos por hora protegen el piloto.
Cada cálculo puede hacer hasta cuatro consultas al proveedor.
El contador vive en memoria: no es compartido entre instancias y se reinicia con el servidor.
Antes de publicar: sesiones y roles profesionales, límite distribuido y cuotas en Google Cloud.

La calculadora pertenece al equipo y no sustituye aún la cotización de una cita confirmada.
El formulario inicial mantiene su estimación por distancia, ahora reutilizando los mismos tramos.
Para vincular a citas reales: obtener el origen del profesional asignado desde el servidor,
guardar una cotización con ID, versión de tarifa, desglose y vigencia, y validar al confirmar.
No confiar en coordenadas del prestador ni importes suministrados por el paciente.
Una vez aceptado el precio, no cambiar el cobro silenciosamente por variaciones del tráfico.

## Referencias oficiales

- [Compute Routes](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes)
- [Tráfico y hora de salida](https://developers.google.com/maps/documentation/routes/config_trade_offs)
- [Cobertura](https://developers.google.com/maps/documentation/routes/coverage)
