import { TravelError, type RouteProvider, type GeoPoint } from "../../modules/travel/types.ts";
import { validatePoint } from "../../modules/travel/validation.ts";

function seconds(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,9})?s$/.test(value)) return null;
  const result = Number(value.slice(0, -1));
  return Number.isFinite(result) ? result : null;
}

const waypoint = (point: GeoPoint) => ({ location: { latLng: point } });

// This module is consumed only by the protected server endpoint. Never expose the key to React.
export function googleRoutes(apiKey: string, fetcher: typeof fetch = fetch): RouteProvider {
  return async (origin, destination, departureAt) => {
    validatePoint(origin);
    validatePoint(destination);
    let response: Response;
    try {
      response = await fetcher("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.staticDuration,fallbackInfo",
        },
        body: JSON.stringify({
          origin: waypoint(origin),
          destination: waypoint(destination),
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          trafficModel: "BEST_GUESS",
          departureTime: departureAt,
          computeAlternativeRoutes: false,
          units: "METRIC",
          languageCode: "es",
        }),
      });
    } catch {
      throw new TravelError(
        "ROUTE_UNAVAILABLE",
        "No pudimos consultar la ruta. Intenta nuevamente.",
      );
    }
    if (!response.ok) {
      throw new TravelError(
        "ROUTE_UNAVAILABLE",
        "El proveedor de rutas no está disponible. Revisa su configuración o intenta después.",
      );
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new TravelError("INVALID_ROUTE", "El proveedor devolvió una respuesta inválida.");
    }
    if (!payload || typeof payload !== "object") {
      throw new TravelError("INVALID_ROUTE", "La respuesta del proveedor no es válida.");
    }
    if (payload.fallbackInfo) {
      throw new TravelError(
        "TRAFFIC_UNAVAILABLE",
        "El proveedor no pudo usar el tráfico solicitado. No se calculó un recargo.",
      );
    }
    const route = payload.routes?.[0];
    if (!route) throw new TravelError("NO_ROUTE", "No se encontró una ruta por carretera.");
    const durationSeconds = seconds(route.duration);
    if (durationSeconds === null || typeof route.distanceMeters !== "number") {
      throw new TravelError("INVALID_ROUTE", "La ruta no contiene distancia y tiempo válidos.");
    }
    return {
      distanceMeters: route.distanceMeters,
      durationSeconds,
      baselineSeconds: seconds(route.staticDuration),
      source: "google",
    };
  };
}
