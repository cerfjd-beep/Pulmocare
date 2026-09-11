import { TravelError, type GeoPoint, type TravelInput, type RouteMetrics } from "./types.ts";

export function validatePoint(point: GeoPoint) {
  if (
    !point ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.latitude) > 90 ||
    Math.abs(point.longitude) > 180
  ) {
    throw new TravelError("INVALID_POINT", "Indica latitud y longitud válidas para ambos lugares.");
  }
}

export function validateTravelInput(input: TravelInput, now: Date) {
  validatePoint(input.origin);
  validatePoint(input.destination);
  if (
    typeof input.appointmentAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      input.appointmentAt,
    )
  ) {
    throw new TravelError("INVALID_DATE", "La fecha de atención debe incluir una zona horaria.");
  }
  localAppointmentToIso(input.appointmentAt.slice(0, 16));
  const date = new Date(input.appointmentAt);
  const delay = date.getTime() - now.getTime();
  if (!Number.isFinite(delay) || delay <= 0 || delay > 90 * 86400000) {
    throw new TravelError("INVALID_DATE", "Elige una fecha futura dentro de los próximos 90 días.");
  }
}

export function validateMetrics(route: RouteMetrics) {
  if (
    !Number.isFinite(route.distanceMeters) ||
    route.distanceMeters < 0 ||
    !Number.isFinite(route.durationSeconds) ||
    route.durationSeconds < 0 ||
    route.durationSeconds > 86400 ||
    (route.distanceMeters > 0 && route.durationSeconds === 0)
  ) {
    throw new TravelError("INVALID_ROUTE", "El proveedor devolvió una ruta incompleta.");
  }
  if (route.baselineSeconds === null) {
    throw new TravelError(
      "TRAFFIC_UNAVAILABLE",
      "No hay datos suficientes para cotizar el tráfico.",
    );
  }
  if (
    !Number.isFinite(route.baselineSeconds) ||
    route.baselineSeconds < 0 ||
    route.baselineSeconds > 86400 ||
    (route.distanceMeters > 0 && route.baselineSeconds === 0)
  ) {
    throw new TravelError("INVALID_ROUTE", "El tiempo de referencia de la ruta no es válido.");
  }
}

export function localAppointmentToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new TravelError("INVALID_DATE", "Selecciona fecha y hora de atención.");
  }
  // The form explicitly uses El Salvador time, regardless of the device's time zone.
  const date = new Date(value + ":00-06:00");
  if (
    !Number.isFinite(date.getTime()) ||
    new Date(date.getTime() - 6 * 3600000).toISOString().slice(0, 16) !== value
  ) {
    throw new TravelError("INVALID_DATE", "La fecha de atención no existe.");
  }
  return date.toISOString();
}
