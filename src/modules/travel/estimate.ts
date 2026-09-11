import { calculateTravelCost } from "./pricing.ts";
import { validateTravelInput } from "./validation.ts";
import { TravelError, type RouteProvider, type TravelInput, type TravelEstimate } from "./types.ts";

const BUFFER_SECONDS = 600;
const MAX_REQUESTS = 4;
const TOLERANCE_SECONDS = 60;

export async function estimateTravel(
  input: TravelInput,
  provider: RouteProvider,
  now = new Date(),
): Promise<TravelEstimate> {
  validateTravelInput(input, now);
  const target = new Date(input.appointmentAt).getTime() - BUFFER_SECONDS * 1000;
  const earliestDeparture = now.getTime() + 60000;
  let departure = earliestDeparture;
  for (let attempt = 0; attempt < MAX_REQUESTS; attempt++) {
    const departureAt = new Date(departure).toISOString();
    const route = await provider(input.origin, input.destination, departureAt);
    const costs = calculateTravelCost(route);
    const arrival = departure + route.durationSeconds * 1000;
    // Return only metrics queried at the exact departure included in the quote.
    const earlySeconds = (target - arrival) / 1000;
    if (earlySeconds >= 0 && earlySeconds <= TOLERANCE_SECONDS) {
      return {
        ...route,
        ...costs,
        appointmentAt: new Date(input.appointmentAt).toISOString(),
        departureAt,
        arrivalAt: new Date(arrival).toISOString(),
        calculatedAt: now.toISOString(),
        expiresAt: new Date(Math.min(now.getTime() + 10 * 60000, departure)).toISOString(),
        bufferMinutes: BUFFER_SECONDS / 60,
      };
    }
    departure = Math.floor((target - route.durationSeconds * 1000) / 1000) * 1000;
    if (departure < earliestDeparture) {
      throw new TravelError(
        "TOO_SOON",
        "No hay tiempo suficiente para llegar. Elige una hora posterior.",
      );
    }
  }
  throw new TravelError(
    "UNSTABLE_ROUTE",
    "El tiempo de ruta cambió entre consultas. Recalcula o solicita coordinación manual.",
  );
}
