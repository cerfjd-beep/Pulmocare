import test from "node:test";
import assert from "node:assert/strict";
import { calculateTravelCost, distanceCharge } from "../src/modules/travel/pricing.ts";
import { localAppointmentToIso, validateTravelInput } from "../src/modules/travel/validation.ts";
import type { RouteMetrics } from "../src/modules/travel/types.ts";

const route: RouteMetrics = {
  source: "google",
  distanceMeters: 8000,
  baselineSeconds: 1200,
  durationSeconds: 2100,
};

test("8 km y 15 minutos adicionales cuestan $3 + $1.50", () => {
  const cost = calculateTravelCost(route);
  assert.equal(cost.distanceCents, 300);
  assert.equal(cost.trafficCents, 150);
  assert.equal(cost.travelCents, 450);
});

test("los tramos usan metros sin redondear hacia una tarifa inferior", () => {
  for (const [meters, cents] of [
    [0, 0],
    [5000, 0],
    [5000.1, 300],
    [10000, 300],
    [10000.1, 500],
    [25000, 500],
  ])
    assert.equal(distanceCharge(meters), cents);
  for (const invalid of [-1, NaN, Infinity, 25000.1]) assert.throws(() => distanceCharge(invalid));
});

test("no cobra tiempo base ni descuenta con tráfico más rápido", () => {
  for (const durationSeconds of [1200, 900]) {
    const result = calculateTravelCost({ ...route, durationSeconds });
    assert.equal(result.trafficCents, 0);
    assert.equal(result.travelCents, 300);
  }
});

test("prorratea segundos y aplica el tope de tráfico", () => {
  assert.equal(calculateTravelCost({ ...route, durationSeconds: 1209 }).trafficCents, 2);
  assert.equal(calculateTravelCost({ ...route, durationSeconds: 6000 }).trafficCents, 500);
});

test("el tráfico desconocido y las métricas inválidas nunca se cobran como cero", () => {
  for (const patch of [
    { baselineSeconds: null },
    { durationSeconds: NaN },
    { baselineSeconds: -1 },
    { durationSeconds: 0 },
    { baselineSeconds: 0 },
    { durationSeconds: Infinity },
  ])
    assert.throws(() => calculateTravelCost({ ...route, ...patch }));
});

test("la fecha local se interpreta siempre en El Salvador", () => {
  assert.equal(localAppointmentToIso("2026-09-08T08:00"), "2026-09-08T14:00:00.000Z");
  for (const invalid of ["", "2026-02-30T08:00", "2026-09-08", "2026-09-08T25:00"]) {
    assert.throws(() => localAppointmentToIso(invalid));
  }
});

test("rechaza puntos, fechas pasadas y fechas sin zona horaria", () => {
  const input = {
    origin: { latitude: 13.7, longitude: -89.2 },
    destination: { latitude: 13.8, longitude: -89.1 },
    appointmentAt: "2026-09-08T14:00:00Z",
  };
  const now = new Date("2026-09-07T14:00:00Z");
  assert.doesNotThrow(() => validateTravelInput(input, now));
  for (const patch of [
    { origin: { latitude: 91, longitude: 0 } },
    { destination: { latitude: NaN, longitude: 0 } },
    { destination: { latitude: 0, longitude: -181 } },
    { appointmentAt: "2026-09-06T14:00:00Z" },
    { appointmentAt: "2026-09-08T14:00:00" },
    { appointmentAt: "2026-02-30T14:00:00Z" },
    { appointmentAt: "2027-09-08T14:00:00Z" },
  ])
    assert.throws(() => validateTravelInput({ ...input, ...patch }, now));
});
