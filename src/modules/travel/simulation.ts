import type { RouteProvider } from "./types.ts";
import { validatePoint } from "./validation.ts";

// Synthetic route for UI exploration. Never a fallback for missing live route/traffic data.
export const simulatedRoute: RouteProvider = async (origin, destination, departureAt) => {
  validatePoint(origin);
  validatePoint(destination);
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = radians(destination.latitude - origin.latitude);
  const deltaLng = radians(destination.longitude - origin.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(destination.latitude)) *
      Math.sin(deltaLng / 2) ** 2;
  const directMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const distanceMeters = Math.round(directMeters * 1.3);
  const baselineSeconds = Math.ceil(distanceMeters / (30000 / 3600));
  const localHour = (new Date(departureAt).getUTCHours() + 18) % 24;
  const rushHour = (localHour >= 6 && localHour < 9) || (localHour >= 16 && localHour < 19);
  return {
    distanceMeters,
    baselineSeconds,
    durationSeconds: Math.ceil(baselineSeconds * (rushHour ? 1.65 : 1.15)),
    source: "simulation",
  };
};
