import { TravelError, type RouteMetrics } from "./types.ts";
import { validateMetrics } from "./validation.ts";

export const travelTariff = {
  version: "demo-distance-traffic-v1",
  bands: [
    { throughMeters: 5000, cents: 0 },
    { throughMeters: 10000, cents: 300 },
    { throughMeters: 25000, cents: 500 },
  ],
  trafficCentsPerMinute: 10,
  maxTrafficCents: 500,
} as const;

export function distanceCharge(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new TravelError("INVALID_DISTANCE", "La distancia debe ser un número positivo o cero.");
  }
  const band = travelTariff.bands.find((item) => distanceMeters <= item.throughMeters);
  if (!band) {
    throw new TravelError("OUTSIDE_COVERAGE", "La ruta supera la cobertura de ejemplo de 25 km.");
  }
  return band.cents;
}

export function calculateTravelCost(route: RouteMetrics) {
  validateMetrics(route);
  const distanceCents = distanceCharge(route.distanceMeters);
  const delaySeconds = Math.max(0, route.durationSeconds - route.baselineSeconds!);
  // Prorate seconds, rounding once to cents; do not round distance before choosing the band.
  const trafficCents = Math.min(
    travelTariff.maxTrafficCents,
    Math.round((delaySeconds * travelTariff.trafficCentsPerMinute) / 60),
  );
  return {
    tariffVersion: travelTariff.version,
    distanceCents,
    trafficCents,
    travelCents: distanceCents + trafficCents,
    delaySeconds,
  };
}
