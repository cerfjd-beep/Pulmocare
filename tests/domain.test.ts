import test from "node:test";
import assert from "node:assert/strict";
import { quote } from "../src/modules/services/catalog.ts";
import {
  hasAlarm,
  initialIntake,
  needsPriorReview,
  validateStep,
} from "../src/modules/intake/model.ts";

test("cotización: límites de distancia y cobertura", () => {
  for (const [distance, travel] of [
    [0, 0],
    [5, 0],
    [5.1, 300],
    [10, 300],
    [10.1, 500],
    [25, 500],
  ]) {
    assert.deepEqual(quote(1500, distance), { service: 1500, travel, total: 1500 + travel });
  }
  for (const distance of [-1, 25.1, NaN, Infinity]) {
    assert.throws(() => quote(1500, distance));
  }
});

test("una receta no omite la señal de alarma", () => {
  const data = { ...initialIntake, prescription: "Sí", fileName: "demo.pdf", alarm: "Sí" };
  assert.equal(hasAlarm(data), true);
  for (let step = 0; step < 4; step++) assert.ok(validateStep(step, data));
});

test("dolor torácico en cuestionario también detiene el recorrido", () => {
  assert.equal(hasAlarm({ ...initialIntake, alarm: "No", symptoms: ["Dolor torácico"] }), true);
});

test("respuestas incompletas no permiten continuar", () => {
  assert.ok(validateStep(0, initialIntake));
  const data = { ...initialIntake, alarm: "No", reason: "Asma", prescription: "No" };
  assert.ok(validateStep(0, data));
  assert.equal(validateStep(0, { ...data, noSymptoms: true, noHistory: true }), null);
});

test("sin receta y casos especializados requieren valoración previa", () => {
  assert.equal(needsPriorReview({ ...initialIntake, prescription: "No" }), true);
  assert.equal(
    needsPriorReview({ ...initialIntake, prescription: "Sí", reason: "Traqueostomía" }),
    true,
  );
  assert.equal(needsPriorReview({ ...initialIntake, prescription: "Sí", reason: "Asma" }), false);
});

test("datos de ubicación y horario son obligatorios", () => {
  assert.ok(validateStep(1, initialIntake));
  assert.ok(validateStep(2, initialIntake));
  const data = {
    ...initialIntake,
    patient: "Prueba",
    consent: true,
    municipality: "Ejemplo",
    address: "Dirección ficticia",
    slot: "Horario ficticio",
  };
  assert.equal(validateStep(1, data), null);
  assert.equal(validateStep(2, data), null);
});
