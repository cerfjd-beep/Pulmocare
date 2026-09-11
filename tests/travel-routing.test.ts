import test from "node:test";
import assert from "node:assert/strict";
import { estimateTravel } from "../src/modules/travel/estimate.ts";
import { googleRoutes } from "../src/integrations/maps/google-routes.ts";
import { simulatedRoute } from "../src/modules/travel/simulation.ts";
import type { RouteProvider } from "../src/modules/travel/types.ts";

const now = new Date("2026-09-07T12:00:00Z");
const input = {
  origin: { latitude: 13.6929, longitude: -89.2182 },
  destination: { latitude: 13.7, longitude: -89.16 },
  appointmentAt: "2026-09-08T17:00:00Z",
};

test("calcula la salida desde la hora de visita y consulta el tráfico a esa salida", async () => {
  const calls: string[] = [];
  const provider: RouteProvider = async (origin, destination, departure) => {
    assert.deepEqual(origin, input.origin);
    assert.deepEqual(destination, input.destination);
    calls.push(departure);
    return { source: "google", distanceMeters: 8000, baselineSeconds: 1200, durationSeconds: 2100 };
  };
  const result = await estimateTravel(input, provider, now);
  assert.equal(calls.length, 2);
  assert.equal(result.departureAt, "2026-09-08T16:15:00.000Z");
  assert.equal(result.arrivalAt, "2026-09-08T16:50:00.000Z");
  assert.equal(calls.at(-1), result.departureAt);
  assert.equal(result.travelCents, 450);
  assert.equal(result.expiresAt, "2026-09-07T12:10:00.000Z");
});

test("no ofrece una salida pasada cuando ya no se puede llegar", async () => {
  await assert.rejects(
    estimateTravel(
      { ...input, appointmentAt: "2026-09-07T12:15:00Z" },
      async () => ({
        source: "google",
        distanceMeters: 8000,
        baselineSeconds: 1200,
        durationSeconds: 2100,
      }),
      now,
    ),
    { code: "TOO_SOON" },
  );
});

test("limita consultas y no cotiza rutas que no convergen", async () => {
  let calls = 0;
  await assert.rejects(
    estimateTravel(
      input,
      async () => ({
        source: "google",
        distanceMeters: 8000,
        baselineSeconds: 1200,
        durationSeconds: ++calls % 2 ? 2100 : 3600,
      }),
      now,
    ),
    { code: "UNSTABLE_ROUTE" },
  );
  assert.equal(calls, 4);
});

test("Google recibe origen, destino, salida y campos mínimos en el servidor", async () => {
  const fakeFetch: typeof fetch = async (url, options) => {
    assert.equal(url, "https://routes.googleapis.com/directions/v2:computeRoutes");
    const body = JSON.parse(options?.body as string);
    assert.equal(body.travelMode, "DRIVE");
    assert.equal(body.routingPreference, "TRAFFIC_AWARE_OPTIMAL");
    assert.equal(body.departureTime, input.appointmentAt);
    assert.equal(body.arrivalTime, undefined);
    assert.deepEqual(body.origin.location.latLng, input.origin);
    assert.deepEqual(body.destination.location.latLng, input.destination);
    assert.equal(options?.cache, "no-store");
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("X-Goog-Api-Key"), "test-only");
    assert.ok(headers.get("X-Goog-FieldMask")?.includes("fallbackInfo"));
    return Response.json({
      routes: [{ distanceMeters: 8000, duration: "2100s", staticDuration: "1200s" }],
    });
  };
  const provider = googleRoutes("test-only", fakeFetch);
  assert.deepEqual(await provider(input.origin, input.destination, input.appointmentAt), {
    source: "google",
    distanceMeters: 8000,
    durationSeconds: 2100,
    baselineSeconds: 1200,
  });
});

test("no usa rutas degradadas, errores de API ni tráfico faltante como ruta real", async () => {
  for (const payload of [
    null,
    { fallbackInfo: { routingMode: "FALLBACK_TRAFFIC_UNAWARE" }, routes: [{}] },
    { routes: [] },
    { routes: [{ distanceMeters: 8000, duration: "invalid", staticDuration: "1200s" }] },
    { routes: [{ distanceMeters: 8000, duration: "2100s" }] },
  ]) {
    const provider = googleRoutes("test-only", async () => Response.json(payload));
    await assert.rejects(estimateTravel(input, provider, now));
  }
  const unavailable = googleRoutes("test-only", async () => new Response("", { status: 429 }));
  await assert.rejects(estimateTravel(input, unavailable, now), { code: "ROUTE_UNAVAILABLE" });
  const timeout = googleRoutes("test-only", async () => {
    throw new Error("timeout");
  });
  await assert.rejects(estimateTravel(input, timeout, now), { code: "ROUTE_UNAVAILABLE" });
});

test("la simulación identifica su fuente y varía según la hora de salida", async () => {
  const morning = await simulatedRoute(input.origin, input.destination, "2026-09-08T13:00:00Z");
  const midday = await simulatedRoute(input.origin, input.destination, "2026-09-08T18:00:00Z");
  assert.equal(morning.source, "simulation");
  assert.equal(morning.distanceMeters, midday.distanceMeters);
  assert.ok(morning.durationSeconds > midday.durationSeconds);
});
