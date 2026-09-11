export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface TravelInput {
  origin: GeoPoint;
  destination: GeoPoint;
  appointmentAt: string;
}

export interface RouteMetrics {
  distanceMeters: number;
  durationSeconds: number;
  baselineSeconds: number | null;
  source: "google" | "simulation";
}

export type RouteProvider = (
  origin: GeoPoint,
  destination: GeoPoint,
  departureAt: string,
) => Promise<RouteMetrics>;

export interface TravelEstimate extends RouteMetrics {
  appointmentAt: string;
  departureAt: string;
  arrivalAt: string;
  calculatedAt: string;
  expiresAt: string;
  bufferMinutes: number;
  tariffVersion: string;
  distanceCents: number;
  trafficCents: number;
  travelCents: number;
  delaySeconds: number;
}

export class TravelError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "TravelError";
    this.code = code;
  }
}
